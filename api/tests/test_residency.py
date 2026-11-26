"""Residency is calculated from recorded stays and dated facts only."""

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.residency import calculate  # noqa: E402

TODAY = date(2026, 11, 17)
RETURNEE = {
    "left_india_on": "2016-08-20", "us_arrived_on": "2016-08-21",
    "us_departed_on": "2027-06-14", "india_return_date": "2027-06-15",
}
SHORT_TRIPS = [
    {"country": "IN", "arrived": "2023-12-15", "departed": "2024-01-10"},
    {"country": "IN", "arrived": "2024-12-18", "departed": "2025-01-12"},
    {"country": "IN", "arrived": "2025-10-20", "departed": "2025-11-05"},
]


def _year(rows, label):
    return next(r for r in rows if r["year"] == label)


def test_returnee_is_rnor_in_year_of_return():
    r = calculate(RETURNEE, SHORT_TRIPS, TODAY)
    fy = _year(r["india"], "FY 2027-28")
    assert fy["status"] == "RNOR" and fy["projected"]
    assert any(t["rule_id"] == "IN-RES-RNOR-9OF10" and t["passed"] for t in fy["tests"])


def test_short_visits_keep_non_resident():
    r = calculate(RETURNEE, SHORT_TRIPS, TODAY)
    fy = _year(r["india"], "FY 2025-26")
    assert fy["days"] == 17 and fy["status"] == "NR"


def test_departure_year_is_dual_status_in_us():
    r = calculate(RETURNEE, SHORT_TRIPS, TODAY)
    assert _year(r["us"], "2027")["status"] == "DUAL"
    assert _year(r["us"], "2026")["status"] == "RESIDENT"


def test_long_stay_makes_resident_by_182_days():
    stays = [{"country": "IN", "arrived": "2025-04-01", "departed": "2025-10-31"}]
    r = calculate({"left_india_on": "2014-06-01"}, stays, TODAY)
    fy = _year(r["india"], "FY 2025-26")
    assert fy["days"] == 214
    assert fy["status"] in ("RNOR", "ROR")
    assert any(t["rule_id"] == "IN-RES-182" and t["passed"] for t in fy["tests"])


def test_rules_are_flagged_pending_validation():
    assert calculate(RETURNEE, SHORT_TRIPS, TODAY)["rules_pending_validation"] is True


def test_green_card_holder_stays_us_resident_after_moving():
    facts = {"left_india_on": "2015-07-01", "us_arrived_on": "2015-07-02", "green_card_from": "2021-05-01", "india_return_date": "2027-03-20"}
    r = calculate(facts, [], TODAY)
    assert _year(r["us"], "2027")["status"] == "RESIDENT"
    assert _year(r["us"], "2028")["label"].startswith("Resident: green card")


def test_surrendered_green_card_gives_dual_status_year():
    facts = {"left_india_on": "2014-06-01", "us_arrived_on": "2014-06-02", "us_departed_on": "2025-08-13",
             "green_card_from": "2016-03-01", "green_card_until": "2025-09-10"}
    r = calculate(facts, [], TODAY)
    assert _year(r["us"], "2025")["status"] == "DUAL"
