"""Kiyos API — FastAPI app with SQLite data layer.

Endpoints:
  GET  /health
  GET  /cases
  GET  /cases/{id}
  GET  /cases/{id}/facts
  GET  /cases/{id}/assessments
  GET  /cases/{id}/audit
  GET  /cases/{id}/members
  GET  /cases/{id}/topics
  GET  /cases/{id}/recommendations
  GET  /cases/{id}/action-items
  GET  /cases/{id}/notices
  GET  /cases/{id}/scenarios
  GET  /dashboard/stats
  GET  /dashboard/activity
  GET  /cases/{id}/tickets
  GET  /cases/{id}/events
  POST /cases/{id}/verify
  POST /cases/{id}/documents
  POST /cases/{id}/call-requests
  GET  /conversations/{id}
  GET  /conversations/{id}/messages
  POST /conversations/{id}/messages
  POST /conversations/{id}/advisor-messages
  POST /conversations/{id}/takeover
  POST /conversations/{id}/handback
  GET  /tickets
  POST /tickets/{id}/resolve
  POST /assessments/{id}/review
  GET  /rules/{id}
"""

import hashlib
import os
import re
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, Any

from fastapi import FastAPI, HTTPException, Depends, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import dotenv_values  # noqa: E402

# Pick up AI settings from the project .env without letting its relative
# DATABASE_URL override the db.py default.
for _key, _value in dotenv_values(os.path.join(os.path.dirname(__file__), "..", ".env")).items():
    if _key in ("ANTHROPIC_API_KEY", "MODEL_REASONING", "CONFIDENCE_THRESHOLD") and _value:
        os.environ.setdefault(_key, _value)

from db import init_db, get_session  # noqa: E402
from infra.schema import (  # noqa: E402
    Case,
    Fact,
    Document,
    Assessment,
    Conversation,
    Message,
    AiCall,
    HouseholdMember,
    TaxTopic,
    Recommendation,
    ActionItem,
    Notice,
    Scenario,
    Ticket,
    CaseEvent,
)
from engine.rules import load_rule  # noqa: E402
from services import converse  # noqa: E402


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class FactOut(BaseModel):
    id: int
    key: str
    value: str
    unit: Optional[str] = None
    source: Optional[str] = None
    as_of: Optional[str] = None

class DocumentOut(BaseModel):
    id: int
    filename: str
    doc_type: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

class DerivationStep(BaseModel):
    rule_id: str
    summary: str
    inputs_used: Optional[dict] = None
    output: Optional[object] = None

class AssessmentOut(BaseModel):
    id: int
    headline: str
    amount: Optional[float] = None
    currency: Optional[str] = None
    status: str
    derivation_trail: Optional[list[DerivationStep]] = None
    created_at: datetime
    updated_at: datetime

class CaseListItem(BaseModel):
    id: int
    name: str
    client_name: str
    status: str
    jurisdictions: Optional[str] = None
    case_captain: str
    arrival_date: Optional[str] = None
    tax_year: Optional[str] = None
    updated_at: datetime
    # computed badges for the list row
    open_items_count: int = 0
    open_topics_count: int = 0
    open_notices_count: int = 0


class MemberOut(BaseModel):
    id: int
    name: str
    role: str
    citizenship: Optional[str] = None
    visa_status: Optional[str] = None
    dob: Optional[str] = None
    notes: Optional[str] = None


class TopicOut(BaseModel):
    id: int
    topic_key: str
    title: str
    india_position: Optional[str] = None
    us_position: Optional[str] = None
    conclusion: Optional[str] = None
    confidence: str
    status: str
    next_action: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None


class RecommendationOut(BaseModel):
    id: int
    topic_id: Optional[int] = None
    author: str
    content: str
    rationale: Optional[str] = None
    status: str
    date: str


class ActionItemOut(BaseModel):
    id: int
    title: str
    assignee: str
    status: str
    due_date: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class NoticeOut(BaseModel):
    id: int
    authority: str
    subject: str
    received_at: str
    deadline: Optional[str] = None
    status: str
    response_filed_at: Optional[str] = None


class ScenarioOut(BaseModel):
    id: int
    label: str
    assumptions: Optional[list[Any]] = None
    results: Optional[list[Any]] = None
    recommended: bool


class CaseDetail(BaseModel):
    id: int
    name: str
    client_name: str
    status: str
    summary: Optional[str] = None
    jurisdictions: Optional[str] = None
    case_captain: str
    arrival_date: Optional[str] = None
    tax_year: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    facts: list[FactOut] = []
    documents: list[DocumentOut] = []
    assessments: list[AssessmentOut] = []
    members: list[MemberOut] = []
    topics: list[TopicOut] = []
    recommendations: list[RecommendationOut] = []
    action_items: list[ActionItemOut] = []
    notices: list[NoticeOut] = []
    scenarios: list[ScenarioOut] = []
    conversation_id: Optional[int] = None
    profile_confirmed_at: Optional[datetime] = None
    plan: str = "premium"

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    author: Optional[str] = None
    confidence: Optional[float] = None
    routed: bool = False
    cited_rules: Optional[list[str]] = None
    category: Optional[str] = None
    action: Optional[dict] = None
    created_at: datetime

    @classmethod
    def of(cls, m: "Message") -> "MessageOut":
        return cls(
            id=m.id, role=m.role, content=m.content, author=m.author,
            confidence=m.confidence, routed=bool(m.routed),
            cited_rules=m.cited_rules, category=m.category, action=m.action,
            created_at=m.created_at,
        )

class MessageIn(BaseModel):
    content: str

class RuleOut(BaseModel):
    id: str
    summary: str
    markdown: Optional[str] = None

class AiCallOut(BaseModel):
    id: int
    service: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    created_at: datetime


class DashboardStats(BaseModel):
    open_cases: int
    awaiting_signoff: int
    open_action_items: int
    open_notices: int
    cases_this_week: int
    assessments_total: int
    ai_calls_last_7d: int
    open_tickets: int = 0
    tickets_overdue: int = 0
    captain_workload: list[dict]       # [{"captain": str, "count": int}]


class ActivityEntry(BaseModel):
    at: datetime
    case_id: int
    case_name: str
    client_name: str
    actor: str
    verb: str
    object: str


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data/documents", exist_ok=True)
    await init_db()
    yield


app = FastAPI(
    title="Kiyos API",
    description="Cross-border tax platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/cases", response_model=list[CaseListItem])
async def list_cases(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Case)
        .options(
            selectinload(Case.action_items),
            selectinload(Case.topics),
            selectinload(Case.notices),
        )
        .order_by(Case.updated_at.desc())
    )
    cases = result.scalars().all()
    return [
        CaseListItem(
            id=c.id,
            name=c.name,
            client_name=c.client_name,
            status=c.status,
            jurisdictions=c.jurisdictions,
            case_captain=c.case_captain,
            arrival_date=c.arrival_date,
            tax_year=c.tax_year,
            updated_at=c.updated_at,
            open_items_count=sum(1 for i in c.action_items if i.status != "done"),
            open_topics_count=sum(1 for t in c.topics if t.status != "resolved"),
            open_notices_count=sum(1 for n in c.notices if n.status != "resolved"),
        )
        for c in cases
    ]


@app.get("/cases/{case_id}", response_model=CaseDetail)
async def get_case(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Case)
        .where(Case.id == case_id)
        .options(
            selectinload(Case.facts),
            selectinload(Case.documents),
            selectinload(Case.assessments),
            selectinload(Case.conversations),
            selectinload(Case.members),
            selectinload(Case.topics),
            selectinload(Case.recommendations),
            selectinload(Case.action_items),
            selectinload(Case.notices),
            selectinload(Case.scenarios),
        )
    )
    case = result.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    convo_id = case.conversations[0].id if case.conversations else None

    return CaseDetail(
        id=case.id,
        name=case.name,
        client_name=case.client_name,
        status=case.status,
        summary=case.summary,
        jurisdictions=case.jurisdictions,
        case_captain=case.case_captain,
        arrival_date=case.arrival_date,
        tax_year=case.tax_year,
        created_at=case.created_at,
        updated_at=case.updated_at,
        facts=[
            FactOut(id=f.id, key=f.key, value=f.value, unit=f.unit, source=f.source, as_of=f.as_of)
            for f in case.facts
        ],
        documents=[
            DocumentOut(
                id=d.id, filename=d.filename, doc_type=d.doc_type,
                status=d.status, created_at=d.created_at,
            )
            for d in case.documents
        ],
        assessments=[
            AssessmentOut(
                id=a.id,
                headline=a.headline,
                amount=a.amount,
                currency=a.currency,
                status=a.status,
                derivation_trail=(
                    [DerivationStep(**step) for step in a.derivation_trail]
                    if a.derivation_trail
                    else None
                ),
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in case.assessments
        ],
        members=[
            MemberOut(
                id=m.id, name=m.name, role=m.role, citizenship=m.citizenship,
                visa_status=m.visa_status, dob=m.dob, notes=m.notes,
            )
            for m in case.members
        ],
        topics=[
            TopicOut(
                id=t.id, topic_key=t.topic_key, title=t.title,
                india_position=t.india_position, us_position=t.us_position,
                conclusion=t.conclusion, confidence=t.confidence,
                status=t.status, next_action=t.next_action,
                owner=t.owner, due_date=t.due_date,
            )
            for t in case.topics
        ],
        recommendations=[
            RecommendationOut(
                id=r.id, topic_id=r.topic_id, author=r.author,
                content=r.content, rationale=r.rationale,
                status=r.status, date=r.date,
            )
            for r in case.recommendations
        ],
        action_items=[
            ActionItemOut(
                id=i.id, title=i.title, assignee=i.assignee, status=i.status,
                due_date=i.due_date, owner=i.owner, notes=i.notes,
            )
            for i in case.action_items
        ],
        notices=[
            NoticeOut(
                id=n.id, authority=n.authority, subject=n.subject,
                received_at=n.received_at, deadline=n.deadline,
                status=n.status, response_filed_at=n.response_filed_at,
            )
            for n in case.notices
        ],
        scenarios=[
            ScenarioOut(
                id=s.id, label=s.label, assumptions=s.assumptions,
                results=s.results, recommended=s.recommended,
            )
            for s in case.scenarios
        ],
        conversation_id=convo_id,
        profile_confirmed_at=case.profile_confirmed_at,
        plan=case.plan or "premium",
    )


# ---------------------------------------------------------------------------
# Per-case child-list endpoints
# ---------------------------------------------------------------------------

@app.get("/cases/{case_id}/members", response_model=list[MemberOut])
async def list_case_members(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(HouseholdMember).where(HouseholdMember.case_id == case_id))
    return [
        MemberOut(
            id=m.id, name=m.name, role=m.role, citizenship=m.citizenship,
            visa_status=m.visa_status, dob=m.dob, notes=m.notes,
        )
        for m in result.scalars().all()
    ]


@app.get("/cases/{case_id}/topics", response_model=list[TopicOut])
async def list_case_topics(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TaxTopic).where(TaxTopic.case_id == case_id))
    return [
        TopicOut(
            id=t.id, topic_key=t.topic_key, title=t.title,
            india_position=t.india_position, us_position=t.us_position,
            conclusion=t.conclusion, confidence=t.confidence,
            status=t.status, next_action=t.next_action,
            owner=t.owner, due_date=t.due_date,
        )
        for t in result.scalars().all()
    ]


@app.get("/cases/{case_id}/recommendations", response_model=list[RecommendationOut])
async def list_case_recommendations(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Recommendation).where(Recommendation.case_id == case_id).order_by(Recommendation.date.desc())
    )
    return [
        RecommendationOut(
            id=r.id, topic_id=r.topic_id, author=r.author,
            content=r.content, rationale=r.rationale,
            status=r.status, date=r.date,
        )
        for r in result.scalars().all()
    ]


@app.get("/cases/{case_id}/action-items", response_model=list[ActionItemOut])
async def list_case_action_items(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ActionItem).where(ActionItem.case_id == case_id))
    return [
        ActionItemOut(
            id=i.id, title=i.title, assignee=i.assignee, status=i.status,
            due_date=i.due_date, owner=i.owner, notes=i.notes,
        )
        for i in result.scalars().all()
    ]


@app.get("/cases/{case_id}/notices", response_model=list[NoticeOut])
async def list_case_notices(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Notice).where(Notice.case_id == case_id))
    return [
        NoticeOut(
            id=n.id, authority=n.authority, subject=n.subject,
            received_at=n.received_at, deadline=n.deadline,
            status=n.status, response_filed_at=n.response_filed_at,
        )
        for n in result.scalars().all()
    ]


@app.get("/cases/{case_id}/scenarios", response_model=list[ScenarioOut])
async def list_case_scenarios(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.case_id == case_id))
    return [
        ScenarioOut(
            id=s.id, label=s.label, assumptions=s.assumptions,
            results=s.results, recommended=s.recommended,
        )
        for s in result.scalars().all()
    ]


# ---------------------------------------------------------------------------
# Dashboard aggregates
# ---------------------------------------------------------------------------

@app.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(session: AsyncSession = Depends(get_session)):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Open cases
    open_cases = (await session.execute(
        select(func.count(Case.id)).where(Case.status == "active")
    )).scalar_one()

    # Cases updated this week
    cases_this_week = (await session.execute(
        select(func.count(Case.id)).where(Case.updated_at >= seven_days_ago)
    )).scalar_one()

    # Open action items
    open_items = (await session.execute(
        select(func.count(ActionItem.id)).where(ActionItem.status != "done")
    )).scalar_one()

    # Open notices
    open_notices = (await session.execute(
        select(func.count(Notice.id)).where(Notice.status != "resolved")
    )).scalar_one()

    # Assessments in review or draft (awaiting sign-off)
    awaiting_signoff = (await session.execute(
        select(func.count(Assessment.id)).where(
            Assessment.status.in_(["draft", "in_review"])
        )
    )).scalar_one()

    # Total assessments
    assessments_total = (await session.execute(
        select(func.count(Assessment.id))
    )).scalar_one()

    # Recent AI calls
    ai_calls_7d = (await session.execute(
        select(func.count(AiCall.id)).where(AiCall.created_at >= seven_days_ago)
    )).scalar_one()

    open_tickets = (await session.execute(
        select(func.count(Ticket.id)).where(Ticket.status != "resolved")
    )).scalar_one()
    tickets_overdue = (await session.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status != "resolved", Ticket.sla_due_at < datetime.now(timezone.utc)
        )
    )).scalar_one()

    # Workload by captain
    captain_rows = (await session.execute(
        select(Case.case_captain, func.count(Case.id))
        .where(Case.status == "active")
        .group_by(Case.case_captain)
    )).all()

    return DashboardStats(
        open_cases=open_cases,
        awaiting_signoff=awaiting_signoff,
        open_action_items=open_items,
        open_notices=open_notices,
        cases_this_week=cases_this_week,
        assessments_total=assessments_total,
        ai_calls_last_7d=ai_calls_7d,
        open_tickets=open_tickets,
        tickets_overdue=tickets_overdue,
        captain_workload=[{"captain": r[0], "count": r[1]} for r in captain_rows],
    )


@app.get("/dashboard/activity", response_model=list[ActivityEntry])
async def dashboard_activity(session: AsyncSession = Depends(get_session)):
    # Union-of-recent across cases, documents, assessments, messages, notices.
    cases = (await session.execute(
        select(Case).order_by(Case.updated_at.desc()).limit(20)
    )).scalars().all()
    case_by_id = {c.id: c for c in cases}

    entries: list[ActivityEntry] = []

    # Case updated
    for c in cases:
        entries.append(ActivityEntry(
            at=c.updated_at, case_id=c.id, case_name=c.name,
            client_name=c.client_name, actor=c.case_captain,
            verb="updated", object="case summary",
        ))

    # Recent documents
    docs = (await session.execute(
        select(Document).order_by(Document.created_at.desc()).limit(10)
    )).scalars().all()
    for d in docs:
        c = case_by_id.get(d.case_id)
        if not c:
            continue
        entries.append(ActivityEntry(
            at=d.created_at, case_id=c.id, case_name=c.name,
            client_name=c.client_name, actor="system",
            verb="extracted" if d.status == "extracted" else "received", object=d.filename,
        ))

    # Recent assessments
    assess = (await session.execute(
        select(Assessment).order_by(Assessment.created_at.desc()).limit(10)
    )).scalars().all()
    for a in assess:
        c = case_by_id.get(a.case_id)
        if not c:
            continue
        entries.append(ActivityEntry(
            at=a.created_at, case_id=c.id, case_name=c.name,
            client_name=c.client_name, actor="agent",
            verb="generated", object=a.headline,
        ))

    # Recent notices
    notices = (await session.execute(
        select(Notice).order_by(Notice.created_at.desc()).limit(10)
    )).scalars().all()
    for n in notices:
        c = case_by_id.get(n.case_id)
        if not c:
            continue
        entries.append(ActivityEntry(
            at=n.created_at, case_id=c.id, case_name=c.name,
            client_name=c.client_name, actor=n.authority,
            verb="sent", object=n.subject,
        ))

    # Human and workflow actions (sign-off, verify, upload, takeover…)
    events = (await session.execute(
        select(CaseEvent).order_by(CaseEvent.created_at.desc()).limit(15)
    )).scalars().all()
    for ev in events:
        c = case_by_id.get(ev.case_id)
        if not c:
            continue
        verb, obj = _describe_event(ev)
        entries.append(ActivityEntry(
            at=ev.created_at, case_id=c.id, case_name=c.name,
            client_name=c.client_name, actor=ev.actor, verb=verb, object=obj,
        ))

    entries.sort(key=lambda e: _aware(e.at), reverse=True)
    return entries[:15]


@app.get("/cases/{case_id}/facts", response_model=list[FactOut])
async def list_case_facts(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Fact).where(Fact.case_id == case_id))
    return [
        FactOut(id=f.id, key=f.key, value=f.value, unit=f.unit, source=f.source, as_of=f.as_of)
        for f in result.scalars().all()
    ]


@app.get("/cases/{case_id}/assessments", response_model=list[AssessmentOut])
async def list_case_assessments(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Assessment).where(Assessment.case_id == case_id))
    return [
        AssessmentOut(
            id=a.id,
            headline=a.headline,
            amount=a.amount,
            currency=a.currency,
            status=a.status,
            derivation_trail=(
                [DerivationStep(**step) for step in a.derivation_trail]
                if a.derivation_trail
                else None
            ),
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in result.scalars().all()
    ]


@app.get("/cases/{case_id}/audit", response_model=list[AiCallOut])
async def list_case_audit(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AiCall).where(AiCall.case_id == case_id).order_by(AiCall.created_at.desc())
    )
    return [
        AiCallOut(
            id=a.id,
            service=a.service,
            model=a.model,
            prompt_tokens=a.prompt_tokens,
            completion_tokens=a.completion_tokens,
            latency_ms=a.latency_ms,
            created_at=a.created_at,
        )
        for a in result.scalars().all()
    ]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


_EVENT_TEXT = {
    "assessment.signed_off": ("signed off", "assessment"),
    "assessment.changes_requested": ("requested changes on", "assessment"),
    "profile.confirmed": ("confirmed", "profile details"),
    "document.uploaded": ("uploaded", "document"),
    "conversation.takeover": ("took over", "conversation"),
    "conversation.handback": ("handed back", "conversation to the agent"),
    "ticket.created": ("raised", "expert-review ticket"),
    "ticket.resolved": ("resolved", "expert-review ticket"),
    "call.requested": ("requested", "advisor call"),
    "plan.changed": ("switched", "plan"),
}


def _describe_event(ev: CaseEvent) -> tuple[str, str]:
    verb, obj = _EVENT_TEXT.get(ev.action, (ev.action, ev.target_type or ""))
    label = (ev.detail or {}).get("label")
    return verb, f"{obj}: {label}" if label else obj


def _record_event(
    session: AsyncSession, case_id: int, actor: str, action: str,
    target_type: str | None = None, target_id: int | None = None, detail: dict | None = None,
) -> None:
    session.add(CaseEvent(
        case_id=case_id, actor=actor, action=action,
        target_type=target_type, target_id=target_id, detail=detail, created_at=_now(),
    ))


async def _load_case_full(session: AsyncSession, case_id: int) -> Case:
    result = await session.execute(
        select(Case).where(Case.id == case_id).options(
            selectinload(Case.facts), selectinload(Case.documents),
            selectinload(Case.assessments), selectinload(Case.members),
            selectinload(Case.topics), selectinload(Case.action_items),
            selectinload(Case.notices),
        )
    )
    case = result.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


# ---------------------------------------------------------------------------
# Conversations — customer Q&A, confidence routing, advisor takeover
# ---------------------------------------------------------------------------

TICKET_SLA = timedelta(hours=24)


class FreeUsage(BaseModel):
    generic_used: int
    generic_limit: int
    messages_used: int
    messages_limit: int


class ConversationState(BaseModel):
    id: int
    case_id: int
    controller: Literal["agent", "advisor"]
    controller_name: Optional[str] = None
    plan: str = "premium"
    usage: Optional[FreeUsage] = None   # free plan only
    messages: list[MessageOut]


class SendResult(BaseModel):
    messages: list[MessageOut]          # new messages created by this request, in order
    conversation: ConversationState


class AdvisorMessageIn(BaseModel):
    content: str
    advisor: str
    mode: Literal["direct", "via_agent"] = "direct"


class AdvisorIn(BaseModel):
    advisor: str


async def _get_conversation(session: AsyncSession, conv_id: int) -> Conversation:
    convo = await session.get(Conversation, conv_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


async def _conversation_state(session: AsyncSession, convo: Conversation) -> ConversationState:
    result = await session.execute(
        select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at, Message.id)
    )
    messages = result.scalars().all()
    case = await session.get(Case, convo.case_id)
    plan = (case.plan if case else None) or "premium"
    return ConversationState(
        id=convo.id, case_id=convo.case_id,
        controller=convo.controller or "agent", controller_name=convo.controller_name,
        plan=plan,
        usage=FreeUsage(**converse.free_usage([m.category for m in messages])) if plan == "free" else None,
        messages=[MessageOut.of(m) for m in messages],
    )


@app.get("/conversations/{conv_id}", response_model=ConversationState)
async def get_conversation(conv_id: int, session: AsyncSession = Depends(get_session)):
    return await _conversation_state(session, await _get_conversation(session, conv_id))


@app.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def list_messages(conv_id: int, session: AsyncSession = Depends(get_session)):
    return (await _conversation_state(session, await _get_conversation(session, conv_id))).messages


@app.post("/conversations/{conv_id}/messages", response_model=SendResult)
async def send_message(conv_id: int, body: MessageIn, session: AsyncSession = Depends(get_session)):
    """Customer message. The agent answers unless an advisor has taken over the thread."""
    convo = await _get_conversation(session, conv_id)
    text = body.content.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Empty message")

    history = (await session.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at, Message.id)
    )).scalars().all()

    case_row = await session.get(Case, convo.case_id)
    free = (case_row.plan if case_row else "premium") == "free"
    usage = converse.free_usage([m.category for m in history]) if free else None
    if usage and usage["messages_used"] >= usage["messages_limit"]:
        raise HTTPException(status_code=402, detail="Free conversation limit reached — choose a plan to continue")

    safe_text, guard_reply = converse.guard_sensitive(text)
    user_msg = Message(conversation_id=conv_id, role="user", content=safe_text, created_at=_now())
    session.add(user_msg)
    await session.flush()
    created = [user_msg]

    if guard_reply is not None:
        reply = guard_reply
    elif free:
        reply, user_msg.category = await converse.answer_free(session, case_row, safe_text, usage)
    elif convo.controller == "advisor":
        reply = None  # the advisor answers in person
    else:
        case = await _load_case_full(session, convo.case_id)
        reply = await converse.answer(session, case, list(history), safe_text)

    if reply is not None:
        assistant_msg = Message(
            conversation_id=conv_id, role="assistant", content=reply.content, author="Kiyos",
            confidence=reply.confidence, routed=reply.route, cited_rules=reply.cited_rules or None,
            action=reply.action, created_at=_now(),
        )
        session.add(assistant_msg)
        await session.flush()
        created.append(assistant_msg)

        if reply.route:
            case = await session.get(Case, convo.case_id)
            ticket = Ticket(
                case_id=convo.case_id, conversation_id=conv_id, message_id=user_msg.id,
                question=safe_text, draft_answer=reply.draft, confidence=reply.confidence,
                reason=(reply.reason or "").strip() or None, cited_rules=reply.cited_rules or None,
                owner=case.case_captain if case else None, sla_due_at=_now() + TICKET_SLA,
                created_at=_now(),
            )
            session.add(ticket)
            await session.flush()
            _record_event(session, convo.case_id, "agent", "ticket.created", "ticket", ticket.id,
                          {"label": safe_text[:80], "confidence": reply.confidence})

    await session.commit()
    state = await _conversation_state(session, convo)
    return SendResult(messages=[MessageOut.of(m) for m in created], conversation=state)


@app.post("/conversations/{conv_id}/advisor-messages", response_model=SendResult)
async def send_advisor_message(conv_id: int, body: AdvisorMessageIn, session: AsyncSession = Depends(get_session)):
    """Advisor reply: 'direct' posts in the advisor's name; 'via_agent' has Kiyos relay it."""
    convo = await _get_conversation(session, conv_id)
    text = body.content.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Empty message")

    if body.mode == "via_agent":
        case = await session.get(Case, convo.case_id)
        content = await converse.rephrase_for_customer(session, case, body.advisor, text)
        msg = Message(conversation_id=conv_id, role="assistant", content=content,
                      author=f"Kiyos for {body.advisor}", confidence=1.0, created_at=_now())
    else:
        msg = Message(conversation_id=conv_id, role="advisor", content=text,
                      author=body.advisor, created_at=_now())
    session.add(msg)
    await session.commit()
    state = await _conversation_state(session, convo)
    return SendResult(messages=[MessageOut.of(msg)], conversation=state)


async def _set_controller(session: AsyncSession, conv_id: int, advisor: str, takeover: bool) -> ConversationState:
    convo = await _get_conversation(session, conv_id)
    if takeover and convo.controller == "advisor" and convo.controller_name != advisor:
        raise HTTPException(status_code=409, detail=f"{convo.controller_name} already has this thread")
    convo.controller = "advisor" if takeover else "agent"
    convo.controller_name = advisor if takeover else None
    note = (
        f"{advisor}, your case captain, has joined the conversation."
        if takeover else
        f"{advisor} has handed the conversation back to Kiyos. Ask me anything."
    )
    session.add(Message(conversation_id=conv_id, role="system", content=note, author=advisor, created_at=_now()))
    _record_event(session, convo.case_id, advisor,
                  "conversation.takeover" if takeover else "conversation.handback",
                  "conversation", conv_id)
    await session.commit()
    return await _conversation_state(session, convo)


@app.post("/conversations/{conv_id}/takeover", response_model=ConversationState)
async def takeover_conversation(conv_id: int, body: AdvisorIn, session: AsyncSession = Depends(get_session)):
    return await _set_controller(session, conv_id, body.advisor, takeover=True)


@app.post("/conversations/{conv_id}/handback", response_model=ConversationState)
async def handback_conversation(conv_id: int, body: AdvisorIn, session: AsyncSession = Depends(get_session)):
    return await _set_controller(session, conv_id, body.advisor, takeover=False)


# ---------------------------------------------------------------------------
# Tickets — expert gate for low-confidence or committing questions
# ---------------------------------------------------------------------------

class TicketOut(BaseModel):
    id: int
    case_id: int
    client_name: Optional[str] = None
    conversation_id: Optional[int] = None
    question: str
    draft_answer: Optional[str] = None
    confidence: float
    reason: Optional[str] = None
    cited_rules: Optional[list[str]] = None
    status: str
    owner: Optional[str] = None
    sla_due_at: Optional[datetime] = None
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class TicketResolveIn(BaseModel):
    advisor: str
    answer: Optional[str] = None    # sent to the customer when present
    note: Optional[str] = None      # internal resolution note when not replying


def _ticket_out(t: Ticket, client_name: str | None = None) -> TicketOut:
    return TicketOut(
        id=t.id, case_id=t.case_id, client_name=client_name, conversation_id=t.conversation_id,
        question=t.question, draft_answer=t.draft_answer, confidence=t.confidence,
        reason=t.reason, cited_rules=t.cited_rules, status=t.status, owner=t.owner,
        sla_due_at=t.sla_due_at, resolution=t.resolution, resolved_by=t.resolved_by,
        resolved_at=t.resolved_at, created_at=t.created_at,
    )


@app.get("/tickets", response_model=list[TicketOut])
async def list_tickets(status: Optional[str] = "open", session: AsyncSession = Depends(get_session)):
    query = select(Ticket, Case.client_name).join(Case, Case.id == Ticket.case_id).order_by(Ticket.created_at.desc())
    if status:
        query = query.where(Ticket.status == status)
    return [_ticket_out(t, name) for t, name in (await session.execute(query)).all()]


@app.get("/cases/{case_id}/tickets", response_model=list[TicketOut])
async def list_case_tickets(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Ticket).where(Ticket.case_id == case_id).order_by(Ticket.created_at.desc())
    )
    return [_ticket_out(t) for t in result.scalars().all()]


@app.post("/tickets/{ticket_id}/resolve", response_model=TicketOut)
async def resolve_ticket(ticket_id: int, body: TicketResolveIn, session: AsyncSession = Depends(get_session)):
    ticket = await session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status == "resolved":
        raise HTTPException(status_code=409, detail="Ticket already resolved")
    answer = (body.answer or "").strip()
    if answer and ticket.conversation_id:
        session.add(Message(conversation_id=ticket.conversation_id, role="advisor",
                            content=answer, author=body.advisor, created_at=_now()))
    ticket.status = "resolved"
    ticket.resolution = answer or (body.note or "").strip() or None
    ticket.resolved_by = body.advisor
    ticket.resolved_at = _now()
    _record_event(session, ticket.case_id, body.advisor, "ticket.resolved", "ticket", ticket.id,
                  {"label": ticket.question[:80], "replied": bool(answer)})
    await session.commit()
    return _ticket_out(ticket)


# ---------------------------------------------------------------------------
# Assessment review — sign off / request changes (M5.8)
# ---------------------------------------------------------------------------

class ReviewIn(BaseModel):
    action: Literal["sign_off", "request_changes"]
    reviewer: str
    note: Optional[str] = None


class CaseEventOut(BaseModel):
    id: int
    case_id: int
    actor: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    detail: Optional[dict] = None
    created_at: datetime


@app.post("/assessments/{assessment_id}/review", response_model=AssessmentOut)
async def review_assessment(assessment_id: int, body: ReviewIn, session: AsyncSession = Depends(get_session)):
    a = await session.get(Assessment, assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if a.status == "signed_off":
        raise HTTPException(status_code=409, detail="Assessment is already signed off")
    if body.action == "request_changes" and not (body.note or "").strip():
        raise HTTPException(status_code=422, detail="Say what needs to change")
    a.status = "signed_off" if body.action == "sign_off" else "changes_requested"
    _record_event(
        session, a.case_id, body.reviewer,
        "assessment.signed_off" if body.action == "sign_off" else "assessment.changes_requested",
        "assessment", a.id, {"label": a.headline, "note": (body.note or "").strip() or None},
    )
    await session.commit()
    await session.refresh(a)
    return AssessmentOut(
        id=a.id, headline=a.headline, amount=a.amount, currency=a.currency, status=a.status,
        derivation_trail=[DerivationStep(**s) for s in a.derivation_trail] if a.derivation_trail else None,
        created_at=a.created_at, updated_at=a.updated_at,
    )


@app.get("/cases/{case_id}/events", response_model=list[CaseEventOut])
async def list_case_events(case_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CaseEvent).where(CaseEvent.case_id == case_id).order_by(CaseEvent.created_at.desc())
    )
    return [
        CaseEventOut(
            id=e.id, case_id=e.case_id, actor=e.actor, action=e.action, target_type=e.target_type,
            target_id=e.target_id, detail=e.detail, created_at=e.created_at,
        )
        for e in result.scalars().all()
    ]


# ---------------------------------------------------------------------------
# Verify and confirm — customer confirms the pre-filled profile (M4)
# ---------------------------------------------------------------------------

class FactEdit(BaseModel):
    id: int
    value: str


class VerifyIn(BaseModel):
    confirmed_by: str
    facts: list[FactEdit] = []


@app.post("/cases/{case_id}/verify", response_model=CaseDetail)
async def verify_profile(case_id: int, body: VerifyIn, session: AsyncSession = Depends(get_session)):
    case = await _load_case_full(session, case_id)
    by_id = {f.id: f for f in case.facts}
    changes = []
    for edit in body.facts:
        fact = by_id.get(edit.id)
        if not fact:
            raise HTTPException(status_code=422, detail=f"Fact {edit.id} is not on this case")
        new_value = edit.value.strip()
        if new_value and new_value != fact.value:
            changes.append({"key": fact.key, "from": fact.value, "to": new_value})
            fact.value = new_value
            fact.source = "customer_confirmed"
    now = _now()
    case.profile_confirmed_at = now
    _record_event(session, case_id, body.confirmed_by, "profile.confirmed", "case", case_id,
                  {"label": f"{len(changes)} change(s)" if changes else "no changes", "changes": changes})
    await session.commit()
    return await get_case(case_id, session)


# ---------------------------------------------------------------------------
# Documents — secure upload into the workspace (M3.2)
# ---------------------------------------------------------------------------

DOCUMENTS_DIR = os.path.abspath(os.getenv(
    "DOCUMENTS_DIR", os.path.join(os.path.dirname(__file__), "..", "data", "documents")
))
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_UPLOADS = {
    ".pdf": b"%PDF",
    ".png": b"\x89PNG",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}


@app.post("/cases/{case_id}/documents", response_model=DocumentOut)
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None),
    uploaded_by: str = Form("customer"),
    session: AsyncSession = Depends(get_session),
):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    original = os.path.basename(file.filename or "upload")
    ext = os.path.splitext(original)[1].lower()
    if ext not in ALLOWED_UPLOADS:
        raise HTTPException(status_code=415, detail="Upload a PDF, JPG or PNG")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Files must be 25 MB or smaller")
    if not data.startswith(ALLOWED_UPLOADS[ext]):
        raise HTTPException(status_code=415, detail="File contents don't match its type")

    digest = hashlib.sha256(data).hexdigest()
    duplicate = (await session.execute(
        select(Document).where(Document.case_id == case_id, Document.sha256 == digest)
    )).scalars().first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f"Already received as {duplicate.filename}")

    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", original)[:120]
    case_dir = os.path.join(DOCUMENTS_DIR, f"case_{case_id}")
    os.makedirs(case_dir, exist_ok=True)
    path = os.path.join(case_dir, f"{digest[:12]}_{safe_name}")
    with open(path, "wb") as fh:
        fh.write(data)

    doc = Document(
        case_id=case_id, filename=safe_name, doc_type=doc_type or None, status="received",
        file_path=path, sha256=digest, size_bytes=len(data), created_at=_now(),
    )
    session.add(doc)
    await session.flush()
    _record_event(session, case_id, uploaded_by, "document.uploaded", "document", doc.id,
                  {"label": safe_name, "doc_type": doc_type})
    await session.commit()
    return DocumentOut(id=doc.id, filename=doc.filename, doc_type=doc.doc_type,
                       status=doc.status, created_at=doc.created_at)


# ---------------------------------------------------------------------------
# Plan entitlement (M2.4). The prototype has no payments: the portal sets the
# plan when the customer finishes onboarding (free) or upgrades (premium).
# ---------------------------------------------------------------------------

class PlanIn(BaseModel):
    plan: Literal["free", "premium"]


@app.post("/cases/{case_id}/plan", response_model=CaseDetail)
async def set_plan(case_id: int, body: PlanIn, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.plan != body.plan:
        case.plan = body.plan
        _record_event(session, case_id, "customer", "plan.changed", "case", case_id, {"label": body.plan})
        await session.commit()
    return await get_case(case_id, session)


# ---------------------------------------------------------------------------
# Advisor call — customer books the included quarterly 30-minute call
# ---------------------------------------------------------------------------

class CallRequestIn(BaseModel):
    slot: str          # ISO datetime chosen by the customer
    requested_by: str


@app.post("/cases/{case_id}/call-requests", response_model=ActionItemOut)
async def request_call(case_id: int, body: CallRequestIn, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    try:
        slot = datetime.fromisoformat(body.slot)
    except ValueError:
        raise HTTPException(status_code=422, detail="slot must be an ISO datetime")
    label = slot.strftime("%a %d %b, %H:%M")
    item = ActionItem(
        case_id=case_id, title=f"Quarterly 30-min call with {body.requested_by} — {label}",
        assignee="advisor", status="open", due_date=slot.date().isoformat(),
        owner=case.case_captain, notes=f"Requested by {body.requested_by} via the portal; confirm the invite.",
    )
    session.add(item)
    await session.flush()
    _record_event(session, case_id, body.requested_by, "call.requested", "action_item", item.id, {"label": label})
    await session.commit()
    return ActionItemOut(id=item.id, title=item.title, assignee=item.assignee, status=item.status,
                         due_date=item.due_date, owner=item.owner, notes=item.notes)


# ---------------------------------------------------------------------------
# Rules — read from the knowledge layer
# ---------------------------------------------------------------------------

@app.get("/rules/{rule_id}", response_model=RuleOut)
async def get_rule(rule_id: str):
    rule = load_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    explainer = rule.explainer_path
    return RuleOut(
        id=rule.id,
        summary=rule.summary.strip(),
        markdown=explainer.read_text() if explainer.exists() else None,
    )
