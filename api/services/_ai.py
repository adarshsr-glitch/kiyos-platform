"""The one place that talks to the Claude API. Every call is logged to ai_call.

If ANTHROPIC_API_KEY is missing or still the .env.example placeholder, `ai_enabled()`
is False and callers fall back to their deterministic path.
"""

import os
import re
import time
from typing import Any

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from infra.schema import AiCall

MODEL_REASONING = os.getenv("MODEL_REASONING", "claude-opus-5-5")

_client: anthropic.AsyncAnthropic | None = None

# PII that must never leave the server (PRD privacy baseline).
PII_PATTERNS: dict[str, re.Pattern[str]] = {
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "PAN": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b", re.IGNORECASE),
    "Aadhaar": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
}


def find_pii(text: str) -> list[str]:
    return [label for label, pattern in PII_PATTERNS.items() if pattern.search(text)]


def scrub_pii(text: str) -> str:
    for label, pattern in PII_PATTERNS.items():
        text = pattern.sub(f"[{label} removed]", text)
    return text


def ai_enabled() -> bool:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    return key.startswith("sk-ant-") and not key.endswith("...")


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


async def ai_call(
    session: AsyncSession,
    *,
    service: str,
    case_id: int | None,
    system: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    max_tokens: int = 16000,
    effort: str = "low",
):
    """One Messages API request, logged to ai_call. Raises anthropic.APIError on failure."""
    started = time.monotonic()
    params: dict[str, Any] = dict(
        model=MODEL_REASONING,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        output_config={"effort": effort},
        # Re-run on a fallback model if the primary model declines.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if tools:
        params["tools"] = tools
    response = await _get_client().beta.messages.create(**params)
    session.add(
        AiCall(
            case_id=case_id,
            service=service,
            model=response.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            latency_ms=int((time.monotonic() - started) * 1000),
        )
    )
    return response


def log_fallback_call(session: AsyncSession, *, service: str, case_id: int | None, started: float) -> None:
    """Record a deterministic (no-LLM) answer so the audit trail stays complete."""
    session.add(
        AiCall(
            case_id=case_id,
            service=service,
            model="deterministic-fallback",
            prompt_tokens=0,
            completion_tokens=0,
            latency_ms=int((time.monotonic() - started) * 1000),
        )
    )
