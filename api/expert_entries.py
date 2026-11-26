"""What only the expert enters: this year's tax figures and ways to save.

Kiyos never works out tax and never suggests a way to save. The expert enters:
  - per country, the tax estimate for the year (liability, already paid or withheld, the
    return's due date, the next payment) with a line on what it is based on;
  - ways to save, each one of a fixed list of options set in law, with the expert's own
    reason, the amount it could save and by when.
Each entry records who entered it and when, so the customer's workspace can show "From
Sidhant, 18 Nov" and open that entry from its source icon. Every change is an event, so
it appears in "since your last visit".
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import evidence
from db import get_session
from infra.schema import Case, CaseEvent, Fact, Recommendation

router = APIRouter()

# The options a way to save can be. Names and the law they come from only: whether one
# applies, and what it could save, is the expert's call.
SAVING_OPTIONS: list[dict[str, str]] = [
    {"key": "in_54ec", "country": "IN", "title": "Put a property gain into 54EC bonds", "law": "Income-tax Act, s.54EC",
     "what": "Long-term gains from selling land or a building, invested in specified bonds within six months of the sale."},
    {"key": "in_54", "country": "IN", "title": "Reinvest a house sale in another house", "law": "Income-tax Act, s.54",
     "what": "Long-term gains from selling a residential house, reinvested in a residential house in India."},
    {"key": "in_54f", "country": "IN", "title": "Reinvest other long-term gains in a house", "law": "Income-tax Act, s.54F",
     "what": "Long-term gains from assets other than a house, with the full sale amount invested in a residential house."},
    {"key": "in_10ee", "country": "IN", "title": "File Form 10-EE for a US retirement account", "law": "Income-tax Act, s.89A; Form 10-EE",
     "what": "An election on how income in a specified foreign retirement account is taxed in India."},
    {"key": "in_regime", "country": "IN", "title": "Choose the old or new tax regime", "law": "Income-tax Act, s.115BAC",
     "what": "The choice between the regime with deductions and the one with lower slab rates."},
    {"key": "in_rnor_timing", "country": "IN", "title": "Time a sale within your RNOR years", "law": "Income-tax Act, s.6(6) and s.5",
     "what": "While resident but not ordinarily resident, income that arises outside India is generally outside Indian tax."},
    {"key": "in_80c", "country": "IN", "title": "Use deductions under section 80C", "law": "Income-tax Act, s.80C",
     "what": "Deductions for specified investments and payments, available under the old regime."},
    {"key": "us_ftc", "country": "US", "title": "Claim the foreign tax credit", "law": "Internal Revenue Code §901; Form 1116",
     "what": "A credit on the US return for income tax paid to another country on the same income."},
    {"key": "us_feie", "country": "US", "title": "Exclude foreign earned income", "law": "Internal Revenue Code §911; Form 2555",
     "what": "An exclusion for earned income while living abroad, if the residence or presence test is met."},
]
OPTION = {o["key"]: o for o in SAVING_OPTIONS}


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _case(session: AsyncSession, case_id: int) -> Case:
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


def _event(session: AsyncSession, case_id: int, actor: str, action: str, detail: dict) -> None:
    session.add(CaseEvent(case_id=case_id, actor=actor, action=action, target_type="case", target_id=case_id, detail=detail, created_at=_now()))


@router.get("/saving-options")
async def saving_options():
    return SAVING_OPTIONS


# ------------------------------------------------------------------ tax estimate


class EstimateIn(BaseModel):
    country: Literal["IN", "US"]
    year: str = Field(min_length=2, max_length=20)
    form: str = Field(default="", max_length=60)
    liability: float = Field(ge=0)
    withheld: float = Field(default=0, ge=0)
    due: Optional[date] = None
    next_payment_date: Optional[date] = None
    next_payment_amount: Optional[float] = Field(default=None, ge=0)
    basis: str = Field(default="", max_length=400)
    status: Literal["estimate", "reviewed"] = "estimate"
    by: str = Field(min_length=1, max_length=120)


@router.post("/cases/{case_id}/tax-estimate")
async def enter_tax_estimate(case_id: int, body: EstimateIn, session: AsyncSession = Depends(get_session)):
    """The expert's estimate for one country's tax year. Replaces the previous one."""
    await _case(session, case_id)
    key = f"tax_estimate:{body.country}"
    now = _now()
    data = {
        "country": body.country, "year": body.year, "form": body.form, "currency": "INR" if body.country == "IN" else "USD",
        "liability": body.liability, "withheld": body.withheld, "due": body.due.isoformat() if body.due else None,
        "next_payment": {"date": body.next_payment_date.isoformat(), "amount": body.next_payment_amount}
        if body.next_payment_date and body.next_payment_amount is not None else None,
        "status": body.status, "basis": body.basis or None, "entered_by": body.by, "entered_on": now.date().isoformat(),
    }
    fact = (await session.execute(select(Fact).where(Fact.case_id == case_id, Fact.key == key))).scalars().first()
    if fact:
        fact.value, fact.source = json.dumps(data, ensure_ascii=False), "Expert entry"
        fact.evidence = evidence.expert(body.by, now.isoformat())
    else:
        session.add(Fact(case_id=case_id, key=key, value=json.dumps(data, ensure_ascii=False), source="Expert entry",
                         evidence=evidence.expert(body.by, now.isoformat())))
    _event(session, case_id, body.by, "estimate.updated", {"label": f"{'India' if body.country == 'IN' else 'US'} tax estimate, {body.year}", "country": body.country})
    await session.commit()
    return data


# ------------------------------------------------------------------ ways to save


class SavingIn(BaseModel):
    option: str
    why: str = Field(min_length=10, max_length=800)
    amount: float = Field(gt=0)
    deadline: Optional[date] = None
    by: str = Field(min_length=1, max_length=120)


class SavingOut(BaseModel):
    id: int
    option: str
    title: str
    law: str
    what: str
    country: str
    why: Optional[str]
    amount: Optional[float]
    currency: Optional[str]
    deadline: Optional[str]
    author: str
    date: str
    status: str


def saving_out(r: Recommendation) -> SavingOut:
    o = OPTION.get(r.option or "", {})
    return SavingOut(id=r.id, option=r.option or "", title=o.get("title", r.content), law=o.get("law", ""), what=o.get("what", ""),
                     country=r.country or o.get("country", ""), why=r.rationale, amount=r.amount, currency=r.currency,
                     deadline=r.deadline, author=r.author, date=r.date, status=r.status)


@router.get("/cases/{case_id}/savings", response_model=list[SavingOut])
async def list_savings(case_id: int, session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Recommendation).where(
        Recommendation.case_id == case_id, Recommendation.option.is_not(None), Recommendation.status != "superseded"
    ).order_by(Recommendation.created_at.desc()))).scalars().all()
    return [saving_out(r) for r in rows]


@router.post("/cases/{case_id}/savings", response_model=SavingOut)
async def add_saving(case_id: int, body: SavingIn, session: AsyncSession = Depends(get_session)):
    await _case(session, case_id)
    o = OPTION.get(body.option)
    if not o:
        raise HTTPException(status_code=422, detail="Choose one of the listed options")
    r = Recommendation(case_id=case_id, author=body.by, content=o["title"], rationale=body.why.strip(), status="proposed",
                       date=date.today().isoformat(), option=body.option, country=o["country"], amount=body.amount,
                       currency="INR" if o["country"] == "IN" else "USD", deadline=body.deadline.isoformat() if body.deadline else None)
    session.add(r)
    await session.flush()
    _event(session, case_id, body.by, "saving.added", {"label": o["title"], "saving_id": r.id})
    await session.commit()
    return saving_out(r)


class WithdrawIn(BaseModel):
    by: str


@router.post("/savings/{saving_id}/withdraw", response_model=SavingOut)
async def withdraw_saving(saving_id: int, body: WithdrawIn, session: AsyncSession = Depends(get_session)):
    r = await session.get(Recommendation, saving_id)
    if not r or not r.option:
        raise HTTPException(status_code=404, detail="Not found")
    r.status = "superseded"
    _event(session, r.case_id, body.by, "saving.withdrawn", {"label": r.content, "saving_id": r.id})
    await session.commit()
    return saving_out(r)
