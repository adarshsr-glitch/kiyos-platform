"""The expert's desk: everything Home and Triage show, in one read-only call (Review 06, EX-07).

Built only from records. It reuses the case brief (mismatches, sign-off readiness) and the
document readings, so the desk and the case page can't disagree. "Today" is the date in
India, where the experts work. Nothing here is estimated: every date is a due date or a
received date on a record; every count is a count of records.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from engine.rules import load_rule
from infra.schema import ActionItem, Assessment, Case, CaseEvent, Document, DocumentRequest, Notice, Ticket
import journeys
import inbox

router = APIRouter()
IST = ZoneInfo("Asia/Kolkata")
RULE_ID = re.compile(r"\b(?:IN|US)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b")
DONE = {
    "action_item.done": "finished",
    "document.accepted": "accepted",
    "document.rejected": "asked for a new copy of",
    "ticket.resolved": "answered",
    "assessment.signed_off": "signed off",
}
NOT_EXPERT = {"customer", "agent", "system", "Kiyos"}


def _ist(at: datetime | str | None) -> Optional[date]:
    if at is None:
        return None
    if isinstance(at, str):
        at = datetime.fromisoformat(at.replace("Z", "+00:00"))
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    return at.astimezone(IST).date()


def _d(s: str | None) -> Optional[date]:
    try:
        return date.fromisoformat(s[:10]) if s else None
    except ValueError:
        return None


def _first(name: str) -> str:
    parts = re.sub(r"^(Dr|Mr|Ms|Mrs)\.?\s+", "", name).replace("&", " ").split()
    return parts[0] if parts else name


def _tier(due: Optional[date], today: date, otherwise: str) -> str:
    if due and due < today:
        return "late"
    if due and (due - today).days <= 6:
        return "soon"
    return otherwise


def _rules_of(ticket: Ticket) -> list[dict[str, str]]:
    """The rules a draft relies on: cited, or named in its text. With their status (JX-13)."""
    ids = list(dict.fromkeys((ticket.cited_rules or []) + RULE_ID.findall(ticket.draft_answer or "")))
    out = []
    for rid in ids:
        rule = load_rule(rid)
        out.append({"id": rid, "status": rule.status if rule else "not_in_library", "summary": rule.summary if rule else None})
    return out


def _doc_view(d: Document) -> dict[str, Any]:
    ex = d.extracted_json or {}
    fields = ex.get("field_list") or [{"label": k, "value": v} for k, v in (ex.get("fields") or {}).items()]
    return {
        "id": d.id, "filename": d.filename, "doc_type": d.doc_type, "status": d.status,
        "received": _ist(d.created_at).isoformat() if d.created_at else None,
        "title": ex.get("title"), "issuer": ex.get("issuer"), "period": ex.get("period"), "pages": ex.get("pages"),
        "fields": fields, "effects": ex.get("effects") or [], "mismatch": ex.get("mismatch"),
        "scan": (ex.get("scan") or {}).get("status"), "synthetic": bool(ex.get("synthetic")),
    }


async def _case_desk(session: AsyncSession, case: Case, today: date, since: datetime) -> dict[str, Any]:
    brief = await journeys.get_brief(case.id, session)
    items = await journeys._rows(session, ActionItem, case.id)
    tickets = [t for t in await journeys._rows(session, Ticket, case.id) if t.status == "open"]
    docs = sorted(await journeys._rows(session, Document, case.id), key=lambda d: d.created_at or datetime.min)
    requests = await journeys._rows(session, DocumentRequest, case.id)
    notices = await journeys._rows(session, Notice, case.id)
    assessments = await journeys._rows(session, Assessment, case.id)
    events = await journeys._rows(session, CaseEvent, case.id)
    who, base = case.client_name, f"/expert/cases/{case.id}"
    rows: list[dict[str, Any]] = []

    def row(**kw):
        kw.setdefault("since", None)
        kw.setdefault("due", None)
        kw.setdefault("prepared", False)
        rows.append({"case_id": case.id, "customer": who, "captain": case.case_captain, **kw})

    # Questions the customer asked: due within the reply time (C-04). Kiyos's draft, honestly labelled.
    for t in tickets:
        due = _ist(t.sla_due_at)
        rules = _rules_of(t)
        grounded = bool(rules) and not (t.draft_answer or "").startswith("I don't have a grounded answer")
        row(key=f"t{t.id}", kind="question", tier="late" if due and due < today else "waiting",
            title=t.question, due=due.isoformat() if due else None, since=_ist(t.created_at).isoformat(), prepared=True, href=f"{base}#q-h",
            detail={"ticket_id": t.id, "question": t.question, "draft": t.draft_answer if grounded else None, "grounded": grounded,
                    "rules": rules, "asked_at": t.created_at.isoformat() if t.created_at else None,
                    "context": next((c["title"] for c in brief["clarifications"] if c["title"] in t.question), None)})

    # Documents sent and not checked yet, one item per customer. Their "Checking your …" to-dos are
    # the same work: they give the item its due date instead of appearing twice.
    unread = [d for d in docs if d.status not in ("reviewed", "rejected")]
    checks = [i for i in items if i.assignee != "customer" and i.status != "done" and i.title.lower().startswith("checking your ")]
    if unread:
        due = min((_d(i.due_date) for i in checks if i.due_date), default=None)
        since_d = min(_ist(d.created_at) for d in unread)
        views = [_doc_view(d) for d in unread]
        read = sum(1 for v in views if v["fields"])
        names = [v["filename"] for v in views]
        row(key=f"d{case.id}", kind="documents", tier=_tier(due, today, "waiting"), title=f"{len(unread)} document{'s' if len(unread) != 1 else ''} to check",
            due=due.isoformat() if due else None, since=since_d.isoformat(), prepared=read > 0, href=f"{base}#q-h",
            detail={"documents": views, "read": read, "duplicates": len(names) - len(set(names)),
                    "mismatches": sum(1 for v in views if v["mismatch"]), "scans_clean": any(v["scan"] for v in views) and all(v["scan"] == "clean" for v in views if v["scan"])})

    # Mismatches between what the customer said and what a document shows.
    for x in brief["discrepancies"]:
        row(key=f"x{case.id}-{x['id']}", kind="mismatch", tier="waiting", title=x["title"], prepared=True, href=f"{base}#h-next",
            detail={"stated": x["stated"], "stated_source": x["stated_source"], "found": x["found"], "found_source": x["found_source"],
                    "effect": x["effect"], "ask": f"The document you sent ({x['found_source']}) shows {x['found']} for your {x['title']}, but you told us {x['stated']}. Could you confirm which is right?"})

    # The expert's own to-dos, all of them (later ones feed the heatmap and Triage's "Later").
    for i in items:
        if i.assignee == "customer" or i.status == "done" or (unread and i.title.lower().startswith("checking your ")):
            continue
        due = _d(i.due_date)
        row(key=f"i{i.id}", kind="todo", tier=_tier(due, today, "later"), title=i.title, due=i.due_date, href=f"{base}#h-next",
            detail={"item_id": i.id, "notes": i.notes, "status": i.status})

    for n in notices:
        if n.status != "open":
            continue
        due = _d(n.deadline)
        row(key=f"n{n.id}", kind="notice", tier=_tier(due, today, "waiting"), title=f"{n.authority} notice: {n.subject}", due=n.deadline,
            since=n.received_at[:10] if n.received_at else None, href=base, detail={"notice_id": n.id})

    # Ready to move forward: the assessment can be signed off now (C-05; blocked while a clarification is open).
    a = brief["assessment"]
    if a and a["status"] != "signed_off" and brief["can_sign_off"]:
        rec = next((x for x in assessments if x.id == a["id"]), None)
        row(key=f"a{a['id']}", kind="signoff", tier="ready", title=a["headline"], since=_ist(rec.updated_at).isoformat() if rec else None,
            prepared=True, href=f"{base}#h-next",
            detail={"assessment_id": a["id"], "status": a["status"], "blockers": brief["blockers"], "open_questions": len(brief["clarifications"]),
                                        "rules": [{"id": rid, "status": (load_rule(rid).status if load_rule(rid) else "not_in_library")}
                              for rid in dict.fromkeys(s.get("rule_id") for s in ((rec.derivation_trail or []) if rec else []) if s.get("rule_id"))]})

    # A plain reply (not a question: those are tickets) waits on the expert too.
    reply = inbox._replies(case, await inbox._thread(session, case.id), await inbox._asked_ids(session, case.id))
    if reply and reply.new and not reply.asked:
        row(key=f"m{case.id}", kind="reply", tier="waiting", title=reply.texts[-1] if reply.texts else "Replied", since=_ist(reply.at).isoformat(),
            href=base, detail={"texts": reply.texts, "to": reply.to_message})

    # What the customer owes: open questions to them, and requested documents.
    owed = [{"key": f"o{i.id}", "case_id": case.id, "customer": who, "item_id": i.id, "title": i.title, "due": i.due_date,
             "late": bool(_d(i.due_date) and _d(i.due_date) < today)} for i in items if i.assignee == "customer" and i.status != "done"]
    owed_docs = [{"key": f"r{r.id}", "case_id": case.id, "customer": who, "item_id": None, "title": r.title, "due": r.due_date,
                  "late": bool(_d(r.due_date) and _d(r.due_date) < today)} for r in requests if r.status in ("pending", "rejected")]

    # Where the case stands for its filing dates.
    pending = any(r.status in ("pending", "rejected") for r in requests)
    received = any(r.status == "received" for r in requests) or bool(unread)
    latest = max(assessments, key=lambda x: x.id) if assessments else None
    if pending:
        stage = "documents"
    elif received or not latest:
        stage = "review"
    elif latest.status != "signed_off":
        stage = "ready" if brief["can_sign_off"] else "review"
    else:
        stage = "signed"
    filings = [{"country": code, "due": s["due"], "form": (s.get("filing") or "").split(" + ")[0]}
               for code, s in (case.country_status or {}).items() if s and s.get("due") and _d(s["due"]) and _d(s["due"]) >= today]

    # What happened since yesterday (for the brief), and what an expert finished today.
    new_docs = [d for d in docs if d.created_at and _aware(d.created_at) >= since]
    new_tickets = [t for t in tickets if t.created_at and _aware(t.created_at) >= since]
    done = [{"key": f"e{e.id}", "case_id": case.id, "customer": who, "actor": e.actor, "verb": DONE[e.action],
             "label": (e.detail or {}).get("label"), "at": e.created_at.isoformat()}
            for e in events if e.action in DONE and e.actor not in NOT_EXPERT and _ist(e.created_at) == today]

    return {
        "case": {"id": case.id, "customer": who, "captain": case.case_captain, "name": case.name, "stage": stage, "filings": filings,
                 "updated": _ist(case.updated_at).isoformat() if case.updated_at else None, "review_status": case.review_status or "in_review",
                 "docs": {"accepted": sum(1 for r in requests if r.status == "reviewed"), "total": len(requests)},
                 "signed": {"done": sum(1 for x in assessments if x.status == "signed_off"), "total": len(assessments)}},
        "rows": rows, "owed": owed, "owed_docs": owed_docs, "done": done,
        "new_docs": [_doc_view(d) | {"case_id": case.id, "customer": who} for d in new_docs],
        "new_tickets": [{"case_id": case.id, "customer": who, "question": t.question, "at": t.created_at.isoformat(),
                         "grounded": bool(_rules_of(t)) and not (t.draft_answer or "").startswith("I don't have a grounded answer")} for t in new_tickets],
    }


def _aware(at: datetime) -> datetime:
    return at if at.tzinfo else at.replace(tzinfo=timezone.utc)


ORDER = {"late": 0, "waiting": 1, "soon": 2, "ready": 3, "later": 4}


def _rank(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def key(r):
        k = r["due"] if r["tier"] in ("late", "soon", "later") else r["since"]
        return (ORDER[r["tier"]], k or "9999", r["customer"])
    return sorted(rows, key=key)


@router.get("/experts/desk")
async def desk(expert: Optional[str] = None, case: Optional[int] = None, session: AsyncSession = Depends(get_session)):
    """Home, Triage and Cases in one call. With `expert`, only that expert's customers (if they have
    any); with `case`, only that customer (the case page's "Up next")."""
    now_ist = datetime.now(IST)
    today = now_ist.date()
    since = datetime.combine(today - timedelta(days=1), datetime.min.time(), IST)
    cases = [c for c in (await session.execute(select(Case))).scalars() if (c.plan or "premium") == "premium"]
    mine = [c for c in cases if expert and c.case_captain == expert]
    scope = [c for c in cases if c.id == case] if case else mine if mine else cases
    per = [await _case_desk(session, c, today, since) for c in scope]

    queue = _rank([r for p in per for r in p["rows"]])
    open_rows = [r for r in queue if r["tier"] != "later"]
    owed = sorted([o for p in per for o in p["owed"] + p["owed_docs"] if o["item_id"] is not None or o["late"]],
                  key=lambda o: (not o["late"], o["due"] or "9999"))
    count = {t: sum(1 for r in queue if r["tier"] == t) for t in ORDER}

    # Brief: what changed since the start of yesterday, as fixed sentences built from records.
    brief: list[dict[str, Any]] = []
    by_case: dict[int, list] = {}
    for p in per:
        for d in p["new_docs"]:
            by_case.setdefault(d["case_id"], []).append(d)
    for cid, ds in by_case.items():
        read = [d for d in ds if d["fields"]]
        conflicts = [d for d in ds if d["mismatch"]]
        brief.append({"kind": "documents", "case_id": cid, "customer": ds[0]["customer"], "row": f"d{cid}",
                      "what": ds[0]["title"] or ds[0]["filename"] if len(ds) == 1 else f"{len(ds)} documents",
                      "read": sum(len(d["fields"]) for d in read), "conflicts": len(conflicts)})
    for p in per:
        ts = sorted(p["new_tickets"], key=lambda t: t["at"])
        if ts:
            t = ts[-1]
            brief.append({"kind": "question", "case_id": t["case_id"], "customer": t["customer"], "what": t["question"], "grounded": t["grounded"],
                          "at": t["at"], "count": len(ts), "context": next((r["detail"]["context"] for r in p["rows"] if r["kind"] == "question" and r["detail"]["context"]), None)})
    late = [r for r in queue if r["tier"] == "late"]
    if late:
        oldest = min(late, key=lambda r: r["due"] or "9999")
        brief.append({"kind": "overdue", "count": len(late), "customers": len({r["case_id"] for r in late}),
                      "case_id": oldest["case_id"], "customer": oldest["customer"], "what": oldest["title"],
                      "days": (today - _d(oldest["due"])).days if oldest["due"] else None, "row": oldest["key"]})

    # Heatmap: four weeks from this Monday. Yours = every dated piece of your work; owed = what customers owe.
    start = today - timedelta(days=today.weekday())
    days = []
    for k in range(28):
        d = start + timedelta(days=k)
        iso = d.isoformat()
        days.append({"date": iso, "past": d < today,
                     "yours": sum(1 for r in queue if r["due"] == iso),
                     "owed": sum(1 for p in per for o in p["owed"] + p["owed_docs"] if o["due"] == iso)})
    end = start + timedelta(days=27)
    all_filings = sorted({(f["country"], f["due"]) for p in per for f in p["case"]["filings"]}, key=lambda x: x[1])
    runway = []
    for code, due in all_filings:
        people = [{"case_id": p["case"]["id"], "customer": p["case"]["customer"], "stage": p["case"]["stage"]}
                  for p in per if any(f["country"] == code and f["due"] == due for f in p["case"]["filings"])]
        runway.append({"country": code, "due": due, "days": (_d(due) - today).days, "customers": people})

    return {
        "today": today.isoformat(),
        "expert": expert if mine else None,
        "mine": bool(mine),
        "customers": len(scope),
        "counts": {**count, "open": len(open_rows), "prepared": sum(1 for r in open_rows if r["prepared"]),
                   "questions": sum(1 for r in open_rows if r["kind"] == "question"),
                   "late_customers": len({r["case_id"] for r in late})},
        "queue": queue,
        "brief": brief[:4],
        "heatmap": {"start": start.isoformat(), "days": days,
                    "filings": [{"country": c, "due": d} for c, d in all_filings if start.isoformat() <= d <= end.isoformat()],
                    "next_filing": next(({"country": c, "due": d, "days": (_d(d) - today).days} for c, d in all_filings), None)},
        "runway": runway,
        "no_filing_date": [p["case"]["customer"] for p in per if not p["case"]["filings"]],
        "book": {"docs": {"accepted": sum(p["case"]["docs"]["accepted"] for p in per), "total": sum(p["case"]["docs"]["total"] for p in per)},
                 "signed": {"done": sum(p["case"]["signed"]["done"] for p in per), "total": sum(p["case"]["signed"]["total"] for p in per)}},
        "owed": owed,
        "done_today": sorted([d for p in per for d in p["done"]], key=lambda d: d["at"], reverse=True),
        "cases": [_summary(p, queue, today) for p in per],
    }


def _summary(p: dict[str, Any], queue: list[dict[str, Any]], today: date) -> dict[str, Any]:
    """One customer for the Cases list: stage, what's most urgent, what they owe, the next filing."""
    c = p["case"]
    rows = [r for r in queue if r["case_id"] == c["id"]]
    open_rows = [r for r in rows if r["tier"] != "later"]
    top = open_rows[0] if open_rows else None
    owed = p["owed"] + p["owed_docs"]
    nxt = min(c["filings"], key=lambda f: f["due"], default=None)
    return {
        **{k: c[k] for k in ("id", "customer", "captain", "name", "stage", "docs", "signed", "updated", "review_status")},
        "tiers": {t: sum(1 for r in rows if r["tier"] == t) for t in ORDER},
        "top": {k: top[k] for k in ("key", "kind", "tier", "title", "due", "since")} if top else None,
        "reasons": [{k: r[k] for k in ("key", "kind", "tier", "title", "due", "since")} for r in open_rows],
        "owed": len(owed),
        "owed_late": sum(1 for o in owed if o["late"]),
        "next_filing": {**nxt, "days": (_d(nxt["due"]) - today).days} if nxt else None,
    }
