"""The rule library for the expert workspace: every rule the engine loads, with its tests run now
and where it has been cited. Read-only. The rules themselves are the YAML files under
knowledge/; nothing here changes or interprets them (C-03, JX-13).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from engine import rules as engine
from infra.schema import Assessment, Case, Ticket

router = APIRouter()
RULE_ID = re.compile(r"\b(?:IN|US)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b")


def _run(rule: engine.Rule) -> list[dict[str, Any]]:
    out = []
    for t in rule.test_cases:
        try:
            got: Any = engine._evaluate(rule.logic, t.inputs)
            error = None
        except Exception as e:  # a test that can't run is reported, not hidden
            got, error = None, str(e)
        out.append({"name": t.name, "inputs": t.inputs, "expected": t.expected, "got": got, "passed": error is None and got == t.expected, "error": error})
    return out


@router.get("/rules")
async def rule_library(session: AsyncSession = Depends(get_session)):
    cases = {c.id: c.client_name for c in (await session.execute(select(Case))).scalars()}
    cited: dict[str, dict[str, Any]] = {}

    def cite(rid: str, case_id: int, kind: str) -> None:
        c = cited.setdefault(rid, {"assessments": 0, "answers": 0, "cases": {}})
        c[kind] += 1
        if case_id in cases:
            c["cases"][case_id] = cases[case_id]

    for a in (await session.execute(select(Assessment))).scalars():
        for rid in dict.fromkeys(s.get("rule_id") for s in (a.derivation_trail or []) if s.get("rule_id")):
            cite(rid, a.case_id, "assessments")
    for t in (await session.execute(select(Ticket))).scalars():
        for rid in dict.fromkeys((t.cited_rules or []) + RULE_ID.findall(t.draft_answer or "") + RULE_ID.findall(t.resolution or "")):
            cite(rid, t.case_id, "answers")

    out = []
    for r in engine.list_rules():
        path = engine.KNOWLEDGE_DIR / r.path
        explainer = r.explainer_path
        used = cited.get(r.id, {"assessments": 0, "answers": 0, "cases": {}})
        out.append({
            "id": r.id, "jurisdiction": r.jurisdiction, "tax_year": r.tax_year, "topic": Path(r.path).parent.name,
            "summary": r.summary.strip(), "status": r.status, "sources": r.sources, "inputs": r.inputs, "logic": r.logic,
            "notes": (r.notes or "").strip() or None, "tests": _run(r),
            "explainer": explainer.read_text() if explainer.exists() else None,
            "path": r.path, "yaml": path.read_text() if path.exists() else None,
            "cited": {"assessments": used["assessments"], "answers": used["answers"],
                      "cases": [{"id": k, "customer": v} for k, v in used["cases"].items()]},
        })
    return sorted(out, key=lambda x: (x["jurisdiction"], x["topic"], x["id"]))
