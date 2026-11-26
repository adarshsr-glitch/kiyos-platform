"""The rule library for the expert workspace: the index of rules Kiyos needs (knowledge/index.yaml,
titles and references only), and every rule the engine loads, with its tests run now and where
it has been cited. Read-only. The rules themselves are the YAML files under
knowledge/; nothing here changes or interprets them (C-03, JX-13).
"""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from engine import rules as engine
from infra.schema import Assessment, Case, Ticket

router = APIRouter()
FLAGS_PATH = Path(__file__).resolve().parents[1] / "data" / "rule-flags.json"


def _flags() -> list[dict]:
    try:
        return json.loads(FLAGS_PATH.read_text())
    except (OSError, ValueError):
        return []


def _git_dates(path: Path) -> tuple[Optional[str], Optional[str]]:
    """When the rule file was first added and last changed, from git history (commit dates)."""
    def log(*args: str) -> Optional[str]:
        try:
            out = subprocess.run(["git", "log", *args, "--format=%aI", "--", str(path)], cwd=path.parent, capture_output=True, text=True, timeout=5).stdout.split()
            return out[-1] if "--diff-filter=A" in args and out else (out[0] if out else None)
        except (OSError, subprocess.SubprocessError):
            return None
    return log("--diff-filter=A"), log("-1")


class FlagIn(BaseModel):
    note: str
    by: Optional[str] = None


@router.post("/rules/{rule_id}/flags")
async def flag_rule(rule_id: str, body: FlagIn):
    """An expert flags a rule for the tax team to look at (it may be out of date or miss a case).
    A flag changes nothing in the rule; it is a note with a name and a date."""
    if not engine.load_rule(rule_id):
        raise HTTPException(status_code=404, detail="Rule not found")
    if not body.note.strip():
        raise HTTPException(status_code=422, detail="Say what looks wrong")
    flags = _flags()
    flag = {"id": (max((f["id"] for f in flags), default=0) + 1), "rule_id": rule_id, "note": body.note.strip(),
            "by": body.by or "An expert", "at": datetime.now(timezone.utc).isoformat(), "resolved_at": None, "resolved_by": None}
    flags.append(flag)
    FLAGS_PATH.write_text(json.dumps(flags, indent=2))
    return flag


@router.post("/rules/flags/{flag_id}/resolve")
async def resolve_flag(flag_id: int, by: Optional[str] = None):
    flags = _flags()
    flag = next((f for f in flags if f["id"] == flag_id), None)
    if not flag:
        raise HTTPException(status_code=404, detail="No such flag")
    flag["resolved_at"] = datetime.now(timezone.utc).isoformat()
    flag["resolved_by"] = by or "An expert"
    FLAGS_PATH.write_text(json.dumps(flags, indent=2))
    return flag
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

    all_flags = _flags()
    out = []
    for r in engine.list_rules():
        path = engine.KNOWLEDGE_DIR / r.path
        explainer = r.explainer_path
        used = cited.get(r.id, {"assessments": 0, "answers": 0, "cases": {}})
        added, changed = _git_dates(path) if path.exists() else (None, None)
        out.append({
            "id": r.id, "jurisdiction": r.jurisdiction, "tax_year": r.tax_year, "topic": Path(r.path).parent.name,
            "summary": r.summary.strip(), "status": r.status, "sources": r.sources, "inputs": r.inputs, "logic": r.logic,
            "notes": (r.notes or "").strip() or None, "tests": _run(r),
            "explainer": explainer.read_text() if explainer.exists() else None,
            "path": r.path, "yaml": path.read_text() if path.exists() else None, "added": added, "changed": changed,
            "flags": [f for f in all_flags if f["rule_id"] == r.id],
            "cited": {"assessments": used["assessments"], "answers": used["answers"],
                      "cases": [{"id": k, "customer": v} for k, v in used["cases"].items()]},
        })
    written = {r["id"]: r for r in out}
    idx_path = engine.KNOWLEDGE_DIR / "index.yaml"
    index = (yaml.safe_load(idx_path.read_text()) or {}).get("index", []) if idx_path.exists() else []
    listed = {e["id"] for e in index}
    entries = [{**e, "status": written[e["id"]]["status"] if e["id"] in written else "not_written"} for e in index]
    # A rule file the index doesn't list yet still shows, under its own area.
    entries += [{"id": r["id"], "country": r["jurisdiction"], "area": r["topic"].replace("-", " ").capitalize(), "title": r["summary"],
                 "law": (r["sources"][0].get("id") if r["sources"] else None), "section": (r["sources"][0].get("section") if r["sources"] else None),
                 "kind": "rule", "status": r["status"]} for r in out if r["id"] not in listed]
    return {"rules": sorted(out, key=lambda x: (x["jurisdiction"], x["topic"], x["id"])), "index": entries}
