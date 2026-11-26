"""Alerts on both sides of a case, read from the WhatsApp thread and the case records.

Customer: messages the expert sent (in their own name, or relayed by Kiyos for them)
that the customer hasn't read yet, plus what they have to do (confirm a change, send a
document, answer the expert's question). Opening Messages marks the messages read; the
to-dos stay until they're done.

Expert: a customer's reply to the expert, i.e. customer messages after the expert's last
message in the thread. It is new until an expert opens the case.

Nothing here is generated: an "expert message" is one whose author is the expert.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import ActionItem, Case, Conversation, DocumentRequest, Message, ProfileChange, Ticket

router = APIRouter()


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _from_expert(m: Message) -> bool:
    if m.role == "advisor":
        return True
    return m.role == "assistant" and bool(m.author) and m.author != "Kiyos"


def _expert_name(m: Message) -> str:
    a = m.author or "Your expert"
    return a[len("Kiyos for "):] if a.startswith("Kiyos for ") else a


async def _thread(session: AsyncSession, case_id: int) -> list[Message]:
    # The thread for the customer's journey (as main._current_conversation): staged threads first.
    convos = list((await session.execute(select(Conversation).where(Conversation.case_id == case_id))).scalars())
    pool = [c for c in convos if c.stage] or convos
    convo = max(pool, key=lambda c: c.id) if pool else None
    if not convo:
        return []
    return list((await session.execute(select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at, Message.id))).scalars())


class InboxMessage(BaseModel):
    id: int
    author: str
    content: str
    at: datetime


class InboxTodo(BaseModel):
    key: str
    kind: str  # confirm | upload | reply
    title: str
    due: Optional[str] = None
    href: str


class CustomerInbox(BaseModel):
    unread: list[InboxMessage]
    todos: list[InboxTodo]
    count: int


@router.get("/cases/{case_id}/inbox", response_model=CustomerInbox)
async def customer_inbox(case_id: int, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    msgs = await _thread(session, case_id)
    last_user = max((_aware(m.created_at) for m in msgs if m.role == "user"), default=None)
    read = _aware(case.customer_read_at)
    since = max([t for t in (last_user, read) if t], default=None)
    unread = [
        InboxMessage(id=m.id, author=_expert_name(m), content=m.content, at=m.created_at)
        for m in msgs
        if _from_expert(m) and (since is None or _aware(m.created_at) > since)
    ]

    todos: list[InboxTodo] = []
    changes = (await session.execute(select(ProfileChange).where(ProfileChange.case_id == case_id, ProfileChange.status == "proposed"))).scalars()
    for c in changes:
        todos.append(InboxTodo(key=f"change-{c.id}", kind="confirm", title=f"Confirm a change to your details", href="/portal/overview#h-todo"))
    reqs = list((await session.execute(select(DocumentRequest).where(DocumentRequest.case_id == case_id, DocumentRequest.status.in_(("pending", "rejected"))))).scalars())
    for r in reqs:
        todos.append(InboxTodo(key=f"req-{r.id}", kind="upload", title=(f"Send a new copy: {r.title}" if r.status == "rejected" else f"Send {r.title}"), due=r.due_date, href=f"/portal/documents?request={r.id}"))
    items = (await session.execute(select(ActionItem).where(ActionItem.case_id == case_id, ActionItem.assignee == "customer", ActionItem.status != "done"))).scalars()
    for i in items:
        if i.notes != "clarification" and any(r.title.lower() in i.title.lower() for r in reqs):
            continue
        todos.append(InboxTodo(key=f"item-{i.id}", kind="reply", title=i.title, due=i.due_date, href="/portal/messages"))
    todos.sort(key=lambda t: t.due or "9999")
    return CustomerInbox(unread=unread, todos=todos, count=len(unread) + len(todos))


@router.post("/cases/{case_id}/inbox/read")
async def mark_read(case_id: int, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.customer_read_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}


class Reply(BaseModel):
    case_id: int
    customer: str
    captain: str
    to_message: str  # what the expert had said
    texts: list[str]
    at: datetime
    new: bool
    asked: bool = False  # the customer's message is a question to the expert (an open ticket)


async def _asked_ids(session: AsyncSession, case_id: int) -> set[int]:
    rows = (await session.execute(select(Ticket.message_id).where(Ticket.case_id == case_id, Ticket.status == "open"))).scalars()
    return {m for m in rows if m}


def _replies(case: Case, msgs: list[Message], asked: set[int] | None = None) -> Optional[Reply]:
    last_expert = None
    for i, m in enumerate(msgs):
        if _from_expert(m):
            last_expert = i
    if last_expert is None:
        return None
    after = [m for m in msgs[last_expert + 1:] if m.role == "user"]
    if not after:
        return None
    seen = _aware(case.expert_seen_at)
    latest = _aware(after[-1].created_at)
    return Reply(
        case_id=case.id, customer=case.client_name, captain=case.case_captain,
        to_message=msgs[last_expert].content, texts=[m.content for m in after], at=after[-1].created_at,
        new=seen is None or latest > seen, asked=any(m.id in (asked or set()) for m in after),
    )


@router.get("/cases/{case_id}/replies", response_model=Optional[Reply])
async def case_replies(case_id: int, session: AsyncSession = Depends(get_session)):
    """The customer's reply to the expert on this case, if the expert hasn't written since."""
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return _replies(case, await _thread(session, case_id), await _asked_ids(session, case_id))


@router.get("/experts/inbox", response_model=list[Reply])
async def expert_inbox(expert: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """New replies from customers, newest first; only the signed-in expert's customers if given."""
    q = select(Case).where(Case.case_captain != "Unassigned")
    if expert:
        q = q.where(Case.case_captain == expert)
    out = []
    for case in (await session.execute(q)).scalars():
        r = _replies(case, await _thread(session, case.id), await _asked_ids(session, case.id))
        if r and r.new:
            out.append(r)
    out.sort(key=lambda r: _aware(r.at), reverse=True)
    return out


@router.post("/cases/{case_id}/expert-seen")
async def expert_seen(case_id: int, session: AsyncSession = Depends(get_session)):
    case = await session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.expert_seen_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}
