"""Agent memory: what Kiyos uses for each reply, per customer.

Each reply is built from the case state (read through tools, never from memory), the last 20
messages, and a summary of anything older. The summary is rebuilt in the background whenever
the conversation grows past the recent window, so a long chat never loses its beginning.
The same summary is what the expert sees in the thread ("What Kiyos uses to reply").
Facts never come from the summary: amounts, dates and statuses are always read from the case.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import Case, Conversation, DocumentRequest, Message, Ticket

router = APIRouter()
RECENT = 20


def _day(dt: datetime | None) -> str:
    return dt.strftime("%-d %b") if dt else ""


def summarise(case: Case, older: list[Message]) -> str | None:
    """A plain summary of the messages before the recent window. Who said what, not facts."""
    msgs = [m for m in older if m.role != "system"]
    if not msgs:
        return None
    first = case.client_name.split()[0]
    asked = [m.content.strip().split("\n")[0] for m in msgs if m.role == "user" and "?" in m.content]
    answered = sum(1 for m in msgs if m.role == "assistant")
    experts = sorted({m.author for m in msgs if m.role == "advisor" and m.author})
    links = [m.action.get("label") for m in msgs if m.role == "assistant" and isinstance(m.action, dict) and m.action.get("label")]
    parts = [f"{len(msgs)} earlier messages, {_day(msgs[0].created_at)} to {_day(msgs[-1].created_at)}."]
    if asked:
        shown = "; ".join(f"“{q[:70]}{'…' if len(q) > 70 else ''}”" for q in asked[:3])
        parts.append(f"{first} asked {len(asked)} question{'s' if len(asked) != 1 else ''}: {shown}{' and more' if len(asked) > 3 else ''}.")
    parts.append(f"Kiyos replied {answered} time{'s' if answered != 1 else ''}" + (f" and sent links to {', '.join(dict.fromkeys(links))}." if links else "."))
    if experts:
        parts.append(f"{' and '.join(experts)} wrote in the thread.")
    return " ".join(parts)


async def context_for(session: AsyncSession, convo: Conversation) -> dict[str, Any]:
    case = await session.get(Case, convo.case_id)
    msgs = list((await session.execute(select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at, Message.id))).scalars())
    older, recent = msgs[:-RECENT] if len(msgs) > RECENT else [], msgs[-RECENT:]
    reqs = (await session.execute(select(DocumentRequest).where(DocumentRequest.case_id == case.id))).scalars().all()
    tickets = (await session.execute(select(Ticket).where(Ticket.case_id == case.id, Ticket.status == "open"))).scalars().all()
    india = (case.country_status or {}).get("IN", {}).get("label") if case.country_status else None
    state = [
        ("Plan", "Paid" if case.plan == "premium" and case.activated_at else "Free"),
        ("Expert", case.case_captain if case.case_captain not in (None, "", "Unassigned", "demo") else "Not assigned yet"),
        ("Stage", convo.stage or "—"),
        ("India status this year", india or "Not calculated yet"),
        ("Documents still needed", str(sum(1 for r in reqs if r.status in ("pending", "rejected")))),
        ("Questions with the expert", str(len(tickets))),
    ]
    return {
        "case_state": [{"label": k, "value": v} for k, v in state],
        "recent": len(recent),
        "older": len(older),
        "summary": summarise(case, older),
        "refreshed_at": (msgs[-1].created_at if msgs else datetime.now(timezone.utc)).isoformat(),
    }


@router.get("/conversations/{conv_id}/memory")
async def memory(conv_id: int, session: AsyncSession = Depends(get_session)):
    convo = await session.get(Conversation, conv_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return await context_for(session, convo)
