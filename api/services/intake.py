"""WhatsApp intake bot — the free five-minute assessment (PRD §5 stages 1-2).

Need-first questions with a "Not sure" path on every step, then a bounded initial
risk map whose rows each name the customer answer behind them, plus missing facts,
confidence and an indicative price band. Value comes before capture: the name is
asked only after the customer chooses to save the result. None of this counts
toward the five free generic questions.

Questions, findings and plans come from knowledge/assessment/initial-scan.yaml
(a draft awaiting expert review); this module only interprets them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

SCAN_FILE = Path(__file__).resolve().parents[2] / "knowledge" / "assessment" / "initial-scan.yaml"

NOT_SURE = "Not sure"
SAVE_YES, SAVE_NO = "Yes, save it", "No thanks"
_UNSURE_WORDS = {"not sure", "dont know", "don't know", "idk", "no idea", "unsure", "maybe", "?"}

ASSESSMENT_ACTION = {"type": "assessment", "label": "Open my risk map", "href": "/portal/assessment"}
PLANS_ACTION = {"type": "plans", "label": "Compare the two plans", "href": "/portal/plans"}


@dataclass
class BotMessage:
    content: str
    options: list[str] | None = None
    action: dict | None = None


@dataclass
class IntakeResult:
    messages: list[BotMessage] = field(default_factory=list)
    scan: dict | None = None            # set when the risk map is produced
    consent_saved: bool | None = None   # set when the customer answers the save question
    name: str | None = None             # set when the customer gives a name
    finished: bool = False              # intake over; the thread becomes a free-plan thread


@lru_cache(maxsize=1)
def load_scan() -> dict[str, Any]:
    return yaml.safe_load(SCAN_FILE.read_text())


def plans() -> list[dict[str, Any]]:
    return load_scan()["plans"]


def _applies(cond: dict[str, list[str]] | None, answers: dict[str, str]) -> bool:
    return all(answers.get(k) in v for k, v in (cond or {}).items())


def _next_step(answers: dict[str, str]) -> dict | None:
    for step in load_scan()["steps"]:
        if step["key"] not in answers and _applies(step.get("ask_if"), answers):
            return step
    return None


def _match(options: list[str], text: str) -> str | None:
    t = text.strip().lower().rstrip(".!")
    for o in options:
        if t == o.lower():
            return o
    if t in _UNSURE_WORDS and NOT_SURE in options:
        return NOT_SURE
    if t in {"y", "yes", "yeah", "yep"} and "Yes" in options:
        return "Yes"
    if t in {"n", "no", "nope"} and "No" in options:
        return "No"
    hits = [o for o in options if t and (t in o.lower() or o.lower() in t)]
    return hits[0] if len(hits) == 1 else None


def progress(intake: dict | None) -> dict[str, int]:
    """Questions answered vs. the questions this customer will be asked in total."""
    answers = (intake or {}).get("answers") or {}
    remaining = [
        s for s in load_scan()["steps"]
        if s["key"] not in answers and _applies(s.get("ask_if"), answers)
    ]
    return {"answered": len(answers), "total": len(answers) + len(remaining)}


def _ask(step: dict) -> BotMessage:
    text = step["ask"] + (f"\n\n_{step['why']}_" if step.get("why") else "")
    return BotMessage(content=text, options=step["options"])


def opening_messages() -> list[BotMessage]:
    first = _next_step({})
    return [
        BotMessage(
            content=(
                "Hi, I'm Kiyos 👋 I help families with tax in India and the US.\n\n"
                "A few quick questions (about five minutes, no documents) and I'll show you what "
                "needs attention in each country, what's still unknown, and a price range. "
                "Free, and not personal tax advice."
            )
        ),
        _ask(first),
    ]


def build_scan(answers: dict[str, str]) -> dict[str, Any]:
    scan = load_scan()
    labels = {s["key"]: s["ask"] for s in scan["steps"]}
    rows = []
    for f in scan["findings"]:
        if not _applies(f["when"], answers):
            continue
        rows.append({
            "area": f["area"],
            "country": f["country"],
            "finding": f["finding"],
            "why": f["why"],
            "input": answers.get(f["input"], ""),
            "input_question": labels.get(f["input"], ""),
            "confidence": f["confidence"],
            "rule": f.get("rule"),
            "priced_separately": bool(f.get("priced_separately")),
        })
    missing = [
        s["missing_if_unsure"]
        for s in scan["steps"]
        if answers.get(s["key"]) == NOT_SURE and s.get("missing_if_unsure")
    ]
    if answers.get("need") == "Moving back to India":
        missing.append("Days spent in India in each of the last ten years")
    missing.append("Account balances and income figures (collected securely after you choose a plan)")
    unsure = sum(1 for v in answers.values() if v == NOT_SURE)
    confidence = "medium" if unsure == 0 else "low" if unsure >= 3 else "partial"
    household = "couple" if answers.get("household") == "With my spouse" else "individual"
    return {
        "version": scan["version"],
        "rows": rows,
        "missing": missing,
        "confidence": confidence,
        "household": household,
    }


def price_band(household: str) -> tuple[int, int]:
    key = "couple_inr" if household == "couple" else "individual_inr"
    prices = sorted(p[key] for p in plans())
    return prices[0], prices[-1]


def inr(n: int) -> str:
    """Indian digit grouping: ₹29,500 / ₹1,20,000."""
    digits = str(int(n))
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return "₹" + ",".join(groups + [tail])


def _summary(scan: dict) -> BotMessage:
    flag = {"IN": "🇮🇳", "US": "🇺🇸", "BOTH": "🇮🇳🇺🇸"}
    lines = [f"{flag.get(r['country'], '')} *{r['area']}* — {r['finding']}" for r in scan["rows"]]
    low, high = price_band(scan["household"])
    extra = any(r["priced_separately"] for r in scan["rows"])
    return BotMessage(
        content=(
            "Here's your initial risk map:\n\n" + "\n".join(lines)
            + f"\n\n*Still unknown:* {len(scan['missing'])} item{'s' if len(scan['missing']) != 1 else ''}"
            + f"\n*Confidence:* {scan['confidence']} — based only on your answers"
            + f"\n*Indicative price:* {inr(low)}–{inr(high)} incl. GST"
            + (" (mutual funds or property are quoted separately by an expert)" if extra else "")
            + "\n\nA first scan, not a tax opinion. A Kiyos expert confirms it on a paid plan."
        )
    )


def advance(intake: dict | None, text: str, known_name: str | None = None) -> tuple[dict, IntakeResult]:
    """Apply one customer message to the intake state. Returns (new state, bot replies).

    `known_name`: the sender's WhatsApp profile name, offered as a one-tap reply when we ask
    for their name (they can still type a different one)."""
    state = dict(intake or {"step": "question", "answers": {}})
    answers = dict(state.get("answers") or {})
    result = IntakeResult()

    if state["step"] == "question":
        step = _next_step(answers)
        if step is None:  # already complete
            state["step"] = "done"
            return state, result
        choice = _match(step["options"], text)
        if choice is None:
            result.messages.append(
                BotMessage(content="Tap one of the options — 'Not sure' is a fine answer.", options=step["options"])
            )
            return state, result
        answers[step["key"]] = choice
        state["answers"] = answers
        nxt = _next_step(answers)
        if nxt:
            result.messages.append(_ask(nxt))
            return state, result
        scan = build_scan(answers)
        result.scan = scan
        result.messages.append(_summary(scan))
        result.messages.append(
            BotMessage(
                content="Shall I save this so you can come back to it? Only you will be able to see it.",
                options=[SAVE_YES, SAVE_NO],
            )
        )
        state["step"] = "consent"
        return state, result

    if state["step"] == "consent":
        choice = _match([SAVE_YES, SAVE_NO], text) or (SAVE_YES if text.strip().lower().startswith("y") else None)
        if choice is None:
            result.messages.append(BotMessage(content="Shall I save it?", options=[SAVE_YES, SAVE_NO]))
            return state, result
        result.consent_saved = choice == SAVE_YES
        if result.consent_saved:
            result.messages.append(BotMessage(content="Saved. What's your name?", options=[known_name] if known_name else None))
            state["step"] = "name"
        else:
            result.messages.append(_free_handoff(saved=False))
            state["step"] = "done"
            result.finished = True
        return state, result

    if state["step"] == "name":
        name = " ".join(text.strip().split())[:60].title() or "there"
        result.name = name
        result.messages.append(
            BotMessage(
                content=(
                    f"Thanks, {name.split()[0]}. Your risk map is ready, and only you can open it."
                ),
                action=ASSESSMENT_ACTION,
            )
        )
        # The assessment as a PDF to keep (scope: "sends the customer a PDF after the questions").
        result.messages.append(
            BotMessage(
                content="Here it is as a PDF to keep. It's a first look from your answers, not a tax opinion.",
                action={"type": "document", "label": "Kiyos-initial-assessment.pdf", "href": "/portal/assessment"},
            )
        )
        result.messages.append(_free_handoff(saved=True))
        state["step"] = "done"
        result.finished = True
        return state, result

    return state, result


def _free_handoff(saved: bool) -> BotMessage:
    return BotMessage(
        content=(
            "You can ask me 5 general questions for free, like \"What is RNOR?\". "
            "Questions about your own situation go to an expert, which needs a plan."
            + ("" if saved else " Your summary stays in this chat.")
        ),
        action=PLANS_ACTION,
    )
