"""Residency — each year's India and US tax residency, calculated from recorded facts.

Inputs are facts only: stays (periods of presence with their source) and dated
facts on the case (when the person left India, US residence period, green card,
planned return). Nothing here accepts hypothetical days. Every status carries the
rules that produced it, the inputs those rules saw, and the assumptions made where
records are incomplete, so the UI can show its work.

Rule thresholds live in knowledge/ YAML; this module only counts days and chooses
which rules apply.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from engine.rules import load_rule

DATE_KEYS = ("left_india_on", "us_arrived_on", "us_departed_on", "india_return_date", "green_card_from", "green_card_until")


@dataclass
class Period:
    start: date
    end: date  # inclusive


def _d(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _overlap(a: Period, b: Period) -> int:
    start, end = max(a.start, b.start), min(a.end, b.end)
    return (end - start).days + 1 if end >= start else 0


def fy_of(day: date) -> int:
    """Start year of the Indian financial year containing `day` (FY 2025-26 → 2025)."""
    return day.year if day.month >= 4 else day.year - 1


def fy_label(start_year: int) -> str:
    return f"FY {start_year}-{str(start_year + 1)[-2:]}"


def fy_period(start_year: int) -> Period:
    return Period(date(start_year, 4, 1), date(start_year + 1, 3, 31))


def cy_period(year: int) -> Period:
    return Period(date(year, 1, 1), date(year, 12, 31))


def _test(rule_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
    rule = load_rule(rule_id)
    if rule is None:
        raise ValueError(f"rule {rule_id} not found")
    entry = rule.evaluate(inputs)
    passed = rule.evaluate_bool(inputs)
    section = (rule.sources[0].get("section") if rule.sources else None)
    return {
        "rule_id": rule.id,
        "summary": " ".join(rule.summary.split()),
        "section": section,
        "rule_status": rule.status,
        "inputs": inputs,
        "result": entry.output,
        "passed": passed,
    }


class Residency:
    """Calculates the yearly picture for one case."""

    def __init__(self, facts: dict[str, str], stays: list[dict[str, Any]], today: date | None = None):
        self.today = today or date.today()
        self.facts = facts
        self.assumptions: list[str] = []
        self.left_india = _d(facts.get("left_india_on"))
        self.return_date = _d(facts.get("india_return_date"))
        self.us_from = _d(facts.get("us_arrived_on"))
        self.us_to = _d(facts.get("us_departed_on"))
        if not self.us_to and self.us_from and self.return_date:
            # Leaving the US to move back: the last US day is the day before the return.
            self.us_to = self.return_date - timedelta(days=1)
        self.gc_from = _d(facts.get("green_card_from"))
        self.gc_to = _d(facts.get("green_card_until"))

        self.india_stays: list[Period] = []
        self.india_stay_ids: list[int | None] = []  # the recorded Stay behind each period; None for the return date
        for s in stays:
            if s["country"] != "IN":
                continue
            start = _d(s["arrived"])
            end = _d(s.get("departed")) or date(9999, 12, 31)
            if start:
                self.india_stays.append(Period(start, end))
                self.india_stay_ids.append(s.get("id"))
        # A permanent return (planned or done) is a stay with no end.
        if self.return_date and not any(p.start == self.return_date for p in self.india_stays):
            self.india_stays.append(Period(self.return_date, date(9999, 12, 31)))
            self.india_stay_ids.append(None)

        if not self.left_india:
            self.assumptions.append("We don't have the date you first moved abroad, so earlier years are treated as non-resident.")
        if self.left_india:
            self.assumptions.append(
                f"Before you moved abroad on {self.left_india:%d %b %Y}, we count you as living in India."
            )
        if self.us_from:
            end = f"until {self.us_to:%d %b %Y}" if self.us_to else "to date"
            self.assumptions.append(
                f"US days assume you were in the US from {self.us_from:%d %b %Y} {end}, except on the India trips recorded."
            )
        if self.gc_from and not self.gc_to and (self.us_to or self.return_date):
            self.assumptions.append(
                "You still hold a US green card. The US treats you as resident for every year you hold it, even after you move, until it is formally given up."
            )
        if self.return_date and self.return_date > self.today:
            self.assumptions.append(
                f"Years after today are projected from the return date you gave us ({self.return_date:%d %b %Y})."
            )

    # ----------------------------------------------------------------- day counts

    def days_in_india(self, period: Period) -> int:
        days = 0
        if self.left_india and period.start < self.left_india:
            days += _overlap(period, Period(period.start, self.left_india - timedelta(days=1)))
        for stay in self.india_stays:
            days += _overlap(period, stay)
        return min(days, (period.end - period.start).days + 1)

    def india_parts(self, period: Period) -> list[dict[str, Any]]:
        """What a year's India days are made of: each recorded stay (or the years before moving
        abroad, or the return date) clipped to the year, with its day count. Counting only."""
        parts: list[dict[str, Any]] = []

        def clip(p: Period) -> tuple[date, date] | None:
            a, b = max(p.start, period.start), min(p.end, period.end)
            return (a, b) if a <= b else None

        if self.left_india and period.start < self.left_india:
            c = clip(Period(period.start, self.left_india - timedelta(days=1)))
            if c:
                parts.append({"kind": "lived", "fact": "left_india_on", "from": c[0].isoformat(), "to": c[1].isoformat(), "days": (c[1] - c[0]).days + 1})
        for stay, sid in zip(self.india_stays, self.india_stay_ids):
            c = clip(stay)
            if c:
                parts.append({"kind": "stay" if sid is not None else "return", "stay_id": sid, "fact": None if sid is not None else "india_return_date",
                              "from": c[0].isoformat(), "to": c[1].isoformat(), "days": (c[1] - c[0]).days + 1,
                              "open": stay.end.year == 9999, "projected": c[1] > self.today})
        return parts

    def days_in_us(self, period: Period) -> int:
        if not self.us_from:
            return 0
        us = Period(self.us_from, self.us_to or date(9999, 12, 31))
        total = _overlap(period, us)
        for stay in self.india_stays:
            inner = Period(max(stay.start, us.start), min(stay.end, us.end))
            if inner.end >= inner.start:
                total -= _overlap(period, inner)
        return max(total, 0)

    # ----------------------------------------------------------------- India

    def _india_status(self, fy: int, memo: dict[int, str]) -> tuple[str, list[dict[str, Any]]]:
        days = self.days_in_india(fy_period(fy))
        prev4 = sum(self.days_in_india(fy_period(fy - i)) for i in range(1, 5))
        prev7 = sum(self.days_in_india(fy_period(fy - i)) for i in range(1, 8))
        living_abroad = bool(self.left_india and self.left_india < fy_period(fy).start)
        returning_this_year = bool(self.return_date and fy_of(self.return_date) == fy)
        visit = living_abroad and not returning_this_year
        tests = [
            _test("IN-RES-182", {"days_in_india": days}),
            _test("IN-RES-60-365", {"days_in_india": days, "days_in_india_prev4": prev4, "visit_exception_applies": visit}),
        ]
        if not any(t["passed"] for t in tests):
            return "NR", tests
        previous = [self._india_memo(fy - i, memo) for i in range(1, 11)]
        tests.append(_test("IN-RES-RNOR-9OF10", {"previous_year_statuses": previous}))
        tests.append(_test("IN-RES-RNOR-729DAYS", {"days_in_india_prev7": prev7}))
        return ("RNOR" if tests[-1]["passed"] or tests[-2]["passed"] else "ROR"), tests

    def _india_memo(self, fy: int, memo: dict[int, str]) -> str:
        if fy not in memo:
            # Far enough back that it can't change the result: before the person left
            # India they were resident; with no departure date on record, assume NR
            # (and say so).
            floor = fy_of(self.left_india) - 11 if self.left_india else fy_of(self.today) - 12
            if fy < floor:
                memo[fy] = "ROR" if self.left_india else "NR"
            else:
                memo[fy] = "PENDING"
                memo[fy] = self._india_status(fy, memo)[0]
        return memo[fy]

    def india_years(self, first: int, last: int) -> list[dict[str, Any]]:
        memo: dict[int, str] = {}
        out = []
        for fy in range(first, last + 1):
            status, tests = self._india_status(fy, memo)
            memo[fy] = status
            period = fy_period(fy)
            out.append({
                "year": fy_label(fy),
                "start": period.start.isoformat(),
                "end": period.end.isoformat(),
                "days": self.days_in_india(period),
                "parts": self.india_parts(period),
                "status": status,
                "label": {"NR": "Non-resident", "RNOR": "Resident but not ordinarily resident", "ROR": "Resident and ordinarily resident"}[status],
                "projected": period.end > self.today,
                "current": period.start <= self.today <= period.end,
                "tests": tests,
            })
        return out

    # ----------------------------------------------------------------- US

    def _us_resident(self, year: int) -> tuple[bool, list[dict[str, Any]]]:
        gc = bool(self.gc_from and self.gc_from <= cy_period(year).end and (not self.gc_to or self.gc_to >= cy_period(year).start))
        tests = [_test("US-RES-GREEN-CARD", {"green_card_in_year": gc})]
        tests.append(_test("US-RES-SPT", {
            "days_in_us": self.days_in_us(cy_period(year)),
            "days_in_us_prev1": self.days_in_us(cy_period(year - 1)),
            "days_in_us_prev2": self.days_in_us(cy_period(year - 2)),
        }))
        return any(t["passed"] for t in tests), tests

    def us_years(self, first: int, last: int) -> list[dict[str, Any]]:
        out = []
        for year in range(first, last + 1):
            period = cy_period(year)
            resident, tests = self._us_resident(year)
            ends_here = bool(self.us_to and period.start <= self.us_to <= period.end)
            starts_here = bool(self.us_from and period.start < self.us_from <= period.end)
            # A green card still held keeps the person resident for the whole year,
            # even after they leave, until it is formally given up.
            gc_held = bool(tests[0]["passed"] and (not self.gc_to or self.gc_to >= period.end))
            if resident and gc_held and (ends_here or (self.us_to and period.start > self.us_to)):
                status, label = "RESIDENT", "Resident: green card still held"
            elif resident and (ends_here or starts_here):
                status, label = "DUAL", "Dual-status: resident for part of the year"
            elif resident:
                status, label = "RESIDENT", "Resident"
            else:
                status, label = "NONRESIDENT", "Non-resident"
            out.append({
                "year": str(year),
                "start": period.start.isoformat(),
                "end": period.end.isoformat(),
                "days": self.days_in_us(period),
                "status": status,
                "label": label,
                "projected": period.end > self.today,
                "current": period.start <= self.today <= period.end,
                "tests": tests,
            })
        return out


def calculate(facts: dict[str, str], stays: list[dict[str, Any]], today: date | None = None) -> dict[str, Any]:
    r = Residency(facts, stays, today)
    now = r.today
    anchor = fy_of(r.return_date) if r.return_date else fy_of(now)
    first_fy = min(fy_of(now) - 1, anchor - 1)
    # A return late in a financial year makes the next year the first full one back: show it.
    last_fy = max(fy_of(now), anchor) + (1 if r.return_date and r.return_date.month in (1, 2, 3) else 0)
    first_cy = first_fy
    last_cy = last_fy + (1 if r.return_date and r.return_date.month < 4 else 0)
    india = r.india_years(first_fy, last_fy)
    us = r.us_years(first_cy, max(last_cy, first_cy)) if r.us_from else []
    pending = any(t["rule_status"] != "active" for y in india + us for t in y["tests"])
    return {"india": india, "us": us, "assumptions": r.assumptions, "rules_pending_validation": pending}
