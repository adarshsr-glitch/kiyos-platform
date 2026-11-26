"""Continuity: what a customer has already told Kiyos becomes the start of their workspace.

Before this, three things lived in silos and never reached the workspace:
  - WhatsApp assessment answers stayed in `initial_scan.answers`;
  - document readings stayed in `document.extracted_json` when the case had no matching
    holding (customers who paid straight after the scan, without onboarding);
  - the passport reading only echoed trips already on record.

`sync_case` maps them into the case record the workspace reads (household, holdings,
stays), each with its source, so captured, extracted and reviewed information stay
distinguishable. Additive and idempotent: it never deletes or overwrites a value someone
entered, and running it twice adds nothing.

Called after payment, after each document read, and once at start-up for existing cases.
"""

from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import evidence
import samples
from infra.schema import Case, Document, Fact, HouseholdMember, InitialScan, ProfileChange, Stay

SCAN_SOURCE = "WhatsApp assessment"

# Yes-answers in the scan that establish a holding, without an amount yet.
SCAN_HOLDINGS: dict[str, tuple[str, str, str, str, str]] = {
    # answer key: (holding id, country, kind, label, currency)
    "retirement": ("us-401k", "US", "asset", "401(k) or IRA", "USD"),
    "equity": ("us-brokerage", "US", "asset", "US shares or RSUs", "USD"),
    "india_property": ("in-property", "IN", "asset", "Property in India", "INR"),
    "india_funds": ("in-mf", "IN", "asset", "Indian mutual funds", "INR"),
}


async def _scan(session: AsyncSession, case_id: int) -> InitialScan | None:
    return (await session.execute(select(InitialScan).where(InitialScan.case_id == case_id).order_by(InitialScan.id.desc()))).scalars().first()


def moved_back(scan: InitialScan | None) -> bool:
    timing = str((scan.answers or {}).get("move_timing", "")) if scan else ""
    return "already moved" in timing.lower()


async def sync_case(session: AsyncSession, case: Case) -> int:
    """Bring the case record up to date with the scan and every document read. Returns
    how many records were added or completed. Does not commit."""
    n = 0
    scan = await _scan(session, case.id)
    facts = list((await session.execute(select(Fact).where(Fact.case_id == case.id))).scalars())
    stays = list((await session.execute(select(Stay).where(Stay.case_id == case.id))).scalars())
    members = list((await session.execute(select(HouseholdMember).where(HouseholdMember.case_id == case.id))).scalars())
    docs = list((await session.execute(select(Document).where(Document.case_id == case.id).order_by(Document.id))).scalars())
    keys = {f.key for f in facts}

    # 1. The customer themself, so Profile always has a household.
    nationality = next(
        ((d.extracted_json or {}).get("fields", {}).get("Nationality") for d in docs if d.doc_type in ("passport", "travel_history") and d.extracted_json),
        None,
    )
    primary = next((m for m in members if m.role == "primary"), None)
    if not primary and case.client_name and case.client_name.strip().lower() != "new customer":
        session.add(HouseholdMember(case_id=case.id, name=case.client_name, role="primary", citizenship=nationality))
        n += 1
    elif primary and not primary.citizenship and nationality:
        primary.citizenship = nationality
        n += 1

    # 2. Scan answers that establish a holding: present, amount not known yet.
    answers = (scan.answers or {}) if scan else {}
    for key, (hid, country, kind, label, cur) in SCAN_HOLDINGS.items():
        if str(answers.get(key, "")).lower().startswith("yes") and f"holding:{hid}" not in keys and not samples.has_similar(facts, hid):
            data = {"id": hid, "country": country, "kind": kind, "label": label, "currency": cur, "band": "Amount not given yet"}
            f = Fact(case_id=case.id, key=f"holding:{hid}", value=json.dumps(data, ensure_ascii=False), source=SCAN_SOURCE,
                     evidence=_told(scan, key))
            session.add(f)
            facts.append(f)
            keys.add(f.key)
            n += 1

    # 3. Every document read: its amount and trips belong in the record.
    case._moved_back = moved_back(scan)  # read by the passport sample
    for d in docs:
        if not d.doc_type or not (d.extracted_json or {}).get("synthetic"):
            continue
        sample = samples.build(case, d.doc_type, facts, stays)
        # A holding the scan created without an amount takes the document's figure.
        if sample.holding_id and sample.amount is not None:
            existing = next((f for f in facts if f.key == f"holding:{sample.holding_id}"), None)
            if existing and existing.source == SCAN_SOURCE:
                h = json.loads(existing.value)
                if h.get("amount") is None:
                    h.update({"amount": sample.amount, "evidence": d.filename, "band": samples._band_for(sample.amount, sample.currency)})
                    existing.value, existing.source = json.dumps(h, ensure_ascii=False), d.filename
                    existing.evidence = evidence.for_amount(d, sample)
                    n += 1
        added = samples.propagate(case, d, sample, facts, stays, session)
        n += len(added)
        # The stored reading should show what the record now holds (e.g. the stamps).
        if d.doc_type in ("passport", "travel_history") and sample.stays and not any(k in ("Arrived", "Left") for k in (d.extracted_json or {}).get("fields", {})):
            ex = dict(d.extracted_json)
            ex["fields"] = {x["label"]: x["value"] for x in sample.fields}
            ex["field_list"] = sample.fields
            ex["effects"] = [f"{len(sample.stays)} trip{'s' if len(sample.stays) != 1 else ''} to India read from passport stamps"]
            d.extracted_json = ex

    # 4. Older records: say exactly where each value came from. Adds evidence only;
    #    never changes a value.
    confirmed = list((await session.execute(select(ProfileChange).where(
        ProfileChange.case_id == case.id, ProfileChange.status == "confirmed").order_by(ProfileChange.decided_at))).scalars())
    n += _backfill_evidence(case, scan, facts, stays, docs, confirmed)
    return n


def _question(key: str) -> str:
    from services.intake import load_scan
    return next((s["ask"] for s in load_scan()["steps"] if s["key"] == key), key.replace("_", " "))


def _told(scan: InitialScan | None, key: str) -> dict | None:
    if not scan or key not in (scan.answers or {}):
        return None
    at = scan.created_at.isoformat() if scan.created_at else None
    return evidence.answer(_question(key), str(scan.answers[key]), at, "WhatsApp")


def _backfill_evidence(case: Case, scan: InitialScan | None, facts: list[Fact], stays: list[Stay], docs: list[Document],
                       confirmed: list[ProfileChange]) -> int:
    from journeys import FACT_LABELS

    n = 0
    by_file = {d.filename: d for d in docs}
    scan_key = {hid: k for k, (hid, *_rest) in SCAN_HOLDINGS.items()}
    # Readings stored before pages were recorded: add the page to each field.
    for d in docs:
        ex = d.extracted_json or {}
        fl = ex.get("field_list")
        if fl and any("page" not in x for x in fl):
            ex = {**ex, "field_list": evidence.with_pages(d.doc_type, fl)}
            d.extracted_json = ex
            n += 1
        if ex.get("synthetic") and "scan" not in ex:
            # Every file is scanned before it is read; older readings record the result too.
            d.extracted_json = {**ex, "scan": {"status": "clean", "engine": "GuardDuty Malware Protection (simulated)",
                                               "at": (d.created_at or datetime.now()).date().isoformat()}}
            n += 1
    for f in facts:
        if f.evidence:
            continue
        ev = None
        at = f.created_at.isoformat() if f.created_at else None
        if f.source in by_file and f.key.startswith("holding:"):
            d = by_file[f.source]
            label = evidence.AMOUNT_FIELD.get(d.doc_type or "")
            ev = evidence.for_reading(d, [label], evidence.AMOUNT_NOTE.get(d.doc_type or "")) if label else None
        elif f.source == SCAN_SOURCE and f.key.startswith("holding:"):
            ev = _told(scan, scan_key.get(f.key.split(":", 1)[1], ""))
        elif f.key.startswith("tax_estimate:"):
            # Tax figures only ever come from the expert: a seeded one is the captain's entry.
            ev = evidence.expert(case.case_captain, at)
        elif f.source and "illustrative" in f.source.lower():
            ev = evidence.illustrative_reference(f.key, f.value, f.unit) or evidence.DEMO
        elif f.source == "customer_confirmed":
            change = next((c for c in reversed(confirmed) if c.fact_id == f.id), None)
            ev = evidence.said(change) if change else None
        elif f.source == "captain-entered":
            ev = evidence.expert(case.case_captain, at)
        elif f.source == "Onboarding answer":
            if f.key in FACT_LABELS:
                try:
                    shown = date.fromisoformat(f.value).strftime("%d %b %Y")
                except ValueError:
                    shown = f.value
                ev = evidence.answer(FACT_LABELS[f.key], shown, at, "Onboarding")
            elif f.key.startswith("holding:"):
                h = json.loads(f.value)
                ev = evidence.answer(f"{h.get('label', 'Holding')}: roughly how much?", h.get("band", ""), at, "Onboarding")
            elif f.key.startswith("stated_days_in_india:"):
                ev = evidence.answer(f"Days in India in {f.key.split(':', 1)[1]}", f"{f.value} days", at, "Onboarding")
        elif f.source and f.source != "derived":
            # Seeded demo facts that only name their source: a sample reference into it.
            ev = evidence.sample_reference(f.key, f.value, f.unit, f.source)
        if ev:
            f.evidence = ev
            n += 1
    docs_by_id = {d.id: d for d in docs}
    for st in stays:
        if st.evidence:
            continue
        ev = None
        if st.source and "illustrative" in st.source.lower():
            ev = evidence.illustrative_trip(st.arrived, st.departed)
        elif st.document_id and st.document_id in docs_by_id:
            d = docs_by_id[st.document_id]
            # The trip is on record from this document even if its stamp line wasn't kept.
            ev = evidence.stay_from_reading(d, st.arrived, st.departed) or {
                "kind": "document", "document_id": d.id, "filename": d.filename, "title": d.filename, "issuer": None, "pages": None, "lines": []}
        elif st.source == "Onboarding answer":
            a = date.fromisoformat(st.arrived).strftime("%d %b %Y")
            dep = date.fromisoformat(st.departed).strftime("%d %b %Y") if st.departed else None
            at = st.created_at.isoformat() if st.created_at else None
            ev = evidence.answer("Your trips to India", f"{a} to {dep}" if dep else f"From {a}", at, "Onboarding")
        if ev:
            st.evidence = ev
            n += 1
    return n


async def sync_all(session_factory) -> dict[int, int]:
    """Start-up backfill for every case that has a scan or documents."""
    out: dict[int, int] = {}
    async with session_factory() as session:
        cases = list((await session.execute(select(Case))).scalars())
        for c in cases:
            n = await sync_case(session, c)
            if n:
                out[c.id] = n
        await session.commit()
    return out
