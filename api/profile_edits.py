"""Customer edits to their own profile, from the Profile page.

What the customer told us (answers, things said on WhatsApp, details the expert typed in
from a conversation) they can change themselves. What a document shows, what the expert
worked out or entered as a figure, and what is calculated stays locked: it changes when a
newer document arrives or the expert updates it. Every edit is kept as a confirmed change
with the old value, logged on the case, and given to the lead expert to check.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import ActionItem, Case, CaseEvent, Fact, HouseholdMember, ProfileChange
import evidence
import journeys

router = APIRouter()

LOCKED_PREFIX = ("holding:", "tax_estimate:", "days_in_india_", "previous_year_statuses")


def locked_reason(f: Fact) -> Optional[str]:
    """Why a fact can't be edited by the customer, or None if it can."""
    kind = (f.evidence or {}).get("kind") if isinstance(f.evidence, dict) else None
    if f.key.startswith(LOCKED_PREFIX):
        return "Worked out by Kiyos and your expert from your documents and travel"
    if kind == "document":
        title = (f.evidence.get("title") or f.evidence.get("filename") or f.source or "document").split(" · ")[0]
        return f"From your {title}. Send a newer one to change it"
    return None


def _now() -> datetime:
    return datetime.now(timezone.utc)


class EditIn(BaseModel):
    target: Literal["fact", "member"]
    id: int
    field: Optional[Literal["citizenship", "visa_status"]] = None  # for members
    value: str
    by: str


@router.post("/cases/{case_id}/profile-edits")
async def edit_profile(case_id: int, body: EditIn, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    value = body.value.strip()
    if not value:
        raise HTTPException(status_code=422, detail="Enter the new value")
    now = _now()

    if body.target == "fact":
        fact = await session.get(Fact, body.id)
        if not fact or fact.case_id != case_id:
            raise HTTPException(status_code=404, detail="Not on this profile")
        reason = locked_reason(fact)
        if reason:
            raise HTTPException(status_code=409, detail=reason)
        if value == fact.value:
            return {"changed": False}
        change = ProfileChange(case_id=case_id, fact_id=fact.id, fact_key=fact.key, previous_value=fact.value, proposed_value=value,
                               source="workspace", status="confirmed", decided_at=now, created_at=now)
        session.add(change)
        await session.flush()
        fact.value = value
        fact.source = "customer_confirmed"
        fact.as_of = now.date().isoformat()
        fact.evidence = {**evidence.said(change), "channel": "Profile"}
        label, before = journeys.FACT_LABELS.get(fact.key, fact.key.replace("_", " ")), change.previous_value
        await journeys.after_change_confirmed(session, change)
    else:
        m = await session.get(HouseholdMember, body.id)
        if not m or m.case_id != case_id or not body.field:
            raise HTTPException(status_code=404, detail="Not on this profile")
        before = getattr(m, body.field)
        if value == before:
            return {"changed": False}
        setattr(m, body.field, value)
        label = f"{m.name.split()[0]}'s {'citizenship' if body.field == 'citizenship' else 'visa'}"

    session.add(CaseEvent(case_id=case_id, actor=body.by, action="profile.edited", target_type="case", target_id=case_id,
                          detail={"label": label, "from": before, "to": value}, created_at=now))
    if body.target == "member" or label not in journeys.FACT_LABELS.values():
        session.add(ActionItem(case_id=case_id, title=f"Check the change to {label}: {before or 'blank'} → {value}", assignee="advisor",
                               status="open", owner=case.case_captain, due_date=(date.today() + timedelta(days=2)).isoformat(), created_at=now))
    await session.commit()
    return {"changed": True}
