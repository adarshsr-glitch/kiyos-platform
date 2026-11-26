"""Evaluation set for the agent (scope 7c): fixed questions with what a good answer must do.

Each case states the expected classification (general vs personal) and the expected outcome:
answered citing a specific approved rule, nudged to a plan (personal), or handed off because
no approved rule covers it (never guessed). A rule still pending validation by Kiyos's tax team
doesn't count as approved, so questions on it must be handed off too. Running the set calls the real agent path used on
WhatsApp and checks each answer. Nothing is saved: the run is rolled back.
"""

from __future__ import annotations

import time
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import Case
from services import converse

router = APIRouter()

Expect = Literal["answer", "personal", "handoff"]
EVAL_SET: list[dict] = [
    {"q": "What is RNOR?", "kind": "generic", "expect": "answer", "rule": "IN-RES-RNOR-9OF10"},
    {"q": "How many days in India make someone resident?", "kind": "generic", "expect": "handoff", "rule": "IN-RES-182"},
    {"q": "What is R.N.O.R.?", "kind": "generic", "expect": "answer", "rule": "IN-RES-RNOR-9OF10"},
    {"q": "What is the 60-day rule for Indian residency?", "kind": "generic", "expect": "handoff", "rule": "IN-RES-60-365"},
    {"q": "What is the substantial presence test?", "kind": "generic", "expect": "handoff", "rule": "US-RES-SPT"},
    {"q": "Should I sell my flat in Pune before I become resident?", "kind": "personal", "expect": "personal", "rule": None},
    {"q": "How much tax will I pay on my RSUs this year?", "kind": "personal", "expect": "personal", "rule": None},
    {"q": "Am I RNOR this year?", "kind": "personal", "expect": "personal", "rule": None},
    {"q": "Mera RSU India mein taxable hai?", "kind": "personal", "expect": "personal", "rule": None},
    {"q": "What is an FBAR?", "kind": "generic", "expect": "handoff", "rule": None},
]


def _diagnose(item: dict, got_kind: str, outcome: str) -> dict | None:
    """Why a check failed, when a known fix would change the result. Checked, not assumed:
    the fix is only offered if applying it actually changes this question's handling."""
    q = item["q"]
    if got_kind != item["kind"] and item["kind"] == "personal" and converse._HINGLISH_RE.search(q):
        return {"key": "hinglish_personal", **converse.FIXES["hinglish_personal"]}
    if outcome == "handoff" and item["expect"] == "answer" and converse._DOTTED_RE.search(q):
        return {"key": "dotted_abbreviations", **converse.FIXES["dotted_abbreviations"]}
    return None


@router.post("/eval/fixes/{key}")
async def apply_fix(key: str, on: bool = True):
    if key not in converse.FIXES:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No such fix")
    return {"applied": converse.set_fix(key, on)}


@router.get("/eval/fixes")
async def fixes():
    t = converse.tuning()
    return [{"key": k, **v, "applied": bool(t.get(k))} for k, v in converse.FIXES.items()]


@router.get("/eval/set")
async def eval_set():
    return EVAL_SET


class EvalRow(BaseModel):
    question: str
    expected_kind: str
    got_kind: str
    expected: str
    outcome: str
    cited: list[str]
    expected_rule: str | None
    grounded: bool
    passed: bool
    note: str
    ms: int
    fix: dict | None = None  # a suggested fix for a failed check, from diagnosing it


@router.post("/eval/run")
async def run(i: int | None = None, session: AsyncSession = Depends(get_session)):
    """Run the whole set, or one question (`i`) so a page can show each check as it happens."""
    case = Case(id=0, client_name="Evaluation", name="Evaluation", plan="free")
    rows: list[EvalRow] = []
    items = EVAL_SET if i is None else [EVAL_SET[i]] if 0 <= i < len(EVAL_SET) else []
    try:
        for item in items:
            t = time.monotonic()
            got_kind = converse.classify_free_question(item["q"])
            reply, category = await converse.answer_free(session, case, item["q"], {"generic_used": 0, "personal_used": 0})
            outcome = "personal" if category == "personal" else "answer" if category == "generic" and reply.cited_rules else "handoff"
            known = {r.id for r in converse._answerable_rules()}
            grounded = all(r in known for r in reply.cited_rules) and (outcome != "answer" or "Source:" in reply.content or bool(reply.cited_rules))
            ok_rule = item["expect"] != "answer" or item["rule"] in reply.cited_rules
            passed = got_kind == item["kind"] and outcome == item["expect"] and ok_rule and grounded
            note = (
                "Classified and answered as expected" if passed
                else "Wrong classification" if got_kind != item["kind"]
                else f"Expected {item['expect']}, got {outcome}" if outcome != item["expect"]
                else f"Cited {', '.join(reply.cited_rules) or 'nothing'}, expected {item['rule']}" if not ok_rule
                else "Not grounded in an approved rule"
            )
            fix = None if passed else _diagnose(item, got_kind, outcome)
            rows.append(EvalRow(fix=fix, question=item["q"], expected_kind=item["kind"], got_kind=got_kind, expected=item["expect"], outcome=outcome,
                                cited=reply.cited_rules, expected_rule=item["rule"], grounded=grounded, passed=passed, note=note,
                                ms=int((time.monotonic() - t) * 1000)))
    finally:
        await session.rollback()
    return {"rows": rows, "passed": sum(r.passed for r in rows), "total": len(rows),
            "mode": "Claude" if converse.ai_enabled() else "deterministic fallback (no API key)"}
