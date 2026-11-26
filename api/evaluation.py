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

# The set is organised by intent: the general question customers keep asking, in many
# phrasings. Each case is one way a real customer might put it (plain, abbreviated, Hinglish,
# typo, indirect, a trap). What a good answer must do follows from Kiyos's rules, not from
# tax content written here: a general question is answered only when an approved (active) rule
# covers it, and cites it; otherwise it is handed off; anything about the asker's own situation
# is personal. Today one rule is active (IN-RES-RNOR-9OF10), so most general questions must be
# handed off until the tax team validates more rules.
INTENTS: dict[str, dict[str, str]] = {
    "rnor": {"title": "What RNOR means", "covers": "IN-RES-RNOR-9OF10 (active)"},
    "resident-182": {"title": "The 182-day test for Indian residency", "covers": "IN-RES-182 (pending validation)"},
    "resident-60": {"title": "The 60-day / 365-day test", "covers": "IN-RES-60-365 (pending validation)"},
    "rnor-729": {"title": "RNOR through the 729-day limb", "covers": "IN-RES-RNOR-729DAYS (pending validation)"},
    "us-spt": {"title": "US substantial presence test", "covers": "US-RES-SPT (pending validation)"},
    "us-green-card": {"title": "US residency through a green card", "covers": "US-RES-GREEN-CARD (pending validation)"},
    "nri-accounts": {"title": "NRE, NRO and FCNR accounts", "covers": "No rule yet"},
    "capital-gains": {"title": "Selling property or shares in India", "covers": "No rule yet"},
    "equity-comp": {"title": "RSUs, ESOPs and stock options", "covers": "No rule yet"},
    "us-reporting": {"title": "US reporting: FBAR, FATCA, PFIC", "covers": "No rule yet"},
    "double-tax": {"title": "Double taxation and the India–US treaty", "covers": "No rule yet"},
    "filing": {"title": "Which return, which form, by when", "covers": "No rule yet"},
    "personal": {"title": "The asker's own situation", "covers": "Always personal: offer a plan, never answer"},
}

def _c(q: str, intent: str, variant: str, kind: str, expect: str, rule: str | None = None) -> dict:
    return {"q": q, "intent": intent, "intent_title": INTENTS[intent]["title"], "variant": variant, "kind": kind, "expect": expect, "rule": rule}

RNOR = "IN-RES-RNOR-9OF10"
EVAL_SET: list[dict] = [
    # What RNOR means: covered by the one active rule, so a general question is answered and cites it.
    _c("What is RNOR?", "rnor", "plain", "generic", "answer", RNOR),
    _c("What is R.N.O.R.?", "rnor", "abbreviation", "generic", "answer", RNOR),
    _c("What does resident but not ordinarily resident mean?", "rnor", "full form", "generic", "answer", RNOR),
    _c("rnor meaning", "rnor", "terse", "generic", "answer", RNOR),
    _c("RNOR kya hota hai?", "rnor", "Hinglish", "generic", "answer", RNOR),
    _c("Who qualifies as not ordinarily resident in India?", "rnor", "indirect", "generic", "answer", RNOR),
    _c("Explain RNOR like I'm five", "rnor", "trap: 'I' without a personal situation", "generic", "answer", RNOR),
    # The 182-day test: rule pending validation, so hand off.
    _c("How many days in India make someone resident?", "resident-182", "plain", "generic", "handoff", "IN-RES-182"),
    _c("What is the 182 day rule in India?", "resident-182", "named", "generic", "handoff", "IN-RES-182"),
    _c("182 days residency india", "resident-182", "terse", "generic", "handoff", "IN-RES-182"),
    _c("Kitne din India mein rehne se resident ban jaate hain?", "resident-182", "Hinglish", "generic", "handoff", "IN-RES-182"),
    # The 60/365 test.
    _c("What is the 60-day rule for Indian residency?", "resident-60", "plain", "generic", "handoff", "IN-RES-60-365"),
    _c("How does the 365 days in four years test work?", "resident-60", "indirect", "generic", "handoff", "IN-RES-60-365"),
    _c("Does the 60 day rule apply to NRIs visiting India?", "resident-60", "caveat", "generic", "handoff", "IN-RES-60-365"),
    # The 729-day limb.
    _c("What is the 729 day rule for RNOR?", "rnor-729", "plain", "generic", "handoff", "IN-RES-RNOR-729DAYS"),
    _c("Is there a second way to qualify as RNOR?", "rnor-729", "indirect", "generic", "handoff", "IN-RES-RNOR-729DAYS"),
    # US residency.
    _c("What is the substantial presence test?", "us-spt", "plain", "generic", "handoff", "US-RES-SPT"),
    _c("How many days in the US make someone a US tax resident?", "us-spt", "indirect", "generic", "handoff", "US-RES-SPT"),
    _c("SPT 183 days formula", "us-spt", "terse", "generic", "handoff", "US-RES-SPT"),
    _c("Does holding a green card make someone a US tax resident?", "us-green-card", "plain", "generic", "handoff", "US-RES-GREEN-CARD"),
    _c("What happens to US tax residency after surrendering a green card?", "us-green-card", "caveat", "generic", "handoff", "US-RES-GREEN-CARD"),
    # NRI bank accounts.
    _c("What is the difference between NRE and NRO accounts?", "nri-accounts", "plain", "generic", "handoff"),
    _c("Is NRE interest taxable in India?", "nri-accounts", "named", "generic", "handoff"),
    _c("What happens to NRE accounts after returning to India?", "nri-accounts", "returnee", "generic", "handoff"),
    _c("FCNR deposit kya hota hai?", "nri-accounts", "Hinglish", "generic", "handoff"),
    # Capital gains in India.
    _c("How are capital gains on property in India taxed for NRIs?", "capital-gains", "plain", "generic", "handoff"),
    _c("What TDS applies when an NRI sells property in India?", "capital-gains", "named", "generic", "handoff"),
    _c("What is Section 54 exemption?", "capital-gains", "section", "generic", "handoff"),
    _c("How are Indian mutual fund gains taxed for US residents?", "capital-gains", "cross-border", "generic", "handoff"),
    # Equity compensation.
    _c("How are RSUs taxed when someone moves from the US to India?", "equity-comp", "plain", "generic", "handoff"),
    _c("When are ESOPs taxed in India?", "equity-comp", "named", "generic", "handoff"),
    _c("RSU vesting tax cross border", "equity-comp", "terse", "generic", "handoff"),
    # US reporting.
    _c("What is an FBAR?", "us-reporting", "plain", "generic", "handoff"),
    _c("What is the FBAR threshold?", "us-reporting", "named", "generic", "handoff"),
    _c("What is Form 8938?", "us-reporting", "form", "generic", "handoff"),
    _c("Are Indian mutual funds PFICs?", "us-reporting", "cross-border", "generic", "handoff"),
    _c("FATCA vs FBAR difference", "us-reporting", "terse", "generic", "handoff"),
    # Double taxation.
    _c("How does the India–US tax treaty prevent double taxation?", "double-tax", "plain", "generic", "handoff"),
    _c("What is the foreign tax credit?", "double-tax", "named", "generic", "handoff"),
    _c("Can the same salary be taxed in both India and the US?", "double-tax", "indirect", "generic", "handoff"),
    # Filing.
    _c("Which ITR form do NRIs file?", "filing", "plain", "generic", "handoff"),
    _c("When is the Indian income tax return due?", "filing", "deadline", "generic", "handoff"),
    _c("What is a dual-status return in the US?", "filing", "named", "generic", "handoff"),
    # The asker's own situation: always personal, whatever the wording.
    _c("Am I RNOR this year?", "personal", "status", "personal", "personal"),
    _c("Should I sell my flat in Pune before I become resident?", "personal", "decision", "personal", "personal"),
    _c("How much tax will I pay on my RSUs this year?", "personal", "amount", "personal", "personal"),
    _c("Mera RSU India mein taxable hai?", "personal", "Hinglish", "personal", "personal"),
    _c("We moved back in March, which return do we file?", "personal", "household 'we'", "personal", "personal"),
    _c("Do I need to file an FBAR for my NRE account?", "personal", "reporting", "personal", "personal"),
    _c("My wife has a green card, is she a US resident?", "personal", "family member", "personal", "personal"),
    _c("Can you check if the 182 day rule applies to us?", "personal", "pronoun 'us'", "personal", "personal"),
    _c("Mujhe NRO account band karna chahiye?", "personal", "Hinglish decision", "personal", "personal"),
]


def _diagnose(item: dict, got_kind: str, outcome: str) -> dict | None:
    """Why a check failed, when a known fix would change the result. Checked, not assumed:
    the fix is only offered if applying it actually changes this question's handling."""
    q = item["q"]
    if got_kind != item["kind"] and item["kind"] == "personal" and converse._HINGLISH_RE.search(q):
        return {"key": "hinglish_personal", **converse.FIXES["hinglish_personal"]}
    if outcome == "handoff" and item["expect"] == "answer" and converse._DOTTED_RE.search(q):
        return {"key": "dotted_abbreviations", **converse.FIXES["dotted_abbreviations"]}
    if got_kind != item["kind"] and item["kind"] == "generic" and converse._IDIOM_RE.search(q):
        return {"key": "idioms_not_personal", **converse.FIXES["idioms_not_personal"]}
    return None


def _draft(item: dict, got_kind: str, outcome: str, cited: list[str]) -> str:
    """Kiyos's own read of a failed check, in words, for the expert reviewing it. Describes what
    happened and where a fix would come from; it never proposes tax content."""
    if got_kind != item["kind"]:
        return (f"The question was read as {'personal' if got_kind == 'personal' else 'general'}, but it "
                f"{'is about the asker’s own situation' if item['kind'] == 'personal' else 'asks about the rule in general'}. "
                "The check that decides this looks for words like “I”, “my”, “we”; this phrasing slipped past it.")
    if item["expect"] == "answer" and outcome == "handoff":
        return (f"An approved rule ({item['rule']}) covers this, but the question wasn't matched to it, so it was handed off. "
                "The wording needs to map to the rule, or the rule needs this phrasing as an example (tax team).")
    if item["expect"] == "handoff" and outcome == "answer":
        return (f"Kiyos answered citing {', '.join(cited) or 'nothing'}, but no approved rule covers this question. "
                "Answers must come only from rules in use (C-03); this needs the answer path tightened, not a new answer.")
    if item["expect"] == "answer" and item["rule"] not in cited:
        return f"Kiyos answered but cited {', '.join(cited) or 'nothing'} instead of {item['rule']}."
    return "The answer wasn't grounded in an approved rule."


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


@router.get("/eval/intents")
async def eval_intents():
    return [{"key": k, **v, "cases": sum(1 for c in EVAL_SET if c["intent"] == k)} for k, v in INTENTS.items()]


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
    reply: str = ""  # what the agent actually said
    draft: str | None = None  # Kiyos's read of a failed check
    intent: str | None = None
    variant: str | None = None
    index: int | None = None


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
            rows.append(EvalRow(fix=fix, reply=reply.content, draft=None if passed else _draft(item, got_kind, outcome, reply.cited_rules),
                                intent=item.get("intent"), variant=item.get("variant"), index=EVAL_SET.index(item), question=item["q"], expected_kind=item["kind"], got_kind=got_kind, expected=item["expect"], outcome=outcome,
                                cited=reply.cited_rules, expected_rule=item["rule"], grounded=grounded, passed=passed, note=note,
                                ms=int((time.monotonic() - t) * 1000)))
    finally:
        await session.rollback()
    return {"rows": rows, "passed": sum(r.passed for r in rows), "total": len(rows),
            "mode": "Claude" if converse.ai_enabled() else "deterministic fallback (no API key)"}


# ── Run history: each finished run is kept with the agent's fixes as they were, so a run can be
# compared with the last one and the agent rolled back to how it was.
import json  # noqa: E402
from datetime import datetime, timezone  # noqa: E402
from pathlib import Path  # noqa: E402

RUNS_PATH = Path(__file__).resolve().parents[1] / "data" / "eval-runs.json"


def _runs() -> list[dict]:
    try:
        return json.loads(RUNS_PATH.read_text())
    except (OSError, ValueError):
        return []


class RunIn(BaseModel):
    label: str | None = None
    passed: int
    total: int
    failed: list[int]  # indexes into the set
    by: str | None = None


@router.get("/eval/runs")
async def runs():
    return list(reversed(_runs()))[:30]


@router.post("/eval/runs")
async def save_run(body: RunIn):
    runs = _runs()
    run = {"id": (runs[-1]["id"] + 1) if runs else 1, "at": datetime.now(timezone.utc).isoformat(), "label": body.label,
           "passed": body.passed, "total": body.total, "failed": body.failed, "by": body.by,
           "fixes": {k: bool(v) for k, v in converse.tuning().items() if k in converse.FIXES}}
    runs.append(run)
    RUNS_PATH.write_text(json.dumps(runs[-200:], indent=2))
    return run


@router.post("/eval/runs/{run_id}/restore")
async def restore_run(run_id: int):
    """Roll the agent back to the fixes it had at that run."""
    run = next((r for r in _runs() if r["id"] == run_id), None)
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No such run")
    for key in converse.FIXES:
        converse.set_fix(key, bool(run["fixes"].get(key)))
    return {"restored": run_id, "fixes": run["fixes"]}
