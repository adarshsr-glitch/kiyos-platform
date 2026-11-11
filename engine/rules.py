"""Load knowledge/ YAML rules and evaluate their `logic` blocks.

Pure and deterministic: the only file I/O is reading YAML under knowledge/.
Rule thresholds live in YAML; this module only interprets logic kinds.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

_OPERATORS = {
    ">=": lambda a, b: a >= b,
    ">": lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    "<": lambda a, b: a < b,
    "==": lambda a, b: a == b,
}


class DerivationEntry(BaseModel):
    rule_id: str
    inputs_used: dict[str, Any]
    output: Any


class RuleTestCase(BaseModel):
    name: str
    inputs: dict[str, Any]
    expected: Any


class Rule(BaseModel):
    id: str
    jurisdiction: str
    tax_year: str
    summary: str
    status: str = "active"
    sources: list[dict[str, Any]] = []
    inputs: list[dict[str, Any]] = []
    logic: dict[str, Any]
    notes: str | None = None
    test_cases: list[RuleTestCase] = []
    path: str

    @property
    def explainer_path(self) -> Path:
        return KNOWLEDGE_DIR / Path(self.path).with_suffix(".md")

    def evaluate_bool(self, inputs: dict[str, Any]) -> bool:
        """Evaluate the rule's condition. Raises ValueError on missing inputs."""
        logic = self.logic
        kind = logic.get("kind")
        if kind == "threshold_count":
            values = inputs.get(logic["within"])
            if not isinstance(values, list):
                raise ValueError(f"missing input: {logic['within']}")
            count = sum(1 for v in values if v == logic["count_of"])
            return _OPERATORS[logic["operator"]](count, logic["threshold"])
        if kind == "threshold":
            value = inputs.get(logic["input"])
            if value is None:
                raise ValueError(f"missing input: {logic['input']}")
            return _OPERATORS[logic["operator"]](value, logic["threshold"])
        raise ValueError(f"unsupported logic kind: {kind}")

    def evaluate(self, inputs: dict[str, Any]) -> DerivationEntry:
        passed = self.evaluate_bool(inputs)
        returns = self.logic.get("returns") or {}
        output = returns.get(passed, returns.get(str(passed).lower(), passed))
        return DerivationEntry(rule_id=self.id, inputs_used=inputs, output=output)


@lru_cache(maxsize=1)
def _load_all() -> dict[str, Rule]:
    rules: dict[str, Rule] = {}
    for path in sorted(KNOWLEDGE_DIR.rglob("*.yaml")):
        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict) or "id" not in data:
            continue
        rules[data["id"]] = Rule(**data, path=str(path.relative_to(KNOWLEDGE_DIR)))
    return rules


def list_rules() -> list[Rule]:
    return list(_load_all().values())


def load_rule(rule_id: str) -> Rule | None:
    return _load_all().get(rule_id)
