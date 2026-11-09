"""Kiyos API — FastAPI app with SQLite data layer.

Endpoints:
  GET  /health
  GET  /cases
  GET  /cases/{id}
  GET  /cases/{id}/facts
  GET  /cases/{id}/assessments
  GET  /cases/{id}/audit
  GET  /conversations/{id}/messages
  POST /conversations/{id}/messages
  GET  /rules/{id}
"""

import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import init_db, get_session  # noqa: E402
from infra.schema import (  # noqa: E402
    Case,
    Fact,
    Document,
    Assessment,
    Conversation,
    Message,
    AiCall,
)


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
    updated_at: datetime

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
    conversation_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

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
    allow_origins=["http://localhost:3000"],
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
    result = await session.execute(select(Case).order_by(Case.updated_at.desc()))
    cases = result.scalars().all()
    return [
        CaseListItem(
            id=c.id,
            name=c.name,
            client_name=c.client_name,
            status=c.status,
            jurisdictions=c.jurisdictions,
            case_captain=c.case_captain,
            updated_at=c.updated_at,
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
            DocumentOut(id=d.id, filename=d.filename, doc_type=d.doc_type, status=d.status)
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
        conversation_id=convo_id,
    )


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
# Conversations — stub (no AI wired yet)
# ---------------------------------------------------------------------------

@app.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def list_messages(conv_id: int, session: AsyncSession = Depends(get_session)):
    convo = await session.get(Conversation, conv_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await session.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at)
    )
    return [
        MessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at)
        for m in result.scalars().all()
    ]


@app.post("/conversations/{conv_id}/messages", response_model=MessageOut)
async def send_message(
    conv_id: int, body: MessageIn, session: AsyncSession = Depends(get_session)
):
    convo = await session.get(Conversation, conv_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc)

    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=body.content,
        created_at=now,
    )
    session.add(user_msg)

    assistant_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=(
            "The converse service will be wired in week 4 — this is a stub. "
            f"You said: \"{body.content}\""
        ),
        created_at=now,
    )
    session.add(assistant_msg)

    await session.commit()
    await session.refresh(assistant_msg)

    return MessageOut(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        created_at=assistant_msg.created_at,
    )


# ---------------------------------------------------------------------------
# Rules — stub
# ---------------------------------------------------------------------------

@app.get("/rules/{rule_id}", response_model=RuleOut)
async def get_rule(rule_id: str):
    return RuleOut(
        id=rule_id,
        summary="Rule details coming soon",
        markdown=None,
    )
