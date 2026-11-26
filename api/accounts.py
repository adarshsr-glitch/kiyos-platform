"""Accounts: customer sign-up on the web, and expert sign-in and sign-up.

Customers usually start on WhatsApp; the web form is the other front door. It checks the
details, refuses a number that already has an account (and points to sign-in), and starts the
same WhatsApp conversation the customer would have had. Experts sign in with their Kiyos work
email and a one-time code (prototype: any six digits), or sign up with a work email.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import Case, CaseEvent, Conversation, ExpertAccount, Message

router = APIRouter()
WORK_DOMAIN = "kiyos.example"
SEED_EXPERTS = [
    ("Vikram Desai", "vikram", "CA, EA", "Lead tax expert"),
    ("Sidhant Srivastava", "sidhant", "CA", "Lead tax expert"),
    ("Anjali Kapoor", "anjali", "CPA", "Tax expert"),
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


# ------------------------------------------------------------------ customers


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    country_code: Literal["+91", "+1"]
    number: str = Field(min_length=6, max_length=20)
    email: Optional[str] = Field(default=None, max_length=200)
    consent: bool


@router.post("/signup")
async def signup(body: SignupIn, session: AsyncSession = Depends(get_session)):
    from main import _bot_message  # noqa: PLC0415
    from services import intake

    name = " ".join(body.name.split())
    if not re.fullmatch(r"[A-Za-z][A-Za-z .'-]+", name):
        raise HTTPException(status_code=422, detail={"field": "name", "message": "Use letters only, as on your passport"})
    num = _digits(body.number)
    if not (len(num) == 10 if body.country_code == "+91" else len(num) == 10):
        raise HTTPException(status_code=422, detail={"field": "number", "message": "Enter a 10-digit WhatsApp number"})
    if body.email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", body.email):
        raise HTTPException(status_code=422, detail={"field": "email", "message": "That email doesn't look right"})
    if not body.consent:
        raise HTTPException(status_code=422, detail={"field": "consent", "message": "Please accept the terms to continue"})
    full = _digits(body.country_code) + num
    for c in (await session.execute(select(Case).where(Case.phone.is_not(None)))).scalars():
        if _digits(c.phone) == full:
            raise HTTPException(status_code=409, detail={"field": "number", "message": "This number already has a Kiyos account", "case_id": c.id})
    phone = f"{body.country_code} {num[:5]} {num[5:]}" if body.country_code == "+91" else f"+1 {num[:3]} {num[3:6]} {num[6:]}"
    case = Case(name="Web sign-up", client_name=name, status="lead", jurisdictions="IN,US", case_captain="Unassigned",
                plan="free", phone=phone, created_at=_now())
    session.add(case)
    await session.flush()
    convo = Conversation(case_id=case.id, title="WhatsApp", stage="intake", intake={"step": "question", "answers": {}}, created_at=_now())
    session.add(convo)
    await session.flush()
    first = name.split()[0]
    session.add(Message(conversation_id=convo.id, role="assistant", author="Kiyos", confidence=1.0, created_at=_now(),
                        content=f"Hi {first}, thanks for signing up on kiyos.app. Let's start your free check here."))
    for bm in intake.opening_messages():
        session.add(_bot_message(convo.id, bm))
    session.add(CaseEvent(case_id=case.id, actor=name, action="signup.web", target_type="case", target_id=case.id,
                          detail={"label": "Signed up on the web"}, created_at=_now()))
    await session.commit()
    return {"case_id": case.id, "phone": phone}


# ------------------------------------------------------------------ experts


async def seed_experts(session_factory) -> None:
    async with session_factory() as session:
        if (await session.execute(select(ExpertAccount))).scalars().first():
            return
        for name, handle, qual, role in SEED_EXPERTS:
            session.add(ExpertAccount(name=name, email=f"{handle}@{WORK_DOMAIN}", qualification=qual, role=role, created_at=_now()))
        await session.commit()


class ExpertOut(BaseModel):
    name: str
    email: str
    qualification: Optional[str]
    role: str


class EmailIn(BaseModel):
    email: str


async def _expert(session: AsyncSession, email: str) -> Optional[ExpertAccount]:
    return (await session.execute(select(ExpertAccount).where(ExpertAccount.email == email.strip().lower()))).scalars().first()


@router.post("/experts/sign-in/code")
async def expert_code(body: EmailIn, session: AsyncSession = Depends(get_session)):
    if not await _expert(session, body.email):
        raise HTTPException(status_code=404, detail="No expert account for this email. Sign up with your Kiyos work email.")
    return {"sent_to": body.email.strip().lower()}


class SignInIn(BaseModel):
    email: str
    code: str


@router.post("/experts/sign-in", response_model=ExpertOut)
async def expert_sign_in(body: SignInIn, session: AsyncSession = Depends(get_session)):
    e = await _expert(session, body.email)
    if not e:
        raise HTTPException(status_code=404, detail="No expert account for this email")
    if not re.fullmatch(r"\d{6}", body.code.strip()):
        raise HTTPException(status_code=422, detail="Enter the six-digit code")
    e.last_sign_in_at = _now()
    await session.commit()
    return ExpertOut(name=e.name, email=e.email, qualification=e.qualification, role=e.role)


class ExpertSignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    qualification: Literal["CA", "EA", "CPA", "CA, EA", "Other"]


@router.post("/experts/sign-up", response_model=ExpertOut)
async def expert_sign_up(body: ExpertSignupIn, session: AsyncSession = Depends(get_session)):
    email = body.email.strip().lower()
    if not email.endswith(f"@{WORK_DOMAIN}"):
        raise HTTPException(status_code=422, detail=f"Use your Kiyos work email (@{WORK_DOMAIN})")
    if await _expert(session, email):
        raise HTTPException(status_code=409, detail="This email already has an account. Sign in instead.")
    e = ExpertAccount(name=" ".join(body.name.split()), email=email, qualification=body.qualification, role="Tax expert", created_at=_now())
    session.add(e)
    await session.commit()
    return ExpertOut(name=e.name, email=e.email, qualification=e.qualification, role=e.role)
