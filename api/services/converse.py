"""Converse — answer a customer's chat message, grounded in the case record,
the knowledge layer and the engine. Never computes tax.

Flow per customer message:
  1. Sensitive-data guard: identity numbers are never echoed or sent to the model.
  2. Claude tool loop (lookup_rule / evaluate_rule / get_filing_status), ending in
     submit_answer with a self-assessed confidence and cited rule IDs.
     Without an API key, a deterministic responder answers from the case record.
  3. Confidence routing: below CONFIDENCE_THRESHOLD, or when the question needs a
     personal or committing answer, the customer gets a holding message and the
     draft goes to the advisor as a ticket (expert gate: no unreviewed advice
     appears final).
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from engine.rules import list_rules, load_rule
from infra.schema import Case, Message
from services._ai import ai_call, ai_enabled, find_pii, log_fallback_call, scrub_pii

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))

# Free plan (PRD §7 Free Q&A, decision 10 Nov 2026): three generic questions in total
# per person; personal questions pivot to a paid offering from the first question,
# whatever the count. The five-minute assessment is separate and never counted.
FREE_GENERIC_LIMIT = 3

PLANS_ACTION = {"type": "plans", "label": "See plans", "href": "/portal/upgrade"}
UPLOAD_ACTION = {"type": "upload", "label": "Open secure upload", "href": "/portal/documents"}
VERIFY_ACTION = {"type": "verify", "label": "Update my details", "href": "/portal/verify"}
MAX_TOOL_ROUNDS = 5
RULE_ID_RE = re.compile(r"\b[A-Z]{2,4}-[A-Z0-9]+(?:-[A-Z0-9]+)+\b")

TOPIC_CONFIDENCE = {"confirmed": 0.9, "likely": 0.75, "incomplete": 0.5, "review_needed": 0.3}


@dataclass
class Reply:
    content: str
    confidence: float
    cited_rules: list[str] = field(default_factory=list)
    route: bool = False
    reason: str | None = None
    draft: str | None = None  # the unreviewed answer, kept for the advisor when routed
    action: dict | None = None  # call-to-action button shown under the message


# ───────────────────────────────────────────────────────────── entry points


def guard_sensitive(text: str) -> tuple[str, Reply | None]:
    """Return (text safe to store, guard reply if identity numbers were shared)."""
    found = find_pii(text)
    if not found:
        return text, None
    kinds = " / ".join(found)
    return scrub_pii(text), Reply(
        content=(
            f"Please don't share identity numbers ({kinds}) in chat. I haven't stored or "
            "used it. You can add or update identity details securely in your Kiyos workspace."
        ),
        confidence=1.0,
        reason="sensitive_data_guard",
        action=VERIFY_ACTION,
    )


# ───────────────────────────────────────────────────────────── free plan

_PERSONAL_RE = re.compile(
    r"\b(i|i'm|im|i've|i'd|i'll|me|my|mine|myself|we|we're|we've|our|ours)\b",
    re.IGNORECASE,
)


def classify_free_question(text: str) -> str:
    """'personal' when the question is about the asker's own circumstances, else 'generic'.

    Deterministic on purpose: the gate must be explainable and auditable.
    "What is RNOR?" is generic; "Am I RNOR?" is personal.
    """
    # Lower-case "us" is the pronoun; "US" is the country.
    personal = _PERSONAL_RE.search(text) or re.search(r"\bus\b", text)
    return "personal" if personal else "generic"


def free_usage(categories: list[str | None]) -> dict[str, int]:
    return {
        "generic_used": sum(1 for c in categories if c == "generic"),
        "generic_limit": FREE_GENERIC_LIMIT,
    }


def _offerings_line() -> str:
    from services.intake import inr, plans

    return " or ".join(f"{p['name']} from {inr(p['individual_inr'])}" for p in plans())


async def answer_free(
    session: AsyncSession, case: Case, question: str, usage: dict[str, int]
) -> tuple[Reply, str]:
    """Free plan: generic education only. Returns (reply, category for the user message)."""
    if classify_free_question(question) == "personal":
        return Reply(
            content=(
                "That one is about your own situation, so I can't answer it on the free plan — "
                "even partly. On a paid plan, a Kiyos tax expert checks it against your own "
                "details (dates, accounts, documents) and you get a reviewed answer, usually "
                f"within one business day. Plans: {_offerings_line()}, incl. GST."
            ),
            confidence=1.0,
            reason="personal_question_pivot",
            action=PLANS_ACTION,
        ), "personal"

    if usage["generic_used"] >= FREE_GENERIC_LIMIT:
        return Reply(
            content=(
                f"You've used your {FREE_GENERIC_LIMIT} free general questions. To keep going, "
                f"choose a plan — {_offerings_line()}, incl. GST — and ask about your own "
                "situation as well, with a named expert reviewing the answers."
            ),
            confidence=1.0,
            reason="free_generic_limit",
            action=PLANS_ACTION,
        ), "generic_over_limit"

    started = time.monotonic()
    reply: Reply | None = None
    if ai_enabled():
        try:
            reply = await _answer_with_claude(session, case, [], question, generic=True)
        except anthropic.APIError:
            reply = None
    if reply is None:
        reply = _generic_from_knowledge(question)
        log_fallback_call(session, service="converse", case_id=case.id, started=started)

    known = {r.id for r in list_rules()}
    reply.cited_rules = [r for r in reply.cited_rules if r in known]
    if reply.route or reply.confidence < CONFIDENCE_THRESHOLD or not reply.cited_rules:
        # Not covered by an approved rule: say so, and don't spend a free question.
        return Reply(
            content=(
                "I can only answer from Kiyos's reviewed tax rules, and that topic isn't "
                "covered yet — so I'd rather not guess. This didn't use one of your free questions."
            ),
            confidence=reply.confidence,
            reason="generic_not_covered",
        ), "generic_unanswered"

    remaining = FREE_GENERIC_LIMIT - usage["generic_used"] - 1
    reply.content += (
        "\n\nGeneral information only, not advice on your situation. "
        + (
            f"{remaining} free question{'s' if remaining != 1 else ''} left."
            if remaining
            else f"That was your last free question. To continue: {_offerings_line()}, incl. GST."
        )
    )
    if not remaining:
        reply.action = PLANS_ACTION
    return reply, "generic"


_STOPWORDS = {
    "what", "whats", "does", "how", "the", "and", "for", "mean", "means", "explain", "tell",
    "about", "can", "who", "when", "why", "which", "with", "this", "that", "tax", "taxes",
    "india", "indian", "are", "is", "does", "work", "rule", "rules", "there", "under",
}


_STATUTES = {"IN-ITA": "Income-tax Act", "US-IRC": "Internal Revenue Code"}


def _generic_from_knowledge(question: str) -> Reply:
    words = {w for w in re.findall(r"[a-z0-9]+", question.lower()) if len(w) >= 3} - _STOPWORDS
    best, best_score = None, 0
    for rule in list_rules():
        hay = f"{rule.id} {rule.summary} {rule.notes or ''}".lower()
        score = sum(1 for w in words if w in hay)
        if score > best_score:
            best, best_score = rule, score
    if not best:
        return Reply(content="", confidence=0.0, reason="No approved rule matches.")
    source = best.sources[0] if best.sources else {}
    statute = _STATUTES.get(str(source.get("id", "")).split("-S")[0], "")
    section = source.get("section")
    cite = f"{statute}, section {section}" if statute and section else statute
    country = {"IN": "India", "US": "United States"}.get(best.jurisdiction, best.jurisdiction)
    return Reply(
        content=(
            f"{best.summary.strip()}\n\nSource: {cite + ' · ' if cite else ''}{country}, tax year {best.tax_year}"
        ),
        confidence=0.85,
        cited_rules=[best.id],
    )


async def answer(session: AsyncSession, case: Case, history: list[Message], question: str) -> Reply:
    started = time.monotonic()
    reply: Reply | None = None
    if ai_enabled():
        try:
            reply = await _answer_with_claude(session, case, history, question)
        except anthropic.APIError:
            reply = None  # fall through to the deterministic responder
    if reply is None:
        reply = _answer_deterministic(case, question)
        log_fallback_call(session, service="converse", case_id=case.id, started=started)
    return _apply_routing(case, reply)


async def rephrase_for_customer(session: AsyncSession, case: Case, advisor: str, note: str) -> str:
    """'Reply via agent': turn an advisor's note into a customer-ready message."""
    fallback = f"{advisor}, your case captain, asked me to pass this on: {note}"
    if not ai_enabled():
        return fallback
    try:
        response = await ai_call(
            session,
            service="converse",
            case_id=case.id,
            system=(
                "You are Kiyos, a cross-border tax assistant. Rewrite the advisor's internal "
                "note as a short, warm WhatsApp-style message to the customer. Keep every fact, "
                "number and date exactly as written; add nothing. Say it comes from "
                f"{advisor}, their case captain. Plain text, no markdown."
            ),
            messages=[{"role": "user", "content": scrub_pii(note)}],
            max_tokens=2000,
        )
    except anthropic.APIError:
        return fallback
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    return text or fallback


# ───────────────────────────────────────────────────────────── routing


def _apply_routing(case: Case, reply: Reply) -> Reply:
    if reply.reason == "sensitive_data_guard":
        return reply
    known = {r.id for r in list_rules()}
    cited = [r for r in reply.cited_rules if r in known]
    unknown = [r for r in RULE_ID_RE.findall(reply.content) if r not in known]
    if unknown or len(cited) != len(reply.cited_rules):
        # Citing a rule that isn't in knowledge/ means the answer isn't grounded.
        reply.confidence = min(reply.confidence, 0.4)
        reply.reason = (reply.reason or "") + " Cited rule not in the knowledge layer."
    reply.cited_rules = cited

    if reply.route or reply.confidence < CONFIDENCE_THRESHOLD:
        reply.route = True
        reply.draft = reply.content
        reply.content = (
            "Thanks — this one depends on the specifics of your situation, so I've passed it "
            f"to {case.case_captain}, your case captain, to review before we answer. "
            "You'll get a reply right here, usually within one business day."
        )
    return reply


# ───────────────────────────────────────────────────────────── Claude path


def _scrub_names(case: Case, text: str) -> str:
    names = {case.client_name, *(m.name for m in case.members)}
    for name in sorted(names, key=len, reverse=True):
        text = text.replace(name, "the customer")
        first = name.split()[0]
        if len(first) > 2:
            text = re.sub(rf"\b{re.escape(first)}\b", "the customer", text)
    return scrub_pii(text)


def _case_snapshot(case: Case) -> str:
    lines = [
        f"Case status: {case.status}. Tax year {case.tax_year}. Jurisdictions: {case.jurisdictions}.",
        f"Arrival date: {case.arrival_date or 'n/a'}. Case captain: {case.case_captain}.",
        f"Summary: {case.summary or 'n/a'}",
        "",
        "Facts (key = value [source]):",
        *(f"- {f.key} = {f.value}{' ' + f.unit if f.unit else ''} [{f.source or 'unknown'}]" for f in case.facts),
        "",
        "Tax topics (title | status | confidence | conclusion | next action):",
        *(
            f"- {t.title} | {t.status} | {t.confidence} | {t.conclusion or '—'} | {t.next_action or '—'}"
            for t in case.topics
        ),
        "",
        "Assessments:",
        *(
            f"- {a.headline} | status {a.status} | rules applied: "
            + ", ".join(step.get("rule_id", "") for step in (a.derivation_trail or []))
            for a in case.assessments
        ),
        "",
        "Documents:",
        *(f"- {d.filename} ({d.doc_type}) — {d.status}" for d in case.documents),
        "",
        "Action items (title | assignee | status | due):",
        *(f"- {i.title} | {i.assignee} | {i.status} | {i.due_date or '—'}" for i in case.action_items),
    ]
    return _scrub_names(case, "\n".join(lines))


def _system_prompt(case: Case) -> str:
    rules = "\n".join(f"- {r.id} ({r.jurisdiction} {r.tax_year}): {r.summary.strip()}" for r in list_rules())
    return f"""You are Kiyos, the assistant inside a cross-border (India–US) tax service, chatting with a paying customer about their own case. Their case captain is {case.case_captain}, a human tax advisor who reviews anything personal or committing.

How to answer:
- Ground every statement in the case record below, the knowledge-layer rules, or engine results from your tools. Do not use general tax knowledge to fill gaps.
- Never compute a tax amount or invent a number. Only repeat numbers that appear in the case record or a tool result.
- Cite rules only by the IDs listed below, and only when you used them.
- Keep replies short and plain: two to five sentences, WhatsApp style, no markdown headings.
- Questions about status, documents, deadlines, next steps or what the record already concludes are fine to answer directly.
- If the question asks for a decision or a new position (should I sell, withdraw, elect, how much will I owe), or the record and rules don't cover it, set needs_advisor to true and explain why in reason; still write your best draft for the advisor.

Finish every turn by calling submit_answer. confidence is your honest 0–1 estimate that the answer is complete, correct and fully grounded.

Knowledge-layer rules available:
{rules or '- (none)'}

Case record:
{_case_snapshot(case)}
"""


_TOOLS: list[dict[str, Any]] = [
    {
        "name": "lookup_rule",
        "description": "Read a knowledge-layer rule by ID: summary, statutory sources, inputs and notes.",
        "input_schema": {
            "type": "object",
            "properties": {"rule_id": {"type": "string"}},
            "required": ["rule_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "name": "evaluate_rule",
        "description": (
            "Run a knowledge-layer rule through the deterministic engine. Pass inputs exactly as "
            "the rule declares them (see lookup_rule). Use only values present in the case record."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "rule_id": {"type": "string"},
                "inputs_json": {"type": "string", "description": "JSON object of rule inputs"},
            },
            "required": ["rule_id", "inputs_json"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "name": "get_filing_status",
        "description": "Current workflow state: open topics, customer to-dos, pending documents and next deadline.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "submit_answer",
        "description": "Submit the final reply to the customer. Always call this exactly once to finish.",
        "input_schema": {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "confidence": {"type": "number"},
                "cited_rule_ids": {"type": "array", "items": {"type": "string"}},
                "needs_advisor": {"type": "boolean"},
                "reason": {"type": "string", "description": "Why this needs an advisor, or empty"},
            },
            "required": ["answer", "confidence", "cited_rule_ids", "needs_advisor", "reason"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def _run_tool(case: Case, name: str, args: dict[str, Any]) -> tuple[str, bool]:
    if name == "lookup_rule":
        rule = load_rule(args.get("rule_id", ""))
        if not rule:
            return f"No rule with id {args.get('rule_id')!r} in the knowledge layer.", True
        return json.dumps(
            {
                "id": rule.id,
                "summary": rule.summary,
                "sources": rule.sources,
                "inputs": rule.inputs,
                "notes": rule.notes,
            }
        ), False
    if name == "evaluate_rule":
        rule = load_rule(args.get("rule_id", ""))
        if not rule:
            return f"No rule with id {args.get('rule_id')!r}.", True
        try:
            result = rule.evaluate(json.loads(args.get("inputs_json") or "{}"))
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            return f"Engine could not evaluate {rule.id}: {exc}", True
        return result.model_dump_json(), False
    if name == "get_filing_status":
        return json.dumps(_filing_status(case)), False
    return f"Unknown tool {name}", True


def _history_messages(case: Case, history: list[Message], question: str) -> list[dict[str, Any]]:
    turns: list[dict[str, Any]] = []
    for m in history[-12:]:
        if m.role == "system":
            continue
        role = "user" if m.role == "user" else "assistant"
        text = m.content if m.role != "advisor" else f"[{m.author or 'Advisor'}, case captain]: {m.content}"
        text = _scrub_names(case, text)
        if turns and turns[-1]["role"] == role:
            turns[-1]["content"] += "\n\n" + text
        else:
            turns.append({"role": role, "content": text})
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    question = _scrub_names(case, question)
    if turns and turns[-1]["role"] == "user":
        turns[-1]["content"] += "\n\n" + question
    else:
        turns.append({"role": "user", "content": question})
    return turns


def _generic_system_prompt() -> str:
    rules = "\n".join(
        f"- {r.id} ({r.jurisdiction} {r.tax_year}): {r.summary.strip()}" for r in list_rules()
    )
    return f"""You are Kiyos, answering a free-plan visitor's general India–US tax question. You have no access to their case and must not personalise.

- Answer only from the approved rules below (use lookup_rule for detail). If they don't cover the question, call submit_answer with needs_advisor true and a short reason; don't use general knowledge.
- Two to four plain sentences. State the jurisdiction and tax year of the rule you rely on, and cite its ID in cited_rule_ids.
- Never compute amounts.

Finish by calling submit_answer.

Approved rules:
{rules or '- (none)'}
"""


async def _answer_with_claude(
    session: AsyncSession, case: Case, history: list[Message], question: str, generic: bool = False
) -> Reply | None:
    if generic:
        system = _generic_system_prompt()
        messages: list[dict[str, Any]] = [{"role": "user", "content": scrub_pii(question)}]
        tools = [t for t in _TOOLS if t["name"] in ("lookup_rule", "submit_answer")]
    else:
        system = _system_prompt(case)
        messages = _history_messages(case, history, question)
        tools = _TOOLS

    for _ in range(MAX_TOOL_ROUNDS):
        response = await ai_call(
            session, service="converse", case_id=case.id, system=system, messages=messages, tools=tools
        )
        if response.stop_reason == "refusal":
            return Reply(content="", confidence=0.0, route=True, reason="Model declined to answer.")

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        final = next((b for b in tool_uses if b.name == "submit_answer"), None)
        if final:
            args = final.input
            return Reply(
                content=str(args.get("answer", "")).strip(),
                confidence=max(0.0, min(1.0, float(args.get("confidence", 0.0)))),
                cited_rules=list(args.get("cited_rule_ids") or []),
                route=bool(args.get("needs_advisor")),
                reason=args.get("reason") or None,
            )
        if not tool_uses:
            text = "".join(b.text for b in response.content if b.type == "text").strip()
            # Answered without the structured submit: treat as unscored.
            return Reply(content=text, confidence=0.5, reason="Answer was not self-scored.")

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in tool_uses:
            output, is_error = _run_tool(case, block.name, block.input)
            results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": output, "is_error": is_error}
            )
        messages.append({"role": "user", "content": results})

    return Reply(content="", confidence=0.0, route=True, reason="Agent did not converge.")


# ───────────────────────────────────────────────────────────── deterministic path


def _filing_status(case: Case) -> dict[str, Any]:
    customer_todos = [i for i in case.action_items if i.assignee == "customer" and i.status != "done"]
    dated = sorted(
        [(i.due_date, i.title) for i in case.action_items if i.due_date and i.status != "done"]
        + [(t.due_date, t.title) for t in case.topics if t.due_date and t.status != "resolved"]
        + [(n.deadline, n.subject) for n in case.notices if n.deadline and n.status != "resolved"]
    )
    today = date.today().isoformat()
    upcoming = [d for d in dated if d[0] >= today]
    overdue = [d for d in dated if d[0] < today]
    return {
        "today": today,
        "case_status": case.status,
        "open_topics": [t.title for t in case.topics if t.status != "resolved"],
        "customer_todos": [{"title": i.title, "due": i.due_date} for i in customer_todos],
        "documents_pending_review": [d.filename for d in case.documents if d.status not in ("extracted",)],
        "next_deadline": {"date": upcoming[0][0], "what": upcoming[0][1]} if upcoming else None,
        "overdue": [{"date": d, "what": w} for d, w in overdue],
        "latest_assessment": (
            {"headline": case.assessments[-1].headline, "status": case.assessments[-1].status}
            if case.assessments
            else None
        ),
    }


_COMMITTING = re.compile(
    r"\b(should i|can i|am i|do i owe|how much (tax|will)|withdraw|sell|cash out|elect|"
    r"which (option|scenario)|is it better|recommend)\b",
    re.IGNORECASE,
)


def _answer_deterministic(case: Case, question: str) -> Reply:
    q = question.lower()
    status = _filing_status(case)

    if _COMMITTING.search(q):
        return Reply(
            content="This needs a judgement on your specific facts.",
            confidence=0.3,
            route=True,
            reason="Personal or committing question — needs an advisor decision.",
        )

    if any(w in q for w in ("document", "upload", "send my", "paperwork")):
        pending = [d for d in case.documents if d.status != "extracted"]
        todos = [t["title"] for t in status["customer_todos"] if "upload" in t["title"].lower()]
        parts = []
        if pending:
            parts.append(
                "We have these still in progress: "
                + "; ".join(f"{d.filename} ({d.status})" for d in pending)
                + "."
            )
        if todos:
            parts.append("Still needed from you: " + "; ".join(todos) + ".")
        parts.append("Please upload through your secure workspace rather than sending files here.")
        return Reply(content=" ".join(parts), confidence=0.85, action=UPLOAD_ACTION)

    if any(w in q for w in ("deadline", "due", "when is", "by when")):
        nd, overdue = status["next_deadline"], status["overdue"]
        parts = [f"Your next deadline is {nd['date']}: {nd['what']}."] if nd else ["There's no upcoming deadline on your case."]
        if overdue:
            parts.append(
                "Past due and still open: "
                + "; ".join(f"{o['what']} ({o['date']})" for o in overdue[:3])
                + f" — {case.case_captain} is on it."
            )
        return Reply(content=" ".join(parts), confidence=0.85)

    if any(w in q for w in ("next", "first", "to do", "todo", "action")):
        todos = status["customer_todos"]
        if not todos:
            return Reply(content="Nothing is waiting on you right now — your case captain has the next steps.", confidence=0.85)
        listed = "; ".join(f"{t['title']}{' (due ' + t['due'] + ')' if t['due'] else ''}" for t in todos[:4])
        return Reply(content=f"Here's what's on your list: {listed}.", confidence=0.85)

    if any(w in q for w in ("rnor", "residen", "resident")):
        topic = next(
            (t for t in case.topics if "rnor" in t.topic_key or "residen" in t.topic_key), None
        )
        if topic and topic.conclusion:
            rules = [r.id for r in list_rules() if r.id.startswith("IN-RES")] if "rnor" in topic.topic_key else []
            return Reply(
                content=f"{topic.title}: {topic.conclusion}"
                + (f" (rule {', '.join(rules)})" if rules else ""),
                confidence=TOPIC_CONFIDENCE.get(topic.confidence, 0.5),
                cited_rules=rules,
                reason=None if topic.confidence in ("confirmed", "likely") else f"Topic confidence is {topic.confidence}.",
            )

    if any(w in q for w in ("summar", "explain", "situation", "overview", "status", "assessment")):
        resolved = [t.title for t in case.topics if t.status == "resolved"]
        open_ = status["open_topics"]
        parts = []
        if status["latest_assessment"]:
            la = status["latest_assessment"]
            parts.append(f"Latest assessment: {la['headline']} ({la['status'].replace('_', ' ')}).")
        if resolved:
            parts.append("Settled: " + "; ".join(resolved) + ".")
        if open_:
            parts.append("Still in progress: " + "; ".join(open_) + ".")
        return Reply(content=" ".join(parts) or (case.summary or "Your case is being set up."), confidence=0.8)

    return Reply(
        content="I don't have a grounded answer for that in your case record yet.",
        confidence=0.35,
        reason="No matching record or rule for this question.",
    )
