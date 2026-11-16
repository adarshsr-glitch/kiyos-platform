"""Demo journeys, seeded at API start-up so an existing kiyos.db picks them up.

  seed_journey()    case 1, Arjun Rao (paid): the WhatsApp thread that led him to each
                    workspace page, plus the records those messages point at.
  seed_prospects()  three customers earlier in the funnel, each with the WhatsApp thread
                    their stage produces:
                      Sanjay Patel  — mid-way through the five-minute scan (lead)
                      Neha Joshi    — scan saved last night, workspace not opened yet
                      Kavita Reddy  — free plan: two general answers, one personal
                                      question turned down with the plans
                      Rahul Gupta   — chose Full service, but the payment failed

Idempotent and additive: nothing is re-created if it already exists, and the legacy
seed conversations are never deleted.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from db import async_session
from infra.schema import (
    Case,
    CaseEvent,
    Conversation,
    Document,
    DocumentRequest,
    Fact,
    InitialScan,
    Message,
    ProfileChange,
    Ticket,
)
from services import converse, intake

CASE_ID = 1


def _at(days_ago: float, hour: int, minute: int = 0) -> datetime:
    """A time `days_ago` days back, at a given IST wall-clock time (stored as UTC)."""
    ist = timezone(timedelta(hours=5, minutes=30))
    d = (datetime.now(ist) - timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return d.astimezone(timezone.utc)


async def seed_journey() -> None:
    async with async_session() as session:
        case = await session.get(Case, CASE_ID)
        if not case:
            return
        existing = (await session.execute(
            select(Conversation).where(Conversation.case_id == CASE_ID, Conversation.stage.is_not(None))
        )).scalars().first()
        if existing:
            return

        lead = case.case_captain
        case.plan = "premium"
        case.phone = case.phone or "+91 98450 31207"
        case.activated_at = _at(41, 19, 5)
        case.plan_choice = {
            "offering": "full", "name": "Full service", "household": "individual",
            "price_inr": 47200, "price_usd": 502, "gst_included": True, "payment_method": "upi",
            "receipt": "KY-0001-260930", "nda_accepted_at": _at(41, 19, 4).isoformat(),
            "consent_at": _at(41, 19, 4).isoformat(),
        }
        case.reviewers = [
            {"name": lead, "role": "Lead tax expert", "country": "BOTH", "qualification": "CA, CPA"},
            {"name": "Meera Iyer", "role": "India reviewer", "country": "IN", "qualification": "Chartered Accountant"},
            {"name": "Daniel Brooks", "role": "US reviewer", "country": "US", "qualification": "Enrolled Agent"},
        ]
        case.country_status = {
            "IN": {
                "status": "RNOR", "label": "Resident but not ordinarily resident",
                "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31",
                "state": "Planning", "reviewed_by": "Meera Iyer",
            },
            "US": {
                "status": "Dual-status", "label": "Resident Jan–Jul, non-resident after the move",
                "year": "Tax year 2026", "filing": "Form 1040 + dual-status statement", "due": "2027-04-15",
                "state": "Collecting documents", "reviewed_by": "Daniel Brooks",
            },
        }

        session.add(InitialScan(
            case_id=CASE_ID, version="2026.11-draft", consent_saved=True, household="individual",
            confidence="medium",
            answers={
                "need": "Moving back to India", "move_timing": "In the next 6 months",
                "years_abroad": "10 years or more", "retirement": "Yes", "equity": "Yes",
                "india_funds": "No", "india_property": "Yes", "household": "Just me",
            },
            rows=[],
            missing=["Days spent in India in each of the last ten years"],
            created_at=_at(43, 21, 40),
        ))

        docs = {d.doc_type: d for d in (await session.execute(
            select(Document).where(Document.case_id == CASE_ID)
        )).scalars().all()}

        def req(title, why, country, doc_type, status="pending", due=None, doc=None):
            r = DocumentRequest(
                case_id=CASE_ID, title=title, why=why, country=country, doc_type=doc_type,
                status=status, due_date=due, document_id=doc.id if doc else None,
                created_at=_at(40, 10),
            )
            session.add(r)
            return r

        req("W-2 from Stripe (2026)", "Your US salary and tax withheld for the part of 2026 before the move.",
            "US", "W-2", "reviewed", doc=docs.get("W-2"))
        req("Fidelity 401(k) year-end statement", "Balances and contributions for planning the rollover and Form 10-EE.",
            "US", "401k_statement", "reviewed", doc=docs.get("401k_statement"))
        portfolio = req(
            "PortfolioAnalyzer export of your US ETFs",
            "Lets us check which ETFs count as PFICs before you become ordinarily resident in India.",
            "US", "portfolio_export", due="2026-11-20")
        schwab = req(
            "Schwab 1099-B for 2026",
            "Shows what you sold this year, so gains are split correctly between the US and India.",
            "US", "brokerage_statement", due="2027-02-28")
        req("Pune lease with your PAN stamped",
            "Lets us match the rent your tenant reports to the Indian tax department with what you declare.",
            "IN", "rental_agreement", "rejected", due="2026-11-30", doc=docs.get("rental_agreement")).rejection_reason = (
            "The copy we received has no PAN on it — please upload the stamped version.")
        req("Form 16 from Flipkart", "Your Indian salary and the tax your employer already deducted, for your ITR.",
            "IN", "form_16", due="2027-06-15")
        await session.flush()

        return_fact = (await session.execute(
            select(Fact).where(Fact.case_id == CASE_ID, Fact.key == "india_return_date")
        )).scalars().first()
        change = ProfileChange(
            case_id=CASE_ID, fact_id=return_fact.id if return_fact else None, fact_key="india_return_date",
            previous_value=return_fact.value if return_fact else None, proposed_value="2026-07-12",
            source="whatsapp", quote="Small correction — I actually landed in Bengaluru on 12 July, not the 15th.",
            affects="Adds three days in India to FY 2026-27. Your residency status is unlikely to change, but "
                    f"{lead} will recheck the day count once you confirm.",
            created_at=_at(3, 9, 12),
        )
        session.add(change)
        await session.flush()

        convo = Conversation(case_id=CASE_ID, title="WhatsApp", stage="paid", created_at=_at(41, 19, 5))
        session.add(convo)
        await session.flush()

        def msg(role, content, at, **kw):
            m = Message(conversation_id=convo.id, role=role, content=content, created_at=at,
                        author=kw.pop("author", "Kiyos" if role == "assistant" else None), **kw)
            session.add(m)
            return m

        msg("assistant", "Payment received — Full service, individual, ₹47,200 incl. GST. Your receipt, signed "
            "NDA and scope are in your workspace.", _at(41, 19, 5), confidence=1.0,
            action={"type": "overview", "label": "Open my workspace", "href": "/portal/dashboard"})
        msg("assistant", f"{lead} is your lead tax expert and owns your case. Meera Iyer (CA) reviews the India "
            "side and Daniel Brooks (EA) the US side. Questions that need an expert get a reply within one "
            "business day.", _at(41, 19, 6), confidence=1.0)
        msg("assistant", "Good news: your residency position for FY 2026-27 is reviewed and signed off — RNOR in "
            "India, dual-status in the US. The summary explains what it means for your US income.",
            _at(12, 11, 30), confidence=1.0,
            action={"type": "assessment", "label": "Read the signed-off summary", "href": "/portal/assessment"})
        msg("user", "Where do I send my Schwab 1099?", _at(9, 20, 14))
        msg("assistant", "Upload it straight to your secure workspace — it's already on your list, so it'll be "
            "matched automatically. Please don't send it here.", _at(9, 20, 14), confidence=1.0,
            action={"type": "upload", "label": "Upload Schwab 1099-B", "href": f"/portal/documents?request={schwab.id}"})
        msg("user", change.quote, _at(3, 9, 12))
        msg("assistant", "Thanks, Arjun. I've drafted that change to your residency history — please confirm it "
            f"in your workspace. {lead} will recheck your day count once you do.", _at(3, 9, 12),
            confidence=1.0,
            action={"type": "verify", "label": "Confirm 12 July", "href": f"/portal/verify?change={change.id}"})
        msg("assistant", "Reminder: we still need your PortfolioAnalyzer export to check your US ETFs for PFIC. "
            "It's due 20 Nov.", _at(1, 10, 0), confidence=1.0,
            action={"type": "upload", "label": "Upload the export", "href": f"/portal/documents?request={portfolio.id}"})
        msg("user", "Should I sell the ETFs now or wait until I'm resident?", _at(0, 9, 41))
        held = msg("assistant", "That's a judgement call on your own numbers, so I've passed it to "
                   f"{lead}. You'll get a reviewed answer here by tomorrow, 6pm IST.",
                   _at(0, 9, 41), confidence=0.35, routed=True)
        await session.flush()
        session.add(Ticket(
            case_id=CASE_ID, conversation_id=convo.id, message_id=held.id,
            question="Should I sell the ETFs now or wait until I'm resident?",
            draft_answer="Selling before ordinary residency keeps the gain out of Indian tax; PFIC treatment of "
                         "each ETF needs the PortfolioAnalyzer export first.",
            confidence=0.35, reason="Committing decision on the customer's own holdings (red tier).",
            owner=lead, sla_due_at=_at(-1, 18, 0), created_at=_at(0, 9, 41),
        ))
        await session.commit()


# ───────────────────────────────────────────────────────────── earlier in the funnel


class _Thread:
    """Writes a staged WhatsApp thread message by message, a couple of minutes apart."""

    def __init__(self, session, convo: Conversation, start: datetime):
        self.session, self.convo, self.at = session, convo, start

    def add(self, role: str, content: str, gap: float = 1.0, **kw) -> Message:
        self.at += timedelta(minutes=gap)
        m = Message(conversation_id=self.convo.id, role=role, content=content, created_at=self.at,
                    author="Kiyos" if role == "assistant" else None, **kw)
        self.session.add(m)
        return m

    def bot(self, bm: "intake.BotMessage", gap: float = 0.2) -> Message:
        return self.add("assistant", bm.content, gap, options=bm.options, action=bm.action, confidence=1.0)

    def intake(self, replies: list[str]) -> tuple[dict, dict | None]:
        """Play the real intake bot with these customer replies. Returns (state, scan)."""
        for bm in intake.opening_messages():
            self.bot(bm)
        state, scan = {"step": "question", "answers": {}}, None
        for text in replies:
            self.add("user", text, gap=0.6)
            state, result = intake.advance(state, text)
            scan = result.scan or scan
            for bm in result.messages:
                self.bot(bm)
        return state, scan


async def _prospect(session, client_name: str, **fields) -> Case | None:
    """The prospect's case, or None if it was seeded already."""
    exists = (await session.execute(select(Case).where(Case.client_name == client_name))).scalars().first()
    if exists:
        return None
    case = Case(client_name=client_name, jurisdictions="IN,US", case_captain="Unassigned", plan="free", **fields)
    session.add(case)
    await session.flush()
    return case


async def _staged(session, case: Case, stage: str, at: datetime, state: dict | None = None) -> _Thread:
    convo = Conversation(case_id=case.id, title="WhatsApp", stage=stage, intake=state, created_at=at)
    session.add(convo)
    await session.flush()
    return _Thread(session, convo, at)


def _save_scan(session, case: Case, answers: dict, scan: dict, at: datetime) -> None:
    session.add(InitialScan(
        case_id=case.id, version=scan["version"], answers=answers, rows=scan["rows"], missing=scan["missing"],
        confidence=scan["confidence"], household=scan["household"], consent_saved=True, created_at=at,
    ))


def _generic(question: str, remaining: int) -> str:
    """A free-plan general answer, as converse.answer_free words it (without the model)."""
    reply = converse._generic_from_knowledge(question)
    return (reply.content + "\n\nGeneral information only, not advice on your situation. "
            f"{remaining} free question{'s' if remaining != 1 else ''} left.")


async def seed_prospects() -> None:
    async with async_session() as session:
        # Sanjay: tapped the WhatsApp link this morning, three answers in.
        start = _at(0, 8, 50)
        sanjay = await _prospect(session, "Sanjay Patel", name="New WhatsApp enquiry", status="lead",
                                 phone="+1 425 555 0148", created_at=start, updated_at=start)
        if sanjay:
            t = await _staged(session, sanjay, "intake", start)
            state, _ = t.intake(["NRI with ties in India", "10 years or more", "Yes"])
            t.convo.intake = state

        # Neha: finished and saved the scan; the risk-map link leads to sign-in.
        start = _at(1, 22, 10)
        neha = await _prospect(session, "Neha Joshi", name="Neha Joshi — initial scan", status="lead",
                               phone="+1 512 555 0177", created_at=start, updated_at=start)
        if neha:
            t = await _staged(session, neha, "free", start)
            replies = ["US person in India", "2 to 9 years", "Yes", "Yes", "No", "No", "Just me",
                       intake.SAVE_YES, "Neha Joshi"]
            state, scan = t.intake(replies)
            t.convo.intake = state
            _save_scan(session, neha, state["answers"], scan, t.at)

        # Kavita: scan saved, signed in, used two of three free questions.
        start = _at(6, 20, 15)
        kavita = await _prospect(session, "Kavita Reddy", name="Kavita Reddy — initial scan", status="active",
                                 phone="+91 99001 77342", summary="Moved back to Hyderabad in March 2026 "
                                 "after 11 years in Seattle. Free plan; considering Full service.",
                                 created_at=start, updated_at=_at(1, 21, 5))
        if kavita:
            t = await _staged(session, kavita, "free", start)
            replies = ["Moving back to India", "Already moved this year", "10 years or more", "Yes", "Yes",
                       "No", "Yes", "Just me", intake.SAVE_YES, "Kavita Reddy"]
            state, scan = t.intake(replies)
            t.convo.intake = state
            _save_scan(session, kavita, state["answers"], scan, t.at)
            session.add(CaseEvent(case_id=kavita.id, actor="Kavita Reddy", action="workspace.signed_in",
                                  target_type="case", target_id=kavita.id, created_at=t.at + timedelta(minutes=3)))
            t.at = _at(4, 19, 30)
            t.add("user", "What is RNOR?", category="generic")
            t.add("assistant", _generic("What is RNOR?", 2), gap=0.2, confidence=0.85,
                  cited_rules=converse._generic_from_knowledge("What is RNOR?").cited_rules)
            t.at = _at(1, 21, 0)
            q = "Am I RNOR this year? I landed in Hyderabad on 4 March."
            pivot, category = await converse.answer_free(session, kavita, q, {"generic_used": 1, "generic_limit": 3})
            t.add("user", q, category=category)
            t.add("assistant", pivot.content, gap=0.2, confidence=1.0, action=pivot.action)
            q = "What does the RNOR 9-of-10 test check?"
            t.add("user", q, gap=2, category="generic")
            t.add("assistant", _generic(q, 1), gap=0.2, confidence=0.85,
                  cited_rules=converse._generic_from_knowledge(q).cited_rules)

        # Rahul: picked Full service for a couple; the card was declined at checkout.
        start = _at(3, 18, 40)
        rahul = await _prospect(session, "Rahul Gupta", name="Rahul Gupta — payment pending", status="active",
                                phone="+1 408 555 0192", summary="Moving back to Bengaluru in early 2027 with his "
                                "spouse; RSUs at a US employer. Payment for Full service failed.",
                                created_at=start, updated_at=_at(0, 10, 12))
        if rahul:
            t = await _staged(session, rahul, "free", start)
            replies = ["Moving back to India", "In the next 6 months", "10 years or more", "Yes", "Yes",
                       "Yes", "No", "With my spouse", intake.SAVE_YES, "Rahul Gupta"]
            state, scan = t.intake(replies)
            t.convo.intake = state
            _save_scan(session, rahul, state["answers"], scan, t.at)
            plan = next(p for p in intake.plans() if p["key"] == "full")
            attempted = _at(0, 10, 10)
            rahul.plan_choice = {
                "offering": "full", "name": plan["name"], "household": "couple",
                "price_inr": plan["couple_inr"], "price_usd": plan["couple_usd"], "gst_included": True,
                "payment_method": "card", "payment_status": "failed", "attempted_at": attempted.isoformat(),
                "failure_reason": "Declined by the card issuer. Nothing was charged.",
            }
            session.add(CaseEvent(case_id=rahul.id, actor="Rahul Gupta", action="payment.failed",
                                  target_type="case", target_id=rahul.id, created_at=attempted,
                                  detail={"label": f"Full service · couple · {intake.inr(plan['couple_inr'])}"}))
            t.at = attempted
            t.add("assistant", f"Your payment of {intake.inr(plan['couple_inr'])} for Full service didn't go "
                  "through — the card issuer declined it, and nothing was charged. Your plan choice is saved, "
                  "so you can try again with UPI, netbanking or another card.", gap=1, confidence=1.0,
                  action={"type": "plans", "label": "Retry payment", "href": "/portal/upgrade"})

        await session.commit()
