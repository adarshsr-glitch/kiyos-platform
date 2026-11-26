"""Stage the prototype for the screen recording, and put it back afterwards.

    make demo-stage     once: save today's database, lay the demo state on top, save that too
    make demo-retake    before each take: back to the staged state (fresh sign-up thread, no
                        leftovers from the last take, agent fixes off)
    make demo-unstage   when done: the database exactly as it was before staging

Nothing is deleted when staging: rows are added and a few fields updated. Snapshots use
SQLite's online backup, so the API can keep running. Servers are never started or stopped.

What staging lays on top (see docs/demo/2026-11-20-walkthrough-5min.md):
  * a WhatsApp-only copy of Arjun Rao, at the first sign-up question, with a presenter link;
  * Arjun Rao's paid case (1): a clean WhatsApp thread, current to-dos, one way to save
    from Vikram, nothing unread.
"""

from __future__ import annotations

import asyncio
import json
import os
import secrets
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path[:0] = [os.path.join(ROOT, "api"), ROOT]

DB = os.path.join(ROOT, "data", "kiyos.db")
PRE = DB + ".pre-demo"
STAGED = DB + ".demo-staged"
TUNING = os.path.join(ROOT, "data", "agent-tuning.json")
ARJUN = 1
COPY_KEY = "demo-wa-arjun"


def _copy(src: str, dst: str) -> None:
    """Online backup: consistent even while the API has the database open."""
    s, d = sqlite3.connect(src), sqlite3.connect(dst)
    with d:
        s.backup(d)
    s.close()
    d.close()


def _fixes_off() -> None:
    with open(TUNING, "w") as f:
        json.dump({"hinglish_personal": False, "dotted_abbreviations": False}, f, indent=2)


def _presenter_link() -> str | None:
    con = sqlite3.connect(DB)
    row = con.execute(
        "select m.token from magic_link m join \"case\" c on c.id=m.case_id where c.demo_key=? order by m.id desc limit 1", (COPY_KEY,)
    ).fetchone()
    con.close()
    return f"http://localhost:3000/m/{row[0]}" if row else None


async def _stage() -> None:
    from sqlalchemy import select

    from db import async_session
    from infra.schema import ActionItem, Case, Conversation, DocumentRequest, MagicLink, Message, Recommendation
    from services import intake

    now = datetime.now(timezone.utc)
    ago = lambda days, h=10: (now - timedelta(days=days)).replace(hour=h, minute=0, second=0, microsecond=0)  # noqa: E731
    today = date.today()

    async with async_session() as s:
        arjun = await s.get(Case, ARJUN)
        if (await s.execute(select(Case).where(Case.demo_key == COPY_KEY))).scalars().first():
            sys.exit("Already staged. Use `make demo-retake`, or `make demo-unstage` first.")

        # ── 1. WhatsApp-only copy of Arjun: the sign-up, tapped live on camera.
        copy = Case(name="Arjun Rao (WhatsApp sign-up, demo)", client_name="Arjun Rao", status="lead", jurisdictions="IN,US",
                    case_captain="Unassigned", plan="free", phone=arjun.phone, demo_key=COPY_KEY, created_at=now)
        s.add(copy)
        await s.flush()
        wa = Conversation(case_id=copy.id, title="WhatsApp", stage="intake", intake={"step": "question", "answers": {}}, created_at=now)
        s.add(wa)
        await s.flush()
        for i, bm in enumerate(intake.opening_messages()):
            s.add(Message(conversation_id=wa.id, role="assistant", author="Kiyos", content=bm.content, options=bm.options,
                          action=bm.action, confidence=1.0, created_at=now + timedelta(seconds=i)))
        # The presenter's way in (not shown on camera): opens this WhatsApp thread.
        s.add(MagicLink(token=secrets.token_urlsafe(24), case_id=copy.id, purpose="signin", target="/portal/whatsapp",
                        expires_at=now + timedelta(days=30), created_at=now))

        # ── 2. Arjun Rao's paid case: covers him and Nisha (as checkout shows for his answers),
        #       and a clean thread that tells his story.
        arjun.plan_choice = {**(arjun.plan_choice or {}), "household": "couple", "price_inr": 59000, "price_usd": 628}
        thread = Conversation(case_id=ARJUN, title="WhatsApp", stage="paid", controller="agent", created_at=ago(52))
        s.add(thread)
        await s.flush()
        # Hours are UTC, chosen to fall in the Indian working day (09:30–18:30 IST), and
        # today's message is early enough to be before "now".
        # A two-sided thread: Kiyos's automatic messages, Vikram writing himself, and Arjun's replies.
        V = arjun.case_captain
        story = [
            (52, 5, "assistant", "Kiyos", "Payment received — Full service for you and Nisha, ₹59,000 incl. GST. Your receipt and signed NDA are in your workspace."),
            (52, 6, "assistant", "Kiyos", "Vikram Desai is your lead tax expert and owns your case. Meera Iyer (CA) reviews the India side and Daniel Brooks (EA) the US side. Ask anything here, any time."),
            (52, 7, "user", None, "Thanks! Looking forward to working with Vikram."),
            (40, 4, "advisor", V, "Hi Arjun, I've gone through your answers and travel dates. To start your returns I've listed the documents I need in your workspace, each with a short note on why."),
            (40, 13, "user", None, "Got it. I'll send the W-2 and Form 16 this week. The Pune lease is with my tenant, so that one may take a little longer."),
            (24, 10, "assistant", "Kiyos", "Good news: your residency for FY 2026-27 is reviewed and signed off. You're RNOR in India and dual-status in the US for 2026."),
            (24, 11, "user", None, "That's a relief, thank you."),
            (3, 11, "advisor", V, "I've accepted your W-2, Form 16, 1099-B, 401(k) statement, Pune lease and ETF export. They now count towards your returns."),
            (3, 12, "user", None, "Great. Is there anything else you need from me?"),
            (0, 3, "advisor", V, "Just two small things: your Flipkart payslips for Aug–Oct, and a quick question about Nisha's income. Both are on your list in the workspace."),
        ]
        for days, h, role, author, text in story:
            s.add(Message(conversation_id=thread.id, role=role, author=author, content=text,
                          confidence=1.0 if role != "user" else None, created_at=ago(days, h)))

        # To-dos that match the story: the two already-covered items are done (not deleted).
        for item_id in (3, 5):
            item = await s.get(ActionItem, item_id)
            if item and item.case_id == ARJUN:
                item.status = "done"
        s.add(DocumentRequest(case_id=ARJUN, title="Flipkart payslips, Aug–Oct 2026",
                              why="Your Form 16 comes at year-end; the payslips let Vikram confirm salary and the August joining bonus now.",
                              country="IN", doc_type="payslip", status="pending", due_date=(today + timedelta(days=5)).isoformat(), created_at=ago(1)))
        s.add(ActionItem(case_id=ARJUN, title="Did Nisha earn any income in India this year?", assignee="customer", status="open",
                         due_date=(today + timedelta(days=7)).isoformat(), owner=arjun.case_captain, notes="clarification", created_at=ago(1)))

        # One way to save, entered by Vikram (he adds 54EC live on camera).
        s.add(Recommendation(case_id=ARJUN, author=arjun.case_captain, content="Time a sale within your RNOR years",
                             rationale="Selling your US ETFs while you're RNOR (to March 2028) keeps the gain outside Indian tax. I'll confirm the PFIC position first.",
                             status="proposed", date=(today - timedelta(days=2)).isoformat(), option="in_rnor_timing", country="IN",
                             amount=180000, currency="INR", deadline="2028-03-31", created_at=ago(2)))

        # Nothing unread on either side; "since your last visit" covers the last two weeks.
        for c in (await s.execute(select(Case))).scalars():
            c.customer_read_at = now
            c.expert_seen_at = now
            c.last_seen_at = None
            c.prev_seen_at = None
        await s.commit()


def main(cmd: str) -> None:
    if cmd == "stage":
        if not os.path.exists(PRE):
            _copy(DB, PRE)
            print(f"Saved today's database: {PRE}")
        asyncio.run(_stage())
        _fixes_off()
        _copy(DB, STAGED)
        print(f"Staged. Snapshot for retakes: {STAGED}")
    elif cmd == "retake":
        if not os.path.exists(STAGED):
            sys.exit("Nothing staged yet: run `make demo-stage` first.")
        _copy(STAGED, DB)
        _fixes_off()
        print("Back to the staged state.")
    elif cmd == "unstage":
        if not os.path.exists(PRE):
            sys.exit("No saved pre-demo database.")
        _copy(PRE, DB)
        _fixes_off()
        print("Restored the database from before staging. Snapshots kept:", PRE, STAGED)
        return
    else:
        sys.exit("Usage: demo_stage.py stage | retake | unstage")
    link = _presenter_link()
    if link:
        print(f"\nPresenter link (opens Arjun's WhatsApp sign-up): {link}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
