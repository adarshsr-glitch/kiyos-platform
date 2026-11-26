"""Residency, travel facts, expert case brief and expert actions, plus prototype journey resets.

Everything a screen shows here is either a recorded fact (with its source) or a
calculation from facts through the rules engine. Expert actions change real records.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from engine.rules import load_rule
from infra import personas
from infra.schema import (
    ActionItem,
    Assessment,
    Case,
    CaseEvent,
    CaseNote,
    Conversation,
    Document,
    DocumentRequest,
    Fact,
    HouseholdMember,
    Message,
    ProfileChange,
    Stay,
    Ticket,
)
from services import residency
import evidence
import samples
import hashlib

router = APIRouter()

FACT_LABELS = {
    "left_india_on": "Moved abroad",
    "us_arrived_on": "Arrived in the US",
    "us_departed_on": "Left the US",
    "india_return_date": "Return to India",
    "green_card_from": "Green card from",
    "green_card_until": "Green card surrendered",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _case(session: AsyncSession, case_id: int) -> Case:
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


async def _rows(session: AsyncSession, model, case_id: int):
    return (await session.execute(select(model).where(model.case_id == case_id))).scalars().all()


async def _conversation(session: AsyncSession, case_id: int) -> Conversation | None:
    convos = (await session.execute(select(Conversation).where(Conversation.case_id == case_id))).scalars().all()
    staged = [c for c in convos if c.stage] or list(convos)
    return max(staged, key=lambda c: c.id) if staged else None


async def _say(session: AsyncSession, case_id: int, text: str, action: dict | None = None, author: str = "Kiyos") -> None:
    convo = await _conversation(session, case_id)
    if convo:
        session.add(Message(conversation_id=convo.id, role="assistant", content=text, author=author,
                            action=action, confidence=1.0, created_at=_now()))


def _event(session, case_id: int, actor: str, action: str, detail: dict | None = None) -> None:
    session.add(CaseEvent(case_id=case_id, actor=actor, action=action, target_type="case", target_id=case_id,
                          detail=detail, created_at=_now()))


def _holdings(facts: list[Fact]) -> list[dict[str, Any]]:
    out = []
    for f in facts:
        if f.key.startswith("holding:"):
            h = json.loads(f.value)
            h["source"] = f.source
            out.append(h)
    return out


async def _calc(session: AsyncSession, case_id: int) -> dict[str, Any]:
    facts = await _rows(session, Fact, case_id)
    stays = await _rows(session, Stay, case_id)
    return residency.calculate(personas.facts_of(facts), personas.stays_of(stays))


# ─────────────────────────────────────────────────────────── residency and facts

class StayOut(BaseModel):
    id: int
    country: str
    arrived: str
    departed: Optional[str]
    source: str
    evidence: Optional[dict[str, Any]] = None


class ResidencyOut(BaseModel):
    india: list[dict[str, Any]]
    us: list[dict[str, Any]]
    assumptions: list[str]
    rules_pending_validation: bool
    stays: list[StayOut]
    facts: list[dict[str, Any]]
    pending_changes: list[dict[str, Any]]
    reviewed: dict[str, Any]


@router.get("/cases/{case_id}/residency", response_model=ResidencyOut)
async def get_residency(case_id: int, session: AsyncSession = Depends(get_session)):
    """Each year's status, calculated from recorded stays and facts. Takes no inputs."""
    case = await _case(session, case_id)
    facts = await _rows(session, Fact, case_id)
    stays = await _rows(session, Stay, case_id)
    calc = residency.calculate(personas.facts_of(facts), personas.stays_of(stays))
    changes = (await session.execute(select(ProfileChange).where(
        ProfileChange.case_id == case_id, ProfileChange.status == "proposed", ProfileChange.fact_key.in_(list(FACT_LABELS))
    ))).scalars().all()
    confirmed = (await session.execute(select(ProfileChange).where(
        ProfileChange.case_id == case_id, ProfileChange.status == "confirmed", ProfileChange.fact_key.in_(list(FACT_LABELS))
    ))).scalars().all()
    last_change = max((c.decided_at.date().isoformat() for c in confirmed if c.decided_at), default=None)
    reviewed = {}
    for code, cs in (case.country_status or {}).items():
        if cs.get("reviewed_by"):
            on = cs.get("reviewed_on")
            # A review covers the facts as they were. A later confirmed change reopens it.
            stale = bool(last_change and (not on or last_change >= on))
            reviewed[code] = {"by": cs["reviewed_by"], "on": on, "stale": stale}
    return ResidencyOut(
        **calc,
        stays=[StayOut(id=s.id, country=s.country, arrived=s.arrived, departed=s.departed, source=s.source, evidence=s.evidence) for s in sorted(stays, key=lambda s: s.arrived)],
        facts=[{"key": f.key, "label": FACT_LABELS[f.key], "value": f.value, "source": f.source, "evidence": f.evidence} for f in facts if f.key in FACT_LABELS],
        pending_changes=[{"id": c.id, "fact_key": c.fact_key, "label": FACT_LABELS.get(c.fact_key, c.fact_key),
                          "from": c.previous_value, "to": c.proposed_value} for c in changes],
        reviewed=reviewed,
    )


@router.get("/cases/{case_id}/holdings")
async def get_holdings(case_id: int, session: AsyncSession = Depends(get_session)):
    await _case(session, case_id)
    return _holdings(await _rows(session, Fact, case_id))


class TripIn(BaseModel):
    arrived: date
    departed: Optional[date] = None


class HoldingIn(BaseModel):
    id: str
    country: Literal["IN", "US"]
    kind: Literal["income", "asset"]
    label: str
    currency: Literal["INR", "USD"]
    band: str


class OnboardingIn(BaseModel):
    left_india_on: date
    us_arrived_on: Optional[date] = None
    india_return_date: Optional[date] = None
    green_card_from: Optional[date] = None
    household: Literal["individual", "couple"] = "individual"
    trips: list[TripIn] = []
    holdings: list[HoldingIn] = []


@router.post("/cases/{case_id}/onboarding")
async def save_onboarding(case_id: int, body: OnboardingIn, session: AsyncSession = Depends(get_session)):
    """Saves the customer's travel and money facts, then calculates and reports what was done."""
    case = await _case(session, case_id)
    if case.plan == "premium" and case.activated_at:
        raise HTTPException(status_code=409, detail="Your record is already set up. Changes go through your profile so your expert can check them.")
    for t in body.trips:
        if t.departed and t.departed < t.arrived:
            raise HTTPException(status_code=422, detail="A trip ends before it starts")
    existing = {f.key: f for f in await _rows(session, Fact, case_id)}
    values = {"left_india_on": body.left_india_on, "us_arrived_on": body.us_arrived_on,
              "india_return_date": body.india_return_date, "green_card_from": body.green_card_from}
    for key, value in values.items():
        if value is None:
            continue
        told = evidence.answer(FACT_LABELS.get(key, key), value.strftime("%d %b %Y"), _now().isoformat(), "Onboarding")
        if key in existing:
            existing[key].value, existing[key].source, existing[key].evidence = value.isoformat(), "Onboarding answer", told
        else:
            session.add(Fact(case_id=case_id, key=key, value=value.isoformat(), source="Onboarding answer", as_of=date.today().isoformat(), evidence=told))
    for s in await _rows(session, Stay, case_id):
        if s.source == "Onboarding answer":
            await session.delete(s)
    for t in body.trips:
        session.add(Stay(case_id=case_id, country="IN", arrived=t.arrived.isoformat(),
                         departed=t.departed.isoformat() if t.departed else None, source="Onboarding answer",
                         evidence=evidence.answer("Your trips to India", f"{t.arrived:%d %b %Y} to {t.departed:%d %b %Y}" if t.departed else f"From {t.arrived:%d %b %Y}", _now().isoformat(), "Onboarding")))
    # Only replace what onboarding itself recorded: holdings read from documents,
    # entered by an expert or added as illustrative data are kept.
    for key, f in existing.items():
        if key.startswith("holding:") and f.source == "Onboarding answer":
            await session.delete(f)
    for h in body.holdings:
        session.add(Fact(case_id=case_id, key=f"holding:{h.id}", value=h.model_dump_json(), source="Onboarding answer",
                         evidence=evidence.answer(f"{h.label}: roughly how much?", h.band, _now().isoformat(), "Onboarding")))
    await session.flush()
    calc = await _calc(session, case_id)
    _event(session, case_id, case.client_name, "onboarding.completed",
           {"trips": len(body.trips), "holdings": len(body.holdings)})
    await session.commit()
    rules = sorted({t["rule_id"] for y in calc["india"] + calc["us"] for t in y["tests"]})
    return {
        "steps": [
            {"label": "Saved your travel", "detail": f"{len(body.trips)} trip{'s' if len(body.trips) != 1 else ''} to India, plus the dates you moved."},
            {"label": "Counted days in each country", "detail": ", ".join(f"{y['year']}: {y['days']} days in India" for y in calc["india"])},
            {"label": "Applied residency rules", "detail": f"{len(rules)} rules: " + ", ".join(rules)},
            {"label": "Saved your money by country", "detail": f"{sum(1 for h in body.holdings if h.country == 'IN')} in India, {sum(1 for h in body.holdings if h.country == 'US')} in the US, as ranges."},
        ],
        "residency": {"india": [{"year": y["year"], "status": y["status"]} for y in calc["india"]],
                      "us": [{"year": y["year"], "status": y["status"]} for y in calc["us"]]},
    }


# ─────────────────────────────────────────────────────────── expert case brief

DOC_FOR = {
    "us-salary": ("W-2 for 2025", "W-2", "US", "Confirms your US salary and the tax withheld."),
    "in-nro": ("NRO account statements (Apr 2025 – Mar 2026)", "bank_statement", "IN", "Confirms interest earned and peak balances for foreign-account reporting."),
    "in-flat": ("Property ownership document for the Hyderabad flat", "property_document", "IN", "Confirms ownership and purchase date for any future sale."),
    "in-interest": ("NRO interest certificate", "interest_certificate", "IN", "Confirms the interest taxed in India and TDS deducted."),
}


def _rule_effect(days: int) -> str:
    rule = load_rule("IN-RES-182")
    met = rule.evaluate_bool({"days_in_india": days}) if rule else days >= 182
    return f"{days} days: 182-day test {'met' if met else 'not met'}"


@router.get("/cases/{case_id}/brief")
async def get_brief(case_id: int, session: AsyncSession = Depends(get_session)):
    """What the agent has prepared for the expert: verified facts, discrepancies, gaps and drafts."""
    case = await _case(session, case_id)
    facts = await _rows(session, Fact, case_id)
    stays = await _rows(session, Stay, case_id)
    docs = {d.id: d for d in await _rows(session, Document, case_id)}
    members = await _rows(session, HouseholdMember, case_id)
    requests = await _rows(session, DocumentRequest, case_id)
    calc = residency.calculate(personas.facts_of(facts), personas.stays_of(stays))

    discrepancies = []
    doc_stays = [s for s in stays if s.document_id]
    for f in facts:
        if not f.key.startswith("stated_days_in_india:"):
            continue
        fy_label = f.key.split(":", 1)[1]
        year = next((y for y in calc["india"] if y["year"] == fy_label), None)
        if not year or not doc_stays:
            continue
        stated, counted = int(f.value), year["days"]
        if abs(stated - counted) > 5:
            doc = docs.get(doc_stays[0].document_id)
            discrepancies.append({
                "id": f"days-{fy_label}",
                "title": f"Days in India, {fy_label}",
                "stated": stated, "stated_source": f.source,
                "found": counted, "found_source": doc.filename if doc else "Passport",
                "document_id": doc.id if doc else None,
                "entries": (doc.extracted_json or {}).get("entries") if doc else None,
                "effect": f"Stated {_rule_effect(stated)}. From the passport, {_rule_effect(counted)}: status would be {year['status']}.",
            })
    for d in docs.values():
        meta = d.extracted_json or {}
        if meta.get("mismatch"):
            discrepancies.append({"id": f"doc-{d.id}", "title": meta["mismatch"]["title"], "stated": meta["mismatch"]["stated"],
                                  "stated_source": "Onboarding answer", "found": meta["mismatch"]["found"], "found_source": d.filename,
                                  "document_id": d.id, "entries": None, "effect": meta["mismatch"]["effect"]})

    requested_types = {r.doc_type for r in requests}
    gaps, suggestions = [], []
    for h in _holdings(facts):
        if h.get("source") == "Onboarding answer":
            gaps.append({"label": f"{h['label']} ({h['band']}) is not backed by a document", "why": "Told to us in onboarding; needs evidence before sign-off."})
            if h["id"] in DOC_FOR and DOC_FOR[h["id"]][1] not in requested_types:
                title, dtype, country, why = DOC_FOR[h["id"]]
                suggestions.append({"title": title, "doc_type": dtype, "country": country, "why": why})
    if stays and not any(s.document_id for s in stays):
        gaps.append({"label": "Travel days are self-reported", "why": "Residency is calculated from them; passport pages would confirm."})
        if "passport" not in requested_types:
            suggestions.append({"title": "Passport pages showing travel since 2022", "doc_type": "passport", "country": "IN",
                                "why": "Your days in India each year decide your residential status."})
    for m in members:
        if m.role == "spouse" and not m.visa_status:
            gaps.append({"label": f"{m.name}'s US status is unknown", "why": "Decides whether a joint US return is possible."})

    clarifications = [a for a in await _rows(session, ActionItem, case_id) if a.notes == "clarification" and a.status == "open"]
    tickets = [t for t in await _rows(session, Ticket, case_id) if t.status == "open"]
    changes = [c for c in await _rows(session, ProfileChange, case_id) if c.status == "proposed"]
    notes = sorted(await _rows(session, CaseNote, case_id), key=lambda n: n.created_at, reverse=True)
    assessment = next(iter(sorted([a for a in await _rows(session, Assessment, case_id)], key=lambda a: a.id, reverse=True)), None)
    blockers = [f"Waiting on {case.client_name.split()[0]}: {c.title}" for c in clarifications]
    return {
        "case_id": case.id, "client_name": case.client_name, "review_status": case.review_status or "in_review",
        "residency": {"india": calc["india"], "us": calc["us"], "assumptions": calc["assumptions"],
                      "rules_pending_validation": calc["rules_pending_validation"]},
        "facts": [{"label": FACT_LABELS[f.key], "value": f.value, "source": f.source} for f in facts if f.key in FACT_LABELS],
        "holdings": _holdings(facts),
        "stays": [{"arrived": s.arrived, "departed": s.departed, "source": s.source} for s in sorted(stays, key=lambda s: s.arrived)],
        "documents": [{"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "status": d.status,
                       "extracted": (d.extracted_json or {}).get("fields")} for d in docs.values()],
        "discrepancies": discrepancies,
        "gaps": gaps,
        "suggested_requests": suggestions,
        "requests": [{"id": r.id, "title": r.title, "status": r.status, "due_date": r.due_date} for r in requests],
        "clarifications": [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in clarifications],
        "drafts": [{"title": f"Customer question: {t.question}", "draft": t.draft_answer, "rules": t.cited_rules, "where": "Tickets tab"} for t in tickets]
                  + [{"title": f"Reply about {d.filename}", "draft": d.extracted_json["mismatch"]["draft"], "rules": d.extracted_json["mismatch"].get("rules"), "where": "WhatsApp, as you"}
                     for d in docs.values() if (d.extracted_json or {}).get("mismatch", {}) and d.extracted_json["mismatch"].get("draft")],
        "proposed_changes": [{"id": c.id, "label": FACT_LABELS.get(c.fact_key, c.fact_key), "from": c.previous_value, "to": c.proposed_value, "quote": c.quote} for c in changes],
        "notes": [{"id": n.id, "author": n.author, "body": n.body, "created_at": n.created_at.isoformat()} for n in notes],
        "assessment": {"id": assessment.id, "headline": assessment.headline, "status": assessment.status} if assessment else None,
        "deadlines": _deadlines(case, requests, clarifications, [a for a in await _rows(session, ActionItem, case_id) if a.assignee == "advisor" and a.status == "open"]),
        "evidence": _evidence(_holdings(facts), stays, requests, list(docs.values())),
        "can_sign_off": not clarifications,
        "blockers": blockers,
    }


def _deadlines(case: Case, requests, clarifications, tasks=()) -> list[dict[str, Any]]:
    out = [{"date": t.due_date, "label": t.title, "kind": "review"} for t in tasks if t.due_date]
    for code, cs in (case.country_status or {}).items():
        if cs.get("due"):
            out.append({"date": cs["due"], "label": f"{'India' if code == 'IN' else 'US'} return ({cs.get('filing', 'return')})", "kind": "filing"})
    for r in requests:
        if r.due_date and r.status in ("pending", "rejected"):
            out.append({"date": r.due_date, "label": r.title, "kind": "document"})
    for c in clarifications:
        if getattr(c, "due_date", None):
            out.append({"date": c.due_date, "label": "Customer clarification", "kind": "review"})
    return sorted(out, key=lambda d: d["date"])


EVIDENCE_DOC = {"us-salary": "W-2", "us-brokerage": "brokerage_statement", "us-401k": "401k_statement", "in-nro": "bank_statement",
                "in-bank": "bank_statement", "in-interest": "interest_certificate", "in-salary": "form_16", "in-flat": "property_document",
                "in-property": "property_document", "in-rent": "rental_agreement", "in-mf": "mf_cas", "us-rsu": "brokerage_statement"}


def _evidence(holdings, stays, requests, docs) -> list[dict[str, Any]]:
    """Per fact that needs evidence: told us → requested → received → read → accepted."""
    rows = []
    # Illustrative (demo) holdings are not facts the customer told us: no evidence row.
    items = [(h["label"], EVIDENCE_DOC.get(h["id"]), h.get("evidence")) for h in holdings if h.get("source") != "illustrative"]
    if stays:
        items.insert(0, ("Travel days (trips to India)", "passport", next((s.source for s in stays if s.document_id), None)))
    same = {"passport": ("passport", "travel_history")}
    for label, dtype, evidence in items:
        kinds = same.get(dtype, (dtype,))
        req = next((r for r in requests if r.doc_type in kinds), None)
        doc = next((d for d in docs if d.doc_type in kinds), None)
        read = bool(doc and (doc.extracted_json or {}).get("fields"))
        rows.append({
            "label": label,
            "told": True,
            "requested": bool(req) or bool(doc),
            "received": bool(doc),
            "read": read,
            "accepted": bool(doc and doc.status == "reviewed"),
            "document": doc.filename if doc else None,
        })
    return rows


@router.get("/dashboard/portfolio")
async def portfolio(session: AsyncSession = Depends(get_session)):
    """Across paid customers: deadlines ahead, document pipeline, residency mix and documented money."""
    cases = (await session.execute(select(Case).where(Case.plan == "premium"))).scalars().all()
    today = date.today()
    horizon = today + timedelta(days=150)
    deadlines, pipeline = [], {"Requested": 0, "Received": 0, "Read": 0, "Accepted": 0, "Needs new copy": 0}
    mix: dict[str, int] = {}
    money: dict[str, dict[str, float]] = {"INR": {}, "USD": {}}
    for c in cases:
        reqs = await _rows(session, DocumentRequest, c.id)
        docs = {d.id: d for d in await _rows(session, Document, c.id)}
        for r in reqs:
            doc = docs.get(r.document_id) if r.document_id else None
            if r.status == "rejected":
                pipeline["Needs new copy"] += 1
            elif r.status == "pending":
                pipeline["Requested"] += 1
            elif doc and doc.status == "reviewed" or r.status == "reviewed":
                pipeline["Accepted"] += 1
            elif doc and (doc.extracted_json or {}).get("fields"):
                pipeline["Read"] += 1
            else:
                pipeline["Received"] += 1
            if r.due_date and r.status in ("pending", "rejected") and today.isoformat() <= r.due_date <= horizon.isoformat():
                deadlines.append({"case_id": c.id, "client": c.client_name, "date": r.due_date, "label": r.title, "kind": "document"})
        for code, cs in (c.country_status or {}).items():
            if cs.get("due") and cs["due"] <= horizon.isoformat() and cs["due"] >= today.isoformat():
                deadlines.append({"case_id": c.id, "client": c.client_name, "date": cs["due"], "label": f"{'India' if code == 'IN' else 'US'} return", "kind": "filing"})
        for a in await _rows(session, ActionItem, c.id):
            if a.status == "open" and a.assignee == "advisor" and a.due_date and today.isoformat() <= a.due_date <= horizon.isoformat():
                deadlines.append({"case_id": c.id, "client": c.client_name, "date": a.due_date, "label": a.title, "kind": "review"})
        facts = await _rows(session, Fact, c.id)
        stays = await _rows(session, Stay, c.id)
        if any(f.key in FACT_LABELS for f in facts) or stays:
            calc = residency.calculate(personas.facts_of(facts), personas.stays_of(stays))
            cur = next((y for y in calc["india"] if y["current"]), None)
            if cur:
                mix[cur["status"]] = mix.get(cur["status"], 0) + 1
        else:
            st = ((c.country_status or {}).get("IN") or {}).get("status")
            if st:
                mix[st if st in ("NR", "RNOR", "ROR") else "Other"] = mix.get(st if st in ("NR", "RNOR", "ROR") else "Other", 0) + 1
        for h in _holdings(facts):
            # Only document-confirmed amounts: illustrative (demo) figures are not evidence.
            if h.get("amount") is not None and h.get("source") != "illustrative":
                bucket = money[h["currency"]]
                bucket[h["country"]] = bucket.get(h["country"], 0) + float(h["amount"])
    return {"deadlines": sorted(deadlines, key=lambda d: d["date"]), "pipeline": pipeline, "residency_mix": mix,
            "documented_money": money, "customers": len(cases)}


# ─────────────────────────────────────────────────────────── expert actions

class RequestIn(BaseModel):
    title: str
    why: str
    country: Optional[str] = None
    doc_type: Optional[str] = None
    by: Optional[str] = None  # defaults to the case captain


@router.post("/cases/{case_id}/document-requests")
async def create_requests(case_id: int, body: list[RequestIn], session: AsyncSession = Depends(get_session)):
    case = await _case(session, case_id)
    if not body:
        raise HTTPException(status_code=422, detail="Choose at least one document")
    for r in body:
        r.by = r.by or case.case_captain
    due = (date.today() + timedelta(days=14)).isoformat()
    for r in body:
        session.add(DocumentRequest(case_id=case_id, title=r.title, why=r.why, country=r.country, doc_type=r.doc_type,
                                    status="pending", due_date=due, created_at=_now()))
    first = case.client_name.split()[0]
    names = "\n".join(f"• {r.title}" for r in body)
    await _say(session, case_id, f"Hi {first}, {body[0].by.split()[0]} here, your expert. To start your review I need:\n{names}\n\nEach one has a short note on why in your workspace.",
               {"type": "upload", "label": "Open secure upload", "href": "/portal/documents"}, author=body[0].by)
    _event(session, case_id, body[0].by, "documents.requested", {"count": len(body)})
    await session.commit()
    return {"created": len(body)}


class NoteIn(BaseModel):
    body: str
    author: Optional[str] = None  # defaults to the case captain


@router.post("/cases/{case_id}/notes")
async def add_note(case_id: int, body: NoteIn, session: AsyncSession = Depends(get_session)):
    case = await _case(session, case_id)
    body.author = body.author or case.case_captain
    if not body.body.strip():
        raise HTTPException(status_code=422, detail="Write the note first")
    note = CaseNote(case_id=case_id, author=body.author, body=body.body.strip(), created_at=_now())
    session.add(note)
    _event(session, case_id, body.author, "note.added")
    await session.commit()
    return {"id": note.id}


class ClarifyIn(BaseModel):
    question: str
    by: Optional[str] = None  # defaults to the case captain


@router.post("/cases/{case_id}/clarifications")
async def ask_clarification(case_id: int, body: ClarifyIn, session: AsyncSession = Depends(get_session)):
    case = await _case(session, case_id)
    body.by = body.by or case.case_captain
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="Write the question first")
    item = ActionItem(case_id=case_id, title=body.question.strip(), assignee="customer", status="open",
                      due_date=(date.today() + timedelta(days=7)).isoformat(), owner=body.by, notes="clarification", created_at=_now())
    session.add(item)
    await _say(session, case_id, f"{body.question.strip()}\n\n{body.by.split()[0]}, your expert", author=body.by)
    if case.review_status in (None, "in_review", "ready_for_signoff"):
        case.review_status = "awaiting_customer"
    _event(session, case_id, body.by, "clarification.requested", {"label": body.question.strip()})
    await session.commit()
    return {"id": item.id, "review_status": case.review_status}


class QuestionIn(BaseModel):
    question: str
    by: Optional[str] = None


@router.post("/cases/{case_id}/questions")
async def ask_case_captain(case_id: int, body: QuestionIn, session: AsyncSession = Depends(get_session)):
    """A question the customer addresses to their case captain from the workspace.

    It joins the same thread as WhatsApp (so the conversation stays whole), the agent
    prepares a draft answer from the case record for the expert, and a ticket opens with
    the captain as owner. The expert answers through /tickets/{id}/resolve, which posts
    the reply back to the customer.
    """
    from main import TICKET_SLA, _load_case_full  # late import: main includes this router
    from services import converse

    case = await _case(session, case_id)
    text = body.question.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Write your question first")
    if case.plan == "free":
        raise HTTPException(status_code=403, detail="Questions to an expert are part of the paid plans")
    text, guard = converse.guard_sensitive(text)
    if guard is not None:
        raise HTTPException(status_code=422, detail=guard.content)

    convo = await _conversation(session, case_id)
    user = Message(conversation_id=convo.id, role="user", content=text, created_at=_now()) if convo else None
    if user:
        session.add(user)
        await session.flush()

    # The agent's draft for the expert. Never sent to the customer as-is.
    draft, rules, confidence = None, None, 0.0
    try:
        full = await _load_case_full(session, case_id)
        history = list((await session.execute(select(Message).where(Message.conversation_id == convo.id))).scalars()) if convo else []
        reply = await converse.answer(session, full, history, text)
        text_draft = reply.draft or reply.content
        grounded = not text_draft.lower().startswith("i don't have a grounded answer")
        draft, rules, confidence = (text_draft if grounded else None), reply.cited_rules or None, reply.confidence
    except Exception:  # the question still reaches the expert without a draft
        pass

    lead = case.case_captain
    if convo:
        session.add(Message(conversation_id=convo.id, role="assistant", author="Kiyos", routed=True, confidence=confidence, created_at=_now(),
                            content=f"Got it. I've passed your question to {lead}, your expert, with a draft from your record. You'll get the answer here and in your workspace, usually within one business day."))
    ticket = Ticket(case_id=case_id, conversation_id=convo.id if convo else None, message_id=user.id if user else None, question=text,
                    draft_answer=draft, confidence=confidence, reason="Asked of the expert from the workspace",
                    cited_rules=rules, owner=lead, sla_due_at=_now() + TICKET_SLA, created_at=_now())
    session.add(ticket)
    await session.flush()
    session.add(CaseEvent(case_id=case_id, actor=body.by or case.client_name, action="ticket.created", target_type="ticket",
                          target_id=ticket.id, detail={"label": text[:80], "via": "workspace"}, created_at=_now()))
    await session.commit()
    return {"id": ticket.id, "owner": lead, "sla_due_at": ticket.sla_due_at.isoformat() if ticket.sla_due_at else None}


class DocReviewIn(BaseModel):
    decision: Literal["accept", "reject"]
    by: str
    reason: Optional[str] = None


@router.post("/documents/{document_id}/review")
async def review_document(document_id: int, body: DocReviewIn, session: AsyncSession = Depends(get_session)):
    """The expert's decision on a document the customer sent. Updates the document, the
    request it answers, the expert's own "Checking your …" task, and tells the customer."""
    doc = await session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.decision == "reject" and not (body.reason or "").strip():
        raise HTTPException(status_code=422, detail="Say what's wrong so the customer can fix it")
    accepted = body.decision == "accept"
    if doc.status == ("reviewed" if accepted else "rejected"):
        # Already decided this way (a repeat press): no second message, event or task change.
        req = (await session.execute(select(DocumentRequest).where(DocumentRequest.document_id == doc.id))).scalars().first()
        return {"id": doc.id, "status": doc.status, "request_status": req.status if req else None}
    doc.status = "reviewed" if accepted else "rejected"
    req = (await session.execute(select(DocumentRequest).where(DocumentRequest.document_id == doc.id))).scalars().first()
    if req:
        req.status = "reviewed" if accepted else "rejected"
        req.rejection_reason = None if accepted else body.reason.strip()
    task = (await session.execute(select(ActionItem).where(ActionItem.case_id == doc.case_id, ActionItem.assignee == "advisor",
                                                           ActionItem.status != "done", ActionItem.title.like("Checking your%"))
                                 .order_by(ActionItem.id.desc()))).scalars().first()
    if task:
        task.status = "done"
    name = req.title if req else doc.filename
    first = body.by.split()[0]
    if accepted:
        await _say(session, doc.case_id, f"{first} has accepted your {name}. It now counts towards your returns.", author=body.by)
    else:
        await _say(session, doc.case_id, f"{first} needs a new copy of your {name}: {body.reason.strip()}",
                   {"type": "upload", "label": "Upload a new copy", "href": f"/portal/documents{f'?request={req.id}' if req else ''}"}, author=body.by)
    _event(session, doc.case_id, body.by, "document.accepted" if accepted else "document.rejected", {"label": name})
    await session.commit()
    return {"id": doc.id, "status": doc.status, "request_status": req.status if req else None}


class StatusIn(BaseModel):
    status: Literal["in_review", "awaiting_customer", "ready_for_signoff"]
    by: Optional[str] = None  # defaults to the case captain


@router.post("/cases/{case_id}/review-status")
async def set_review_status(case_id: int, body: StatusIn, session: AsyncSession = Depends(get_session)):
    case = await _case(session, case_id)
    body.by = body.by or case.case_captain
    open_items = [a for a in await _rows(session, ActionItem, case_id) if a.notes == "clarification" and a.status == "open"]
    if body.status == "ready_for_signoff" and open_items:
        raise HTTPException(status_code=409, detail="A clarification is still open with the customer")
    case.review_status = body.status
    _event(session, case_id, body.by, "review.status_changed", {"to": body.status})
    await session.commit()
    return {"review_status": case.review_status}


class ItemStatusIn(BaseModel):
    status: Literal["open", "blocked", "done"]
    by: Optional[str] = None  # defaults to the case captain


@router.post("/action-items/{item_id}/status")
async def set_action_item_status(item_id: int, body: ItemStatusIn, session: AsyncSession = Depends(get_session)):
    """The expert ticks off (or reopens) a to-do; the case activity records who did it."""
    item = await session.get(ActionItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="No such action item")
    case = await _case(session, item.case_id)
    by = body.by or case.case_captain
    item.status = body.status
    _event(session, item.case_id, by, f"action_item.{body.status}", {"label": item.title})
    await session.commit()
    return {"id": item.id, "status": item.status}


class RemindIn(BaseModel):
    by: Optional[str] = None


@router.post("/action-items/{item_id}/remind")
async def remind_customer(item_id: int, body: RemindIn, session: AsyncSession = Depends(get_session)):
    """A gentle reminder on WhatsApp for something the customer still owes."""
    item = await session.get(ActionItem, item_id)
    if not item or item.status == "done":
        raise HTTPException(status_code=404, detail="Nothing open to remind about")
    if item.assignee != "customer":
        raise HTTPException(status_code=400, detail="Only the customer's items can be reminded")
    case = await _case(session, item.case_id)
    by = body.by or case.case_captain
    first = case.client_name.split()[0]
    await _say(session, item.case_id, f"Hi {first}, a quick reminder: {item.title} You can answer here or in your workspace.", author=by)
    _event(session, item.case_id, by, "action_item.reminded", {"label": item.title})
    await session.commit()
    return {"id": item.id, "reminded": True}


async def after_change_confirmed(session: AsyncSession, change: ProfileChange) -> None:
    """A confirmed change to a residency fact means the lead expert rechecks it."""
    if change.fact_key not in FACT_LABELS:
        return
    case = await session.get(Case, change.case_id)
    session.add(ActionItem(case_id=change.case_id, title=f"Recheck residency after the change to \u201c{FACT_LABELS[change.fact_key]}\u201d",
                           assignee="advisor", status="open", owner=case.case_captain if case else None,
                           due_date=(date.today() + timedelta(days=2)).isoformat(), created_at=_now()))


async def open_clarifications(session: AsyncSession, case_id: int) -> int:
    return sum(1 for a in await _rows(session, ActionItem, case_id) if a.notes == "clarification" and a.status == "open")


# ─────────────────────────────────────────────────────────── document reading (prototype)

async def after_upload(session: AsyncSession, case: Case, doc: Document, req: DocumentRequest | None) -> dict[str, Any] | None:
    """Prototype: reading documents isn't built yet. For demo cases, the document is read as
    its synthetic sample (marked simulated), the result is applied to the case, the agent
    tells the customer what it found, and the expert gets a check task and a drafted reply."""
    if not case.demo_key:
        return None
    doc_type = doc.doc_type or (req.doc_type if req else None)
    if not doc_type:
        return None
    facts = await _rows(session, Fact, case.id)
    stays = await _rows(session, Stay, case.id)
    sample = samples.build(case, doc_type, facts, stays)
    result = samples.apply(case, doc, sample, facts, stays, session)
    await session.flush()
    calc = await _calc(session, case.id)

    short = sample.title.split(" · ")[0]
    short = "passport pages" if doc_type in ("passport", "travel_history") else short if short.split()[0].isupper() or short.startswith(("Form", "W-2", "NRO")) else short[0].lower() + short[1:]
    lines = [f"I've read your {short}" + ("." if doc_type in ("passport", "travel_history") or sample.issuer == "Uploaded document" else f" from {sample.issuer}.")]
    lines += [e + ("" if e.endswith(".") else ".") for e in result["effects"] if "Doesn't match" not in e]
    if doc_type == "brokerage_statement":
        us = next((y for y in calc["us"] if y["year"] == "2026"), None)
        fy = next((y for y in calc["india"] if y["year"] == "FY 2026-27"), None)
        if us:
            lines.append(f"US: you're {us['label'].lower()} for 2026, so the gain goes on your 2026 US return.")
        if fy and fy["status"] == "NR":
            lines.append("India: you're non-resident for FY 2026-27, so a US gain made then is generally not taxed in India.")
    if result["mismatch"]:
        lines.append(f"Something doesn't match what you told us ({result['mismatch']['title']}), so I've flagged it for {case.case_captain.split()[0]}.")
    else:
        lines.append(f"It matches what you told us. {case.case_captain.split()[0]} will give it a final check.")
    convo = await _conversation(session, case.id)
    if convo:
        middle = [l for l in lines[1:-1] if l.strip(". ")]
        body = lines[0] + ("\n\n" + "\n".join(f"• {l}" for l in middle) if middle else "") + "\n\n" + lines[-1]
        session.add(Message(conversation_id=convo.id, role="assistant", content=body, author="Kiyos", confidence=1.0,
                            cited_rules=["US-RES-SPT", "IN-RES-182"] if doc_type == "brokerage_statement" else None, created_at=_now()))
    session.add(ActionItem(case_id=case.id, title=f"Checking your {short}", assignee="advisor",
                           status="open", owner=case.case_captain, due_date=(date.today() + timedelta(days=3)).isoformat(), created_at=_now()))
    if result["mismatch"]:
        m = result["mismatch"]
        short = sample.title.split(" · ")[0]
        short = short if short.split()[0].isupper() or short.startswith(("Form", "W-2", "NRO")) else short[0].lower() + short[1:]
        m["draft"] = (f"Thanks for your {short}. It shows {m['found'].split(' (')[0]}, but earlier you told us {m['stated'].split(' (')[0]}. "
                      "I've updated your record from the document. Nothing for you to do, unless the document is wrong.")
        m["rules"] = ["US-RES-SPT", "IN-RES-182"] if doc_type == "brokerage_statement" else None
        doc.extracted_json = {**doc.extracted_json, "mismatch": m}
    return result


class SampleIn(BaseModel):
    doc_type: str
    request_id: Optional[int] = None
    by: str = "customer"


@router.get("/cases/{case_id}/sample-documents")
async def list_samples(case_id: int, doc_type: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Prototype: the synthetic files the document picker offers for this request."""
    case = await _case(session, case_id)
    return samples.catalogue(case, doc_type, await _rows(session, Fact, case_id), await _rows(session, Stay, case_id))


@router.post("/cases/{case_id}/sample-documents")
async def upload_sample(case_id: int, body: SampleIn, session: AsyncSession = Depends(get_session)):
    """Prototype: 'upload' a synthetic document and read it."""
    import continuity
    case = await _case(session, case_id)
    case._moved_back = continuity.moved_back(await continuity._scan(session, case_id))
    facts = await _rows(session, Fact, case_id)
    stays = await _rows(session, Stay, case_id)
    sample = samples.build(case, body.doc_type, facts, stays)
    req = await session.get(DocumentRequest, body.request_id) if body.request_id else None
    if req and req.case_id != case_id:
        raise HTTPException(status_code=422, detail="Request not on this case")
    doc = Document(case_id=case_id, filename=sample.filename, doc_type=body.doc_type, status="received", created_at=_now(),
                   sha256=hashlib.sha256(f"{case_id}:{body.doc_type}:{_now().isoformat()}".encode()).hexdigest(), size_bytes=0)
    session.add(doc)
    await session.flush()
    if req:
        req.status, req.document_id, req.rejection_reason = "received", doc.id, None
    was_demo = case.demo_key
    case.demo_key = case.demo_key or "sample"
    result = await after_upload(session, case, doc, req)
    case.demo_key = was_demo
    await session.flush()
    await continuity.sync_case(session, case)  # what the document established lands in the record
    _event(session, case_id, body.by, "document.uploaded", {"label": doc.filename, "synthetic": True})
    await session.commit()
    return {"document_id": doc.id, "filename": doc.filename, **(result or {})}


@router.get("/cases/{case_id}/document-readings")
async def document_readings(case_id: int, session: AsyncSession = Depends(get_session)):
    await _case(session, case_id)
    docs = sorted(await _rows(session, Document, case_id), key=lambda d: d.created_at, reverse=True)
    return [{"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "status": d.status,
             "created_at": d.created_at.isoformat() if d.created_at else None, "extraction": d.extracted_json} for d in docs]


# ─────────────────────────────────────────────────────────── prototype journeys

class ResetOut(BaseModel):
    case_id: int
    conversation_id: int


@router.post("/demo/journeys/{key}/reset", response_model=ResetOut)
async def reset_journey(key: str, session: AsyncSession = Depends(get_session)):
    """Prototype only: a fresh copy of one journey persona. Touches only that persona's case."""
    base = "preeti" if key == "preeti-expert" else key
    try:
        case, convo = await personas.reset(session, base)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown journey")
    if key == "preeti-expert":
        # Picks up where the customer journey ends: Preeti has uploaded her 1099-B.
        req = (await session.execute(select(DocumentRequest).where(
            DocumentRequest.case_id == case.id, DocumentRequest.doc_type == "brokerage_statement"))).scalars().first()
        doc = Document(case_id=case.id, filename="schwab-1099B-2026.pdf", doc_type="brokerage_statement", status="received", created_at=_now())
        session.add(doc)
        await session.flush()
        if req:
            req.status, req.document_id = "received", doc.id
        session.add(Message(conversation_id=convo.id, role="user", content="Here's my 1099-B, uploaded to the workspace.", created_at=_now()))
        await after_upload(session, case, doc, req)
        await session.commit()
    return ResetOut(case_id=case.id, conversation_id=convo.id)


@router.get("/demo/journeys")
async def journey_cases(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Case).where(Case.demo_key.is_not(None)))).scalars().all()
    return {c.demo_key: c.id for c in rows}
