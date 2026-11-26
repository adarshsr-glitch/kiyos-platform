"""Magic links: secure, time-limited links sent on WhatsApp.

- Sign-in links (15 minutes): every workspace link Kiyos sends in WhatsApp ("Open my risk map",
  "Upload documents", "Open my workspace") carries a token. Opening it signs the customer in and
  takes them straight to that page, without a one-time code. After it expires, the customer can
  ask for a new one on WhatsApp or sign in with a code.
- Payment links (24 hours): created when the customer continues to payment. The page opens
  pre-filled with their details and the plan they chose. A link that has been paid shows the
  confirmation; an expired one can be renewed.

Tokens are added to outgoing messages in one place (a flush hook on Message), so every sender
(intake, the agent, activation, experts' requests) gets them without changes of its own.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from db import get_session
from infra.schema import Case, CaseEvent, Conversation, MagicLink, Message

router = APIRouter()

SIGNIN_TTL = timedelta(minutes=15)
PAY_TTL = timedelta(hours=24)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def new_token() -> str:
    return secrets.token_urlsafe(18)


# ------------------------------------------------------------------ tokens on outgoing WhatsApp links


@event.listens_for(Session, "before_flush")
def _tokenise_links(session: Session, _ctx, _instances) -> None:
    """Every new Kiyos message that links into the workspace gets its own sign-in link."""
    for obj in list(session.new):
        if not isinstance(obj, Message) or obj.role not in ("assistant", "advisor"):
            continue
        action = obj.action or {}
        href = action.get("href") or ""
        if not href.startswith("/portal/") or action.get("type") == "document" or action.get("token"):
            continue
        with session.no_autoflush:
            convo = session.get(Conversation, obj.conversation_id)
        if not convo:
            continue
        token = new_token()
        session.add(MagicLink(token=token, case_id=convo.case_id, purpose="signin", target=href,
                              expires_at=_now() + SIGNIN_TTL, created_at=_now()))
        obj.action = {**action, "href": f"/m/{token}", "target": href, "token": token,
                      "expires_at": (_now() + SIGNIN_TTL).isoformat()}


# ------------------------------------------------------------------ reading a link


class LinkOut(BaseModel):
    status: Literal["valid", "expired", "used", "invalid"]
    purpose: Optional[str] = None
    case_id: Optional[int] = None
    client_name: Optional[str] = None
    phone: Optional[str] = None
    target: Optional[str] = None
    expires_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    payload: Optional[dict] = None
    token: Optional[str] = None


def _mask(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    parts = phone.split()
    code = parts[0] if parts and parts[0].startswith("+") else ""
    return f"{code} ••••• {phone.replace(' ', '')[-4:]}".strip()


async def _load(session: AsyncSession, token: str) -> tuple[Optional[MagicLink], Optional[Case]]:
    link = (await session.execute(select(MagicLink).where(MagicLink.token == token))).scalars().first()
    if not link:
        return None, None
    return link, await session.get(Case, link.case_id)


def _status(link: MagicLink) -> str:
    if link.purpose == "pay" and link.used_at:
        return "used"
    return "expired" if _aware(link.expires_at) < _now() else "valid"


def _out(link: Optional[MagicLink], case: Optional[Case]) -> LinkOut:
    if not link or not case:
        return LinkOut(status="invalid")
    return LinkOut(status=_status(link), purpose=link.purpose, case_id=case.id, client_name=case.client_name,
                   phone=_mask(case.phone), target=link.target, expires_at=link.expires_at, used_at=link.used_at,
                   payload=link.payload, token=link.token)


@router.get("/magic-links/{token}", response_model=LinkOut)
async def read_link(token: str, session: AsyncSession = Depends(get_session)):
    return _out(*(await _load(session, token)))


@router.post("/magic-links/{token}/open", response_model=LinkOut)
async def open_link(token: str, session: AsyncSession = Depends(get_session)):
    """Open a sign-in link: signs the customer in (first time turns the lead into an account)."""
    link, case = await _load(session, token)
    out = _out(link, case)
    if out.status != "valid" or link.purpose != "signin":
        return out
    link.opened_count = (link.opened_count or 0) + 1
    if case.status == "lead":
        case.status = "active"
        session.add(CaseEvent(case_id=case.id, actor=case.client_name, action="workspace.signed_in", target_type="case",
                              target_id=case.id, detail={"label": "Signed in from a WhatsApp link"}, created_at=_now()))
    await session.commit()
    return out


@router.post("/magic-links/{token}/renew", response_model=LinkOut)
async def renew_link(token: str, session: AsyncSession = Depends(get_session)):
    """An expired link: send a fresh one on WhatsApp for the same page."""
    link, case = await _load(session, token)
    if not link or not case:
        raise HTTPException(status_code=404, detail="Link not found")
    convo = (await session.execute(select(Conversation).where(Conversation.case_id == case.id).order_by(Conversation.id.desc()))).scalars().first()
    fresh = MagicLink(token=new_token(), case_id=case.id, purpose=link.purpose, target=link.target, payload=link.payload,
                      expires_at=_now() + (PAY_TTL if link.purpose == "pay" else SIGNIN_TTL), created_at=_now())
    session.add(fresh)
    if convo:
        href = f"/pay/{fresh.token}" if link.purpose == "pay" else f"/m/{fresh.token}"
        session.add(Message(conversation_id=convo.id, role="assistant", author="Kiyos", confidence=1.0, created_at=_now(),
                            content="Here's a fresh link. " + ("It works for 24 hours." if link.purpose == "pay" else "It works for 15 minutes."),
                            action={"type": link.purpose, "label": "Complete payment" if link.purpose == "pay" else "Open my workspace",
                                    "href": href, "target": link.target, "token": fresh.token, "expires_at": fresh.expires_at.isoformat()}))
    await session.commit()
    return _out(fresh, case)


# ------------------------------------------------------------------ payment links


class PayLinkIn(BaseModel):
    offering: Literal["advisory", "full"]
    household: Literal["individual", "couple"]
    payment_method: Literal["upi", "card", "netbanking"]
    scope_confirmed: bool
    nda_accepted: bool
    consent: bool


@router.post("/cases/{case_id}/pay-links", response_model=LinkOut)
async def create_pay_link(case_id: int, body: PayLinkIn, session: AsyncSession = Depends(get_session)):
    """The customer's chosen plan, as a secure payment link (also sent on WhatsApp)."""
    from services import intake

    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if not (body.scope_confirmed and body.nda_accepted and body.consent):
        raise HTTPException(status_code=422, detail="Confirm the scope, NDA and consent to continue")
    plan = next(p for p in intake.plans() if p["key"] == body.offering)
    payload = {**body.model_dump(), "name": plan["name"], "price_inr": plan[f"{body.household}_inr"]}
    link = MagicLink(token=new_token(), case_id=case_id, purpose="pay", target="/portal/overview", payload=payload,
                     expires_at=_now() + PAY_TTL, created_at=_now())
    session.add(link)
    convo = (await session.execute(select(Conversation).where(Conversation.case_id == case_id).order_by(Conversation.id.desc()))).scalars().first()
    if convo:
        session.add(Message(conversation_id=convo.id, role="assistant", author="Kiyos", confidence=1.0, created_at=_now(),
                            content=f"Your secure payment link for {plan['name']} ({body.household}), {intake.inr(payload['price_inr'])} incl. GST. It works for 24 hours.",
                            action={"type": "pay", "label": "Complete payment", "href": f"/pay/{link.token}", "token": link.token,
                                    "expires_at": link.expires_at.isoformat()}))
    session.add(CaseEvent(case_id=case_id, actor=case.client_name, action="payment.link_created", target_type="case", target_id=case_id,
                          detail={"label": f"{plan['name']} · {body.household}"}, created_at=_now()))
    await session.commit()
    return _out(link, case)


class PayIn(BaseModel):
    payment_method: Optional[Literal["upi", "card", "netbanking"]] = None


@router.post("/pay-links/{token}/pay", response_model=LinkOut)
async def pay(token: str, body: PayIn, session: AsyncSession = Depends(get_session)):
    """Prototype gateway: the payment succeeds; the plan is activated as on any success."""
    from main import ActivateIn, activate_plan

    link, case = await _load(session, token)
    out = _out(link, case)
    if out.status != "valid" or link.purpose != "pay":
        raise HTTPException(status_code=410, detail={"valid": "", "expired": "This payment link has expired", "used": "Already paid", "invalid": "Link not found"}[out.status] or "Not a payment link")
    p = dict(link.payload or {})
    if body.payment_method:
        p["payment_method"] = body.payment_method
    link.used_at = _now()
    link.payload = {**p, "paid_at": link.used_at.isoformat()}
    await session.flush()
    if case.demo_key == "demo-wa-arjun":
        # Recording demo only (scripts/demo_stage.py): the WhatsApp copy of Arjun stands in for
        # the real Arjun Rao, so paying opens his established workspace instead of a new one.
        real = (await session.execute(select(Case).where(Case.client_name == case.client_name, Case.id != case.id, Case.plan == "premium").order_by(Case.id))).scalars().first()
        await session.commit()
        if real:
            return _out(link, real)
    await activate_plan(case.id, ActivateIn(offering=p["offering"], household=p["household"], payment_method=p["payment_method"],
                                            scope_confirmed=True, nda_accepted=True, consent=True), session)
    return _out(link, case)
