"""Every knowledge/ rule must ship test cases, and every test case must pass."""

import pytest

from engine.rules import list_rules

RULES = list_rules()


@pytest.mark.parametrize("rule", RULES, ids=[r.id for r in RULES])
def test_rule_has_test_cases(rule):
    assert len(rule.test_cases) >= 2, f"{rule.id} needs at least two test_cases"


@pytest.mark.parametrize(
    "rule,case",
    [(r, c) for r in RULES for c in r.test_cases],
    ids=[f"{r.id}:{c.name}" for r in RULES for c in r.test_cases],
)
def test_rule_case(rule, case):
    assert rule.evaluate_bool(case.inputs) == case.expected
