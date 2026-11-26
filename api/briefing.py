"""Since your last visit: what the expert (and Kiyos) did on the case since the customer
last opened their workspace.

Everything is read from records that already exist: tickets (Kiyos's draft answer vs the
expert's final answer), the case event trail (documents accepted or sent back), document
requests, signed-off assessments and settled tax questions. Nothing is generated: an answer
counts as "corrected" only when the expert's answer differs from the draft Kiyos wrote.

A visit is a run of page loads less than 30 minutes apart. `prev_seen_at` is the start of
the visit before the current one, which is what "since your last visit" means.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import Assessment, Case, CaseEvent, Document, DocumentRequest, Recommendation, TaxTopic, Ticket

router = APIRouter()

VISIT_GAP = timedelta(minutes=30)
# With no earlier visit on record, look back this far.
FIRST_LOOKBACK = timedelta(days=14)
UNGROUNDED = "i don't have a grounded answer"


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _norm(s: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


class VisitOut(BaseModel):
    since: datetime
    first_visit: bool


@router.post("/cases/{case_id}/visit", response_model=VisitOut)
async def record_visit(case_id: int, session: AsyncSession = Depends(get_session)):
    """Called when the customer opens their Overview. Returns the start of the previous visit."""
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    now = datetime.now(timezone.utc)
    last = _aware(case.last_seen_at)
    if last is None or now - last > VISIT_GAP:
        # A new visit: the one that just ended becomes "your last visit".
        case.prev_seen_at = last
    case.last_seen_at = now
    prev = _aware(case.prev_seen_at)
    await session.commit()
    if prev:
        return VisitOut(since=prev, first_visit=False)
    # First visit on record: the last two weeks, including anything from before the plan
    # started (questions answered during the free assessment are still news).
    return VisitOut(since=now - FIRST_LOOKBACK, first_visit=True)


class BriefItem(BaseModel):
    kind: str  # corrected | confirmed | answered | document_accepted | document_returned | request | signed_off | settled | estimate | saving
    at: datetime
    actor: Optional[str] = None
    title: str
    detail: Optional[str] = None
    before: Optional[str] = None  # for a correction: what Kiyos had said
    href: Optional[str] = None


class BriefingOut(BaseModel):
    since: datetime
    items: list[BriefItem]
    recent: list[BriefItem]  # the latest few overall, shown when nothing is new


@router.get("/cases/{case_id}/briefing", response_model=BriefingOut)
async def briefing(case_id: int, since: datetime, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    since = _aware(since)
    out: list[BriefItem] = []

    tickets = (await session.execute(select(Ticket).where(Ticket.case_id == case_id, Ticket.status == "resolved"))).scalars().all()
    for t in tickets:
        if not t.resolved_at or not t.resolution or _norm(t.resolution).startswith(_norm(UNGROUNDED)):
            continue  # closed without a real answer: nothing to tell the customer
        grounded = bool(t.draft_answer) and not _norm(t.draft_answer).startswith(_norm(UNGROUNDED))
        if not grounded:
            kind, before = "answered", None
        elif _norm(t.draft_answer) == _norm(t.resolution):
            kind, before = "confirmed", None
        else:
            kind, before = "corrected", t.draft_answer
        out.append(BriefItem(kind=kind, at=_aware(t.resolved_at), actor=t.resolved_by, title=t.question,
                             detail=t.resolution, before=before, href="#h-captain"))

    docs = (await session.execute(select(Document).where(Document.case_id == case_id))).scalars().all()
    reqs = (await session.execute(select(DocumentRequest).where(DocumentRequest.case_id == case_id))).scalars().all()
    events = (await session.execute(select(CaseEvent).where(
        CaseEvent.case_id == case_id, CaseEvent.action.in_(["document.accepted", "document.rejected"])))).scalars().all()
    for e in events:
        label = (e.detail or {}).get("label") or "a document"
        doc = next((d for d in docs if d.filename == label), None)
        req = next((r for r in reqs if r.title == label), None)
        doc_id = doc.id if doc else (req.document_id if req else None)
        accepted = e.action == "document.accepted"
        out.append(BriefItem(kind="document_accepted" if accepted else "document_returned", at=_aware(e.created_at), actor=e.actor,
                             title=label, detail=None if accepted else (req.rejection_reason if req else None),
                             href=f"/portal/documents?doc={doc_id}" if doc_id else "/portal/documents"))

    for e in (await session.execute(select(CaseEvent).where(
            CaseEvent.case_id == case_id, CaseEvent.action.in_(["estimate.updated", "saving.added"])))).scalars().all():
        d = e.detail or {}
        if e.action == "estimate.updated":
            out.append(BriefItem(kind="estimate", at=_aware(e.created_at), actor=e.actor, title=d.get("label", "Tax estimate"), href="/portal/tax-position"))
        else:
            rec = await session.get(Recommendation, d.get("saving_id") or 0)
            if not rec or rec.status == "superseded":
                continue  # withdrawn since: nothing to tell the customer
            out.append(BriefItem(kind="saving", at=_aware(e.created_at), actor=e.actor, title=d.get("label", "A way to save"), href="/portal/overview#h-save"))

    for r in reqs:
        if r.status == "pending":
            out.append(BriefItem(kind="request", at=_aware(r.created_at), actor=case.case_captain, title=r.title, detail=r.why,
                                 href=f"/portal/documents?request={r.id}"))

    for a in (await session.execute(select(Assessment).where(Assessment.case_id == case_id, Assessment.status == "signed_off"))).scalars().all():
        out.append(BriefItem(kind="signed_off", at=_aware(a.updated_at), actor=case.case_captain, title=a.headline, href="/portal/tax-position"))

    for t in (await session.execute(select(TaxTopic).where(TaxTopic.case_id == case_id, TaxTopic.status == "resolved"))).scalars().all():
        # Settling a question is the expert's call, whoever owned the next step.
        out.append(BriefItem(kind="settled", at=_aware(t.updated_at), actor=case.case_captain, title=t.title,
                             detail=t.conclusion, href="/portal/tax-position"))

    out.sort(key=lambda i: i.at, reverse=True)
    new = [i for i in out if i.at >= since]
    return BriefingOut(since=since, items=new, recent=[] if new else out[:3])
