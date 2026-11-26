"""Journey personas: fresh, resettable demo cases for the five prototype journeys.

Each reset deletes the previous case for that journey (and only that one, found by
`demo_key`) and builds a new one from the spec below. All records are ordinary rows,
so the real portal and expert pages, the real intake bot and the real agent run on
them. Dates are relative to today so the story stays current.

Names, documents and figures are illustrative. Tax outcomes are not written here:
they are calculated by services.residency from the stays and facts.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

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
    InitialScan,
    Message,
    ProfileChange,
    Stay,
    Ticket,
)
from services import intake, residency
import samples
from infra import hni

LEAD = "Vikram Desai"
REVIEWERS = [
    {"name": LEAD, "role": "Lead tax expert", "country": "BOTH", "qualification": "CA, CPA"},
    {"name": "Meera Iyer", "role": "India reviewer", "country": "IN", "qualification": "Chartered Accountant"},
    {"name": "Daniel Brooks", "role": "US reviewer", "country": "US", "qualification": "Enrolled Agent"},
]
KEYS = ("arjun", "preeti", "ananya", "rohan")


def _ago(days: float, hour: int = 10, minute: int = 0) -> datetime:
    ist = timezone(timedelta(hours=5, minutes=30))
    d = (datetime.now(ist) - timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return d.astimezone(timezone.utc)


def _iso(days_from_today: int) -> str:
    return (date.today() + timedelta(days=days_from_today)).isoformat()


def facts_of(case_facts: list[Fact]) -> dict[str, str]:
    return {f.key: f.value for f in case_facts}


def stays_of(case_stays: list[Stay]) -> list[dict]:
    return [{"id": s.id, "country": s.country, "arrived": s.arrived, "departed": s.departed} for s in case_stays]


async def _wipe(session: AsyncSession, key: str) -> None:
    old = (await session.execute(select(Case).where(Case.demo_key == key))).scalars().all()
    for case in old:
        cid = case.id
        convo_ids = (await session.execute(select(Conversation.id).where(Conversation.case_id == cid))).scalars().all()
        if convo_ids:
            await session.execute(delete(Message).where(Message.conversation_id.in_(convo_ids)))
        for model in (Ticket, CaseEvent, InitialScan, DocumentRequest, ProfileChange, Stay, CaseNote, ActionItem):
            await session.execute(delete(model).where(model.case_id == cid))
        await session.delete(case)
    await session.flush()


def _fact(case: Case, key: str, value: str, source: str, days_ago: int = 30) -> Fact:
    f = Fact(case_id=case.id, key=key, value=value, source=source, as_of=_iso(-days_ago))
    return f


def _holding(case: Case, **h) -> Fact:
    source = h.pop("source", "Onboarding answer")
    return Fact(case_id=case.id, key=f"holding:{h['id']}", value=json.dumps(h), source=source)


async def _read(session: AsyncSession, case: Case, doc: Document) -> None:
    """Earlier documents arrive already read, so the record shows what was extracted."""
    await session.flush()
    facts = (await session.execute(select(Fact).where(Fact.case_id == case.id))).scalars().all()
    stays = (await session.execute(select(Stay).where(Stay.case_id == case.id))).scalars().all()
    samples.apply(case, doc, samples.build(case, doc.doc_type, list(facts), list(stays)), list(facts), list(stays), session)
    doc.status = "reviewed"


async def _thread(session: AsyncSession, case: Case, stage: str, at: datetime) -> Conversation:
    convo = Conversation(case_id=case.id, title="WhatsApp", stage=stage, created_at=at)
    session.add(convo)
    await session.flush()
    return convo


def _msg(session, convo, role, content, at, **kw) -> Message:
    m = Message(conversation_id=convo.id, role=role, content=content, created_at=at,
                author=kw.pop("author", "Kiyos" if role == "assistant" else None), confidence=kw.pop("confidence", 1.0 if role == "assistant" else None), **kw)
    session.add(m)
    return m


# ───────────────────────────────────────────────────────── J1 · Arjun, new on WhatsApp

async def _arjun(session: AsyncSession) -> tuple[Case, Conversation]:
    case = Case(name="New WhatsApp enquiry", client_name="Arjun Mehta", status="lead", jurisdictions="IN,US",
                case_captain="Unassigned", plan="free", phone="+1 415 555 2291", demo_key="arjun")
    session.add(case)
    await session.flush()
    convo = Conversation(case_id=case.id, title="WhatsApp", stage="intake",
                         intake={"step": "question", "answers": {}})
    session.add(convo)
    await session.flush()
    for bm in intake.opening_messages():
        _msg(session, convo, "assistant", bm.content, datetime.now(timezone.utc), options=bm.options, action=bm.action)
    return case, convo


# ───────────────────────────────────────────────────────── J2/J4 · Preeti, paid with history

async def _preeti(session: AsyncSession) -> tuple[Case, Conversation]:
    case = Case(
        name="Preeti Nair", client_name="Preeti Nair", status="active", jurisdictions="IN,US",
        case_captain=LEAD, plan="premium", phone="+1 206 555 0134", demo_key="preeti",
        summary="Seattle-based, moving back to Kochi in mid-2027 after 10 years in the US. Full service.",
        activated_at=_ago(66, 19), reviewers=REVIEWERS, tax_year="2026",
        plan_choice={"offering": "full", "name": "Full service", "household": "individual", "price_inr": 47200,
                     "gst_included": True, "payment_method": "upi", "receipt": "KY-0412-260912"},
        country_status={
            "IN": {"year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Planning", "reviewed_by": "Meera Iyer", "reviewed_on": _iso(-7)},
            "US": {"year": "Tax year 2026", "filing": "Form 1040", "due": "2027-04-15", "state": "Collecting documents", "reviewed_by": "Daniel Brooks", "reviewed_on": _iso(-9)},
        },
        created_at=_ago(70), review_status="in_review",
    )
    session.add(case)
    await session.flush()
    passport = Document(case_id=case.id, filename="passport-travel-pages.pdf", doc_type="passport", status="reviewed", created_at=_ago(15))
    w2 = Document(case_id=case.id, filename="W2-2025-Amazon.pdf", doc_type="W-2", status="reviewed", created_at=_ago(20))
    nro = Document(case_id=case.id, filename="NRO-statement-Mar26.pdf", doc_type="bank_statement", status="rejected", created_at=_ago(12))
    session.add_all([passport, w2, nro])
    await session.flush()
    session.add_all([
        _fact(case, "left_india_on", "2016-08-20", "Passport pages"),
        _fact(case, "us_arrived_on", "2016-08-21", "Passport pages"),
        _fact(case, "india_return_date", "2027-06-15", "Onboarding answer", 60),
        _holding(case, id="us-salary", country="US", kind="income", label="Salary (US employer)", currency="USD", band="$50–250k"),
        _holding(case, id="us-brokerage", country="US", kind="asset", label="Schwab brokerage account", currency="USD", band="$10–50k"),
        _holding(case, id="us-401k", country="US", kind="asset", label="401(k)", currency="USD", band="$50–250k"),
        _holding(case, id="in-nro", country="IN", kind="asset", label="NRO savings and FDs", currency="INR", band="₹5–25L"),
        _holding(case, id="in-interest", country="IN", kind="income", label="Interest on NRO deposits", currency="INR", band="Under ₹5L"),
        HouseholdMember(case_id=case.id, name="Preeti Nair", role="primary", citizenship="Indian", visa_status="H-1B"),
    ])
    for arrived, departed in (("2023-12-15", "2024-01-10"), ("2024-12-18", "2025-01-12"), ("2025-10-20", "2025-11-05")):
        session.add(Stay(case_id=case.id, country="IN", arrived=arrived, departed=departed, source="Passport pages", document_id=passport.id))
    await session.flush()
    ret = (await session.execute(select(Fact).where(Fact.case_id == case.id, Fact.key == "india_return_date"))).scalars().first()

    def req(title, why, country, doc_type, status="pending", due=None, doc=None, reason=None):
        r = DocumentRequest(case_id=case.id, title=title, why=why, country=country, doc_type=doc_type, status=status,
                            due_date=due, document_id=doc.id if doc else None, rejection_reason=reason, created_at=_ago(30))
        session.add(r)
        return r

    req("Passport pages showing travel since 2023", "Your days in India each year decide your residential status.", "IN", "passport", "reviewed", doc=passport)
    req("W-2 from Amazon (2025)", "Your US salary and tax withheld for 2025.", "US", "W-2", "reviewed", doc=w2)
    schwab = req("Schwab 1099-B for 2026", "Shows shares you sold in 2026, so gains are reported in the right country.", "US", "brokerage_statement", due=_iso(13))
    req("NRO account statement (Mar 2026)", "Confirms the interest you earned in India and your year-end balance.", "IN", "bank_statement", "rejected", due=_iso(18), doc=nro,
        reason="Pages 2–3 were missing. Your bank can email the full statement.")
    await session.flush()

    change = ProfileChange(
        case_id=case.id, fact_id=ret.id, fact_key="india_return_date", previous_value="2027-06-15",
        proposed_value="2027-07-12", source="whatsapp", quote="My move date has changed: I land in Kochi on 12 July now, not 15 June.",
        affects="Moves your return by four weeks. Kiyos recalculates your India and US residency once you confirm.",
        created_at=_ago(2, 20, 4),
    )
    session.add(change)
    await session.flush()

    convo = await _thread(session, case, "paid", _ago(66, 19))
    _msg(session, convo, "assistant", "Payment received: Full service, ₹47,200 incl. GST. Your receipt and scope are in your workspace.", _ago(66, 19, 5),
         action={"type": "overview", "label": "Open my workspace", "href": "/portal/dashboard"})
    _msg(session, convo, "assistant", f"{LEAD} is your lead expert. Meera Iyer (CA) reviews the India side and Daniel Brooks (EA) the US side.", _ago(66, 19, 6))
    _msg(session, convo, "assistant", "Meera has reviewed your India position from your passport pages: non-resident for FY 2026-27. It's in your workspace under Tax position.", _ago(7, 11, 30),
         action={"type": "assessment", "label": "See your tax position", "href": "/portal/assessment"})
    _msg(session, convo, "user", change.quote, _ago(2, 20, 4))
    _msg(session, convo, "assistant", "Thanks, Preeti. I've noted 12 July as a proposed change. Nothing is updated until you confirm it in your workspace.", _ago(2, 20, 4),
         action={"type": "verify", "label": "Confirm 12 July", "href": f"/portal/verify?change={change.id}"})

    # Proactive follow-up: the agent recalculates on the proposed date and says what changes.
    facts = facts_of((await session.execute(select(Fact).where(Fact.case_id == case.id))).scalars().all())
    stays = [{"country": "IN", "arrived": a, "departed": d} for a, d in (("2023-12-15", "2024-01-10"), ("2024-12-18", "2025-01-12"), ("2025-10-20", "2025-11-05"))]
    now_calc = residency.calculate(facts, stays)
    new_calc = residency.calculate({**facts, "india_return_date": "2027-07-12"}, stays)
    fy_now = next(y for y in now_calc["india"] if y["year"] == "FY 2027-28")
    fy_new = next(y for y in new_calc["india"] if y["year"] == "FY 2027-28")
    us_now = next((y for y in now_calc["us"] if y["year"] == "2027"), None)
    us_new = next((y for y in new_calc["us"] if y["year"] == "2027"), None)
    same = fy_now["status"] == fy_new["status"]
    text = (
        f"Hi Preeti, I ran your residency again with 12 July. India, FY 2027-28: {fy_new['days']} days instead of "
        f"{fy_now['days']}, still {fy_new['status']}." if same else
        f"Hi Preeti, I ran your residency again with 12 July. India, FY 2027-28 changes from {fy_now['status']} to {fy_new['status']} "
        f"({fy_new['days']} days)."
    )
    if us_now and us_new:
        text += f" US 2027: {us_new['days']} days in the US instead of {us_now['days']}, still {us_new['label'].split(':')[0].lower()}."
    text += f"\n\nNothing changes until you confirm the date. Then {LEAD.split()[0]} rechecks it. Still open: your Schwab 1099-B and a full copy of your NRO statement."
    _msg(session, convo, "assistant", text, datetime.now(timezone.utc) - timedelta(minutes=2),
         action={"type": "verify", "label": "Review the change", "href": f"/portal/verify?change={change.id}"}, cited_rules=["IN-RES-182", "IN-RES-RNOR-9OF10", "US-RES-SPT"])
    await _read(session, case, w2)
    await _read(session, case, passport)
    session.add(Assessment(case_id=case.id, headline="Residency plan for the 2027 move", status="draft", created_at=_ago(7)))
    session.add(ActionItem(case_id=case.id, title="Preparing your India return summary for FY 2026-27", assignee="advisor",
                           status="open", owner="Meera Iyer", due_date=_iso(11), created_at=_ago(7)))
    _ = schwab
    return case, convo


# ───────────────────────────────────────────────────────── J3 · Ananya, new paid customer

async def _ananya(session: AsyncSession) -> tuple[Case, Conversation]:
    case = Case(
        name="Ananya Bose", client_name="Ananya Bose", status="active", jurisdictions="IN,US", case_captain=LEAD,
        plan="premium", phone="+1 512 555 0163", demo_key="ananya", reviewers=REVIEWERS, activated_at=_ago(0, 9, 40),
        summary="Austin-based, green card holder, moving to Hyderabad in March 2027 with her spouse. Joined today.",
        plan_choice={"offering": "full", "name": "Full service", "household": "couple", "price_inr": 70800, "gst_included": True},
        created_at=_ago(1, 21), review_status="in_review",
    )
    session.add(case)
    await session.flush()
    session.add_all([
        _fact(case, "left_india_on", "2015-07-01", "Onboarding answer", 0),
        _fact(case, "us_arrived_on", "2015-07-02", "Onboarding answer", 0),
        _fact(case, "green_card_from", "2021-05-01", "Onboarding answer", 0),
        _fact(case, "india_return_date", "2027-03-20", "Onboarding answer", 0),
        _holding(case, id="us-salary", country="US", kind="income", label="Salary (US employer)", currency="USD", band="$50–250k"),
        _holding(case, id="in-nro", country="IN", kind="asset", label="NRO deposits", currency="INR", band="₹25L–1Cr"),
        _holding(case, id="in-flat", country="IN", kind="asset", label="Flat in Hyderabad (not rented)", currency="INR", band="Over ₹1Cr"),
        HouseholdMember(case_id=case.id, name="Ananya Bose", role="primary", citizenship="Indian", visa_status="Green card"),
        HouseholdMember(case_id=case.id, name="Rohit Bose", role="spouse", citizenship="Indian", visa_status=None),
        Stay(case_id=case.id, country="IN", arrived="2025-12-20", departed="2026-01-05", source="Onboarding answer"),
    ])
    session.add(InitialScan(case_id=case.id, version="2026.11-draft", consent_saved=True, household="couple", confidence="medium",
                            answers={"need": "Moving back to India", "move_timing": "In the next 6 months", "years_abroad": "10 years or more"},
                            rows=[], missing=["Documents for income and accounts"], created_at=_ago(1, 21, 30)))
    convo = await _thread(session, case, "paid", _ago(1, 21))
    _msg(session, convo, "assistant", "Payment received: Full service for you and your spouse. Vikram Desai is your lead expert.", _ago(0, 9, 41))
    session.add(Assessment(case_id=case.id, headline="Initial assessment (calculated, awaiting documents)", status="draft", created_at=_ago(0, 9, 45)))
    return case, convo


# ───────────────────────────────────────────────────────── J5 · Rohan, assessment to review

async def _rohan(session: AsyncSession) -> tuple[Case, Conversation]:
    case = Case(
        name="Rohan Kapoor", client_name="Rohan Kapoor", status="active", jurisdictions="IN,US", case_captain=LEAD,
        plan="premium", phone="+91 98860 44120", demo_key="rohan", reviewers=REVIEWERS, activated_at=_ago(40),
        summary="Moved to Bengaluru in Aug 2025 after 11 years in the US; surrendered his green card in Sep 2025.",
        created_at=_ago(42), review_status="in_review",
    )
    session.add(case)
    await session.flush()
    passport = Document(case_id=case.id, filename="rohan-passport-stamps.pdf", doc_type="passport", status="reviewed", created_at=_ago(5),
                        extracted_json={"source": "Passport entry and exit stamps", "entries": [["Arrived", "2025-08-14"], ["Left", "2025-10-02"], ["Arrived", "2025-10-09"], ["Left", "2025-12-20"], ["Arrived", "2026-01-03"]]})
    form16 = Document(case_id=case.id, filename="Form16-FY2025-26.pdf", doc_type="form_16", status="reviewed", created_at=_ago(6))
    session.add_all([passport, form16])
    await session.flush()
    session.add_all([
        _fact(case, "left_india_on", "2014-06-01", "Onboarding answer", 40),
        _fact(case, "us_arrived_on", "2014-06-02", "Onboarding answer", 40),
        _fact(case, "us_departed_on", "2025-08-13", "Onboarding answer", 40),
        _fact(case, "green_card_from", "2016-03-01", "I-551 copy", 40),
        _fact(case, "green_card_until", "2025-09-10", "I-407 receipt", 40),
        _fact(case, "stated_days_in_india:FY 2025-26", "142", "Onboarding answer", 40),
        _holding(case, id="us-401k", country="US", kind="asset", label="401(k)", currency="USD", band="Over $250k", source="Fidelity statement"),
        _holding(case, id="us-rsu", country="US", kind="asset", label="Brokerage (RSUs)", currency="USD", band="$50–250k", source="E*TRADE 1099-B"),
        _holding(case, id="in-salary", country="IN", kind="income", label="Salary (Bengaluru)", currency="INR", band="₹25L–1Cr", source="Form 16"),
    ])
    for arrived, departed in (("2025-08-14", "2025-10-02"), ("2025-10-09", "2025-12-20"), ("2026-01-03", None)):
        session.add(Stay(case_id=case.id, country="IN", arrived=arrived, departed=departed, source="Passport stamps", document_id=passport.id))
    await _read(session, case, form16)
    session.add(Assessment(case_id=case.id, headline="FY 2025-26 residency and return plan", status="draft", created_at=_ago(1)))
    convo = await _thread(session, case, "paid", _ago(40))
    _msg(session, convo, "assistant", "Your passport pages are in. Vikram will review your assessment this week.", _ago(5))
    return case, convo


BUILDERS = {"arjun": _arjun, "preeti": _preeti, "ananya": _ananya, "rohan": _rohan}


async def reset(session: AsyncSession, key: str) -> tuple[Case, Conversation]:
    if key not in BUILDERS:
        raise KeyError(key)
    await _wipe(session, key)
    case, convo = await BUILDERS[key](session)
    await session.flush()
    await hni.enrich_persona(session, case)  # illustrative HNI picture, kept across resets
    await session.commit()
    return case, convo
