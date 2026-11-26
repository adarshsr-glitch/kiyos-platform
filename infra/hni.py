"""Synthetic HNI enrichment for the seeded paid customers (cases 1–6) and the journey personas.

The seeded paid cases carry salaries and a few balances, but not the full picture a
high-net-worth cross-border client brings: property, portfolios, retirement accounts in
both countries, investment income, travel records, document requests in every state and
a per-country tax estimate. This module adds that, so the customer dashboards have a
realistic picture to draw.

Every record added here is synthetic and marked as such: facts carry
source = "illustrative", stays carry source = "Illustrative travel record", and each
tax estimate says it is illustrative. The UI labels them accordingly; nothing here is
presented as a confirmed figure.

Safety:
  - Additive and idempotent. Each item is checked by key/title before insert; nothing is
    updated in place except a case's empty `country_status`, and nothing is deleted.
  - Runs at API start-up (after seed_journey / seed_prospects) and can be run once by
    hand: `cd api && PYTHONPATH=.. poetry run python -m infra.hni` (or plain python).
  - Journey personas get their own specs (PERSONAS), applied after every reset too, so a
    reset never loses them. Existing holdings the journeys depend on are left as they are.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select  # noqa: E402

from db import async_session  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402

from infra.schema import (  # noqa: E402
    ActionItem, Assessment, Case, CaseEvent, CaseNote, Conversation, DocumentRequest, Fact,
    HouseholdMember, Message, Stay, TaxTopic, Ticket,
)

SOURCE = "illustrative"
STAY_SOURCE = "Illustrative travel record"


def _h(id: str, country: str, kind: str, label: str, amount: float, detail: str | None = None) -> dict[str, Any]:
    currency = "INR" if country == "IN" else "USD"
    return {
        "id": f"hni-{id}",
        "country": country,
        "kind": kind,
        "label": label,
        "currency": currency,
        "band": _band(amount, currency),
        "amount": amount,
        **({"detail": detail} if detail else {}),
    }


def _r(id: str, country: str, kind: str, label: str, band: str, detail: str | None = None) -> dict[str, Any]:
    """A holding known only as a range (no documented amount)."""
    return {
        "id": f"hni-{id}",
        "country": country,
        "kind": kind,
        "label": label,
        "currency": "INR" if country == "IN" else "USD",
        "band": band,
        **({"detail": detail} if detail else {}),
    }


def _band(n: float, cur: str) -> str:
    if cur == "INR":
        for lo, hi, label in [(0, 5e5, "Under ₹5L"), (5e5, 25e5, "₹5–25L"), (25e5, 1e7, "₹25L–1Cr"), (1e7, 5e7, "₹1–5Cr")]:
            if lo <= n < hi:
                return label
        return "Over ₹5Cr"
    for lo, hi, label in [(0, 1e4, "Under $10k"), (1e4, 5e4, "$10–50k"), (5e4, 2.5e5, "$50–250k"), (2.5e5, 1e6, "$250k–1M")]:
        if lo <= n < hi:
            return label
    return "Over $1M"


def _est(country: str, year: str, form: str, liability: float, withheld: float, due: str, basis: str) -> dict[str, Any]:
    return {
        "country": country,
        "year": year,
        "form": form,
        "currency": "INR" if country == "IN" else "USD",
        "liability": liability,
        "withheld": withheld,
        "due": due,
        "status": "estimate",
        "basis": basis,
    }


# Per case: holdings (assets and income), dated residency facts, India visits, household
# members, document requests, country status (only if empty) and tax estimates.
SPECS: dict[int, dict[str, Any]] = {
    1: {  # Arjun Rao: H-1B, returned to India Jul 2026, RNOR
        "holdings": [
            _h("in-pune-flat", "IN", "asset", "Flat in Pune (rented out)", 24_000_000, "Kalyani Nagar"),
            _h("in-blr-plot", "IN", "asset", "Residential plot, Bengaluru", 18_000_000, "Sarjapur Road"),
            _h("in-mf", "IN", "asset", "Mutual funds", 11_500_000, "9 schemes"),
            _h("in-fd", "IN", "asset", "NRE/NRO fixed deposits", 6_500_000, "HDFC, ICICI"),
            _h("us-hysa", "US", "asset", "Savings account", 85_000, "Chase"),
            _h("us-roth", "US", "asset", "Roth IRA", 95_000, "Fidelity"),
            _h("us-div", "US", "income", "Dividends", 6_800, "Schwab, 2026"),
            _h("us-cg", "US", "income", "Capital gains", 18_400, "Schwab, 2026"),
            _h("in-div", "IN", "income", "Dividends", 210_000, "FY 2026-27"),
            _h("in-int", "IN", "income", "FD interest", 460_000, "FY 2026-27"),
        ],
        "facts": {"left_india_on": "2017-08-05", "us_arrived_on": "2017-08-06", "us_departed_on": "2026-07-14"},
        "stays": [("2023-12-18", "2024-01-01"), ("2024-12-20", "2024-12-27"), ("2025-12-15", "2025-12-26")],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 2_230_000, 2_090_000, "2027-07-31", "Salary from July, Pune rent and deposit interest, as RNOR"),
            _est("US", "2026", "1040 (dual-status)", 24_800, 27_300, "2027-04-15", "Stripe salary Jan–Jul and Schwab income"),
        ],
    },
    2: {  # Priya Shah: US citizen (OCI) in San Francisco, NR in India
        "holdings": [
            _h("in-mum-flat", "IN", "asset", "Flat in Mumbai (rented out)", 42_000_000, "Bandra West"),
            _h("in-mf", "IN", "asset", "Mutual funds (inherited)", 7_800_000, "4 schemes"),
            _h("us-brokerage", "US", "asset", "Brokerage account", 640_000, "Schwab"),
            _h("us-401k", "US", "asset", "401(k)", 410_000, "Fidelity"),
            _h("us-hysa", "US", "asset", "Savings account", 120_000, "Marcus"),
            _h("us-div", "US", "income", "Dividends", 14_200, "2026"),
            _h("us-cg", "US", "income", "Capital gains", 38_000, "2026"),
            _h("in-div", "IN", "income", "Dividends", 95_000, "FY 2026-27"),
        ],
        "facts": {"left_india_on": "2009-07-20", "us_arrived_on": "2009-07-21"},
        "stays": [("2024-12-20", "2025-01-16"), ("2025-11-28", "2025-12-29")],
        "country_status": {
            "IN": {"status": "NR", "label": "Non-resident", "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Collecting documents"},
            "US": {"status": "RESIDENT", "label": "US citizen: taxed on worldwide income", "year": "Tax year 2026", "filing": "1040", "due": "2027-04-15", "state": "Planning"},
        },
        "requests": [
            ("Form 16A for rental TDS, FY 2025-26", "IN", "interest_certificate", "reviewed", 30),
            ("Mumbai flat rental agreement", "IN", "rental_agreement", "reviewed", 30),
            ("Schwab 1099 composite, 2026", "US", "brokerage_statement", "pending", 70),
            ("Inherited mutual fund statement (CAS)", "IN", "mf_cas", "received", 20),
            ("Chennai land valuation report", "IN", "property_document", "rejected", 10),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 96_500, 68_000, "2027-07-31", "Mumbai rent after standard deduction, as NR"),
            _est("US", "2026", "1040", 52_400, 49_800, "2027-04-15", "Databricks salary, Schwab income, credit for India tax on rent"),
        ],
    },
    3: {  # Michael Thompson: US citizen living in Bengaluru since 2015
        "holdings": [
            _h("in-goa-villa", "IN", "asset", "Villa in Goa (rented out)", 16_000_000, "Assagao"),
            _h("in-equity", "IN", "asset", "Listed shares", 6_200_000, "Zerodha"),
            _h("us-brokerage", "US", "asset", "Brokerage account", 310_000, "Vanguard"),
            _h("us-roth", "US", "asset", "Roth IRA", 140_000, "Vanguard"),
            _h("in-rent", "IN", "income", "Rental income", 960_000, "Goa villa, per year"),
            _h("in-div", "IN", "income", "Dividends", 180_000, "FY 2026-27"),
            _h("us-div", "US", "income", "Dividends", 7_900, "2026"),
        ],
        "country_status": {
            "IN": {"status": "ROR", "label": "Resident and ordinarily resident", "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Collecting documents"},
            "US": {"status": "RESIDENT", "label": "US citizen: taxed on worldwide income", "year": "Tax year 2026", "filing": "1040 + Form 1116", "due": "2027-06-15", "state": "Planning"},
        },
        "requests": [
            ("Form 16 from Oracle India, FY 2026-27", "IN", "form_16", "pending", 60),
            ("Kuvera mutual fund statement", "IN", "mf_cas", "reviewed", 40),
            ("Fidelity 401(k) year-end statement", "US", "401k_statement", "reviewed", 40),
            ("Goa villa rental agreement", "IN", "rental_agreement", "received", 15),
            ("Vanguard 1099, 2026", "US", "brokerage_statement", "pending", 75),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 3_060_000, 2_890_000, "2027-07-31", "Oracle salary, Goa rent and dividends, as ROR"),
            _est("US", "2026", "1040 + Form 1116", 4_100, 0, "2027-06-15", "Worldwide income after credit for Indian tax"),
        ],
    },
    4: {  # Rohit Krishnan: H-1B, transferring to India Feb 2027
        "holdings": [
            _h("us-etrade", "US", "asset", "Brokerage (vested RSUs)", 1_420_000, "E*TRADE"),
            _h("us-hysa", "US", "asset", "Savings account", 95_000, "Ally"),
            _h("in-chn-flat", "IN", "asset", "Flat in Chennai (parents live here)", 29_000_000, "Adyar"),
            _h("in-mf", "IN", "asset", "Mutual funds", 13_500_000, "6 schemes"),
            _h("in-nre", "IN", "asset", "NRE fixed deposits", 8_500_000, "SBI"),
            _h("us-div", "US", "income", "Dividends", 9_800, "2026"),
            _h("us-cg", "US", "income", "Capital gains", 21_000, "2026, short-term"),
            _h("in-int", "IN", "income", "NRE interest (exempt)", 610_000, "FY 2026-27"),
        ],
        "facts": {"left_india_on": "2015-08-10", "us_arrived_on": "2015-08-11", "india_return_date": "2027-02-15", "us_departed_on": "2027-02-14"},
        "stays": [("2024-12-14", "2024-12-31"), ("2025-12-10", "2025-12-31")],
        "members": [("Kavya Krishnan", "spouse", "Indian", "H-4 (US)")],
        "requests": [
            ("Carta RSU vest report, 2026", "US", "brokerage_statement", "reviewed", 30),
            ("Options grant agreement and 409A", "US", "generic", "received", 10),
            ("India offer letter with transfer date", "IN", "generic", "reviewed", 30),
            ("NRE fixed deposit certificates", "IN", "interest_certificate", "pending", 45),
            ("Passport pages with India entries", "BOTH", "passport", "pending", 30),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 120_000, 145_000, "2027-07-31", "Mutual fund gains; NRE interest is exempt while NR"),
            _est("US", "2026", "1040", 205_000, 188_000, "2027-04-15", "Salary, RSU vest and short-term gains"),
        ],
    },
    5: {  # Anil & Divya Menon: US citizens in Houston with Indian assets
        "holdings": [
            _h("in-kochi", "IN", "asset", "Ancestral house, Kochi", 26_000_000, "Joint with Anil's sister"),
            _h("in-mf", "IN", "asset", "Mutual funds", 9_600_000, "6 schemes"),
            _h("in-nro", "IN", "asset", "NRO fixed deposits", 5_400_000, "3 accounts"),
            _h("us-401k-anil", "US", "asset", "401(k): Anil", 780_000, "Fidelity"),
            _h("us-401k-divya", "US", "asset", "401(k): Divya", 430_000, "Empower"),
            _h("us-529", "US", "asset", "529 college plans", 210_000, "Meera and Arav"),
            _h("us-div", "US", "income", "Dividends", 31_000, "2026"),
            _h("in-rent", "IN", "income", "Rental income", 420_000, "Chennai apartment, per year"),
            _h("in-int", "IN", "income", "FD interest", 390_000, "FY 2026-27"),
        ],
        "country_status": {
            "IN": {"status": "NR", "label": "Non-resident", "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Cross-checking past CA filings"},
            "US": {"status": "RESIDENT", "label": "US citizens: taxed on worldwide income", "year": "Tax year 2026", "filing": "1040 (joint)", "due": "2027-04-15", "state": "Planning"},
        },
        "requests": [
            ("Schedule FA as filed by your Chennai CA", "IN", "prior_returns", "reviewed", 40),
            ("Mutual fund statements (CAS), all 6 schemes", "IN", "mf_cas", "received", 12),
            ("Vanguard 1099, 2026", "US", "brokerage_statement", "pending", 75),
            ("NRO interest certificates", "IN", "interest_certificate", "pending", 50),
            ("Chennai apartment rental agreement", "IN", "rental_agreement", "rejected", 8),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 190_000, 230_000, "2027-07-31", "Chennai rent and NRO interest, as NR"),
            _est("US", "2026", "1040 (joint)", 118_000, 121_500, "2027-04-15", "Two salaries, Vanguard income, credit for Indian tax"),
        ],
    },
    6: {  # Dr. Lakshmi Iyer: US citizen, retiring to Mumbai Apr 2027
        "holdings": [
            _h("in-nro", "IN", "asset", "NRO fixed deposits", 11_000_000, "Kotak"),
            _h("in-mf", "IN", "asset", "Mutual funds", 24_000_000, "8 schemes"),
            _h("us-div", "US", "income", "Dividends", 58_000, "Fidelity, 2026"),
            _h("us-cg", "US", "income", "Capital gains", 96_000, "Fidelity, 2026"),
            _h("in-int", "IN", "income", "FD interest", 820_000, "FY 2026-27"),
        ],
        "country_status": {
            "IN": {"status": "NR", "label": "Non-resident until your return in April 2027", "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Planning the move"},
            "US": {"status": "RESIDENT", "label": "US citizen: taxed on worldwide income", "year": "Tax year 2026", "filing": "1040", "due": "2027-04-15", "state": "Planning"},
        },
        "requests": [
            ("Fidelity 1099 composite, 2026", "US", "brokerage_statement", "pending", 75),
            ("Vanguard IRA statement", "US", "401k_statement", "reviewed", 30),
            ("Powai bungalow valuation, 2026", "IN", "property_document", "reviewed", 30),
            ("Kotak NRO interest certificate", "IN", "interest_certificate", "received", 10),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 260_000, 256_000, "2027-07-31", "NRO interest and fund gains, as NR"),
            _est("US", "2026", "1040", 41_000, 38_000, "2027-04-15", "Dividends and gains; estimated payments made"),
        ],
    },
}


# Journey personas, keyed by demo_key. Applied after each persona reset (infra.personas)
# and at start-up to the persona cases that exist. Established cases (Preeti, Rohan) get
# amounts and estimates; new customers (Ananya, and Arjun once he has paid) get ranges
# only, because their journeys are about documents not yet received. No document
# requests for the new customers: the expert's suggested requests are part of Journey 3.
PERSONAS: dict[str, dict[str, Any]] = {
    "preeti": {
        "holdings": [
            _h("us-etrade", "US", "asset", "Brokerage (vested Amazon RSUs)", 420_000, "E*TRADE"),
            _h("us-hysa", "US", "asset", "Savings account", 85_000, "Capital One"),
            _h("in-kochi-flat", "IN", "asset", "Flat in Kochi (home from 2027)", 26_000_000, "Panampilly Nagar"),
            _h("in-plot", "IN", "asset", "Plot in Thrissur (inherited)", 14_000_000),
            _h("in-mf", "IN", "asset", "Mutual funds", 12_000_000, "7 schemes"),
            _h("us-rsu", "US", "income", "RSU vests", 96_000, "Amazon, 2026"),
            _h("us-div", "US", "income", "Dividends", 5_200, "2026"),
            _h("in-div", "IN", "income", "Dividends", 110_000, "FY 2026-27"),
        ],
        "requests": [
            ("Kochi flat sale deed", "IN", "property_document", "received", 20),
            ("E*TRADE RSU statement, 2026", "US", "brokerage_statement", "pending", 40),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 160_000, 190_000, "2027-07-31", "NRO interest and fund gains, as NR"),
            _est("US", "2026", "Form 1040", 61_200, 57_900, "2027-04-15", "Amazon salary and RSU vests, Schwab and E*TRADE income"),
        ],
    },
    "rohan": {
        "holdings": [
            _h("in-blr-flat", "IN", "asset", "Flat in Bengaluru (home)", 32_000_000, "Indiranagar"),
            _h("in-mf", "IN", "asset", "Mutual funds", 11_000_000, "5 schemes"),
            _h("in-equity", "IN", "asset", "Listed shares", 9_000_000, "Zerodha"),
            _h("us-vanguard", "US", "asset", "Brokerage account", 380_000, "Vanguard"),
            _h("us-ira", "US", "asset", "Rollover IRA", 210_000, "Fidelity"),
            _h("us-hysa", "US", "asset", "Savings account", 60_000, "Chase"),
            _h("in-div", "IN", "income", "Dividends", 240_000, "FY 2026-27"),
            _h("us-div", "US", "income", "Dividends", 8_600, "2026"),
            _h("us-cg", "US", "income", "Capital gains", 14_000, "2026"),
        ],
        "requests": [
            ("Bengaluru flat registration deed", "IN", "property_document", "reviewed", 30),
            ("Vanguard 1099, 2026", "US", "brokerage_statement", "pending", 75),
            ("Mutual fund statement (CAS)", "IN", "mf_cas", "received", 10),
        ],
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 1_560_000, 1_480_000, "2027-07-31", "Bengaluru salary and dividends"),
            _est("US", "2026", "1040-NR", 2_900, 3_400, "2027-06-15", "US dividends and gains as a non-resident"),
        ],
    },
    "ananya": {
        "holdings": [
            _r("in-plot", "IN", "asset", "Plot in Gachibowli", "₹1–5Cr"),
            _r("in-mf", "IN", "asset", "Mutual funds", "₹1–5Cr"),
            _r("us-brokerage", "US", "asset", "Brokerage account", "$250k–1M"),
            _r("us-401k", "US", "asset", "401(k)", "$250k–1M"),
            _r("us-401k-spouse", "US", "asset", "401(k): Rohit", "$250k–1M"),
            _r("us-div", "US", "income", "Dividends", "$10–50k"),
        ],
    },
    # Arjun Mehta: the complete demo case, seen by Arjun (customer) and by Sidhant
    # Srivastava (his case captain). Seattle-based, H-1B, moving back to Pune in April 2027.
    "arjun": {
        "paid_only": True,
        "holdings": [
            _h("in-flat", "IN", "asset", "Flat in Pune (rented out)", 28_000_000, "Baner"),
            _h("in-fd", "IN", "asset", "Fixed deposits", 7_200_000, "HDFC, ICICI"),
            _h("in-plot", "IN", "asset", "Plot in Nashik (inherited)", 16_000_000),
            _h("in-equity", "IN", "asset", "Listed shares", 4_800_000, "Zerodha"),
            _h("us-brokerage", "US", "asset", "Brokerage (vested RSUs)", 640_000, "E*TRADE"),
            _h("us-roth", "US", "asset", "Roth IRA", 140_000, "Fidelity"),
            _h("us-hysa", "US", "asset", "Savings account", 95_000, "Chase"),
            _h("us-rsu", "US", "income", "RSU vests", 210_000, "2026"),
            _h("us-div", "US", "income", "Dividends", 9_400, "2026"),
            _h("us-cg", "US", "income", "Capital gains", 26_000, "2026"),
            _h("in-rent", "IN", "income", "Rental income", 660_000, "Pune flat, per year"),
            _h("in-int", "IN", "income", "FD interest", 520_000, "FY 2026-27"),
        ],
        "stays": [("2023-12-20", "2024-01-08"), ("2024-06-10", "2024-06-24"), ("2024-12-19", "2025-01-04"), ("2026-06-02", "2026-06-16")],
        "members": [
            ("Arjun Mehta", "primary", "Indian", "H-1B (US)"),
            ("Kavya Mehta", "spouse", "Indian", "H-4 (US)"),
            ("Vihaan Mehta", "dependent", "US citizen", "US passport"),
        ],
        "country_status": {
            "IN": {"status": "NR", "label": "Non-resident", "year": "FY 2026-27", "filing": "ITR-2", "due": "2027-07-31", "state": "Collecting documents"},
            "US": {"status": "RESIDENT", "label": "Resident", "year": "Tax year 2026", "filing": "Form 1040", "due": "2027-04-15", "state": "Collecting documents"},
        },
        "estimates": [
            _est("IN", "FY 2026-27", "ITR-2", 210_000, 260_000, "2027-07-31", "Pune rent and deposit interest, as a non-resident"),
            _est("US", "2026", "Form 1040", 124_000, 117_800, "2027-04-15", "Salary, RSU vests and E*TRADE income; credit for Indian tax on rent"),
        ],
        "topics": [
            ("return-residency", "Your residency after the April 2027 move", "in_progress", "likely",
             "Kiyos calculates you as non-resident for FY 2026-27 and RNOR from FY 2027-28, from your travel record. Sidhant is reviewing it.",
             "Calculated from your trips: non-resident this year; RNOR from FY 2027-28 if the move date holds.",
             "Resident for 2026; 2027 becomes a dual-status year from the day you leave.",
             "Confirm the move date and review the day counts", 6),
            ("rsu-move", "RSUs vesting after you move", "open", "review_needed",
             "Vests after the move may be split between the US and India. Sidhant will work out the split once the vesting schedule is in.",
             "Part of a post-move vest may be taxable in India, depending on your status that year.",
             "Sourced by the days you worked in the US during the vesting period.",
             "Review the E*TRADE vesting schedule", 12),
            ("retirement", "Your 401(k) and Roth IRA after the move", "in_progress", "likely",
             "Leaving both invested is the likely recommendation; withdrawals before 59½ would cost the 10% US penalty.",
             "Growth is not taxed in India while you are RNOR; the position after that is being reviewed.",
             "Accounts stay in place; no tax on leaving them invested.",
             "Write up the options for the 401(k)", 9),
            ("pune-rent", "Rent from your Pune flat", "resolved", "confirmed",
             "Taxed in India, with a credit in the US for the Indian tax. Your tenant deducts tax at source.",
             "Taxable in India; tenant deducts TDS at the non-resident rate.",
             "Reported on your US return with a foreign tax credit.",
             None, None),
            ("pfic", "Indian mutual funds and US reporting", "open", "review_needed",
             "Indian funds can need extra US forms while you're a US resident. Waiting for your CAS statement.",
             "No India issue.",
             "May need Form 8621 for each fund while you are a US resident.",
             "Check the funds against the CAS statement", 15),
        ],
        "assessment": "Residency and return plan for the April 2027 move",
        "action_items": [
            ("Reviewing your 2025 US return", "advisor", "open", 5, "Checking it against the W-2 and E*TRADE statements you'll send."),
            ("Mapping your RSU vesting schedule against the move date", "advisor", "open", 9, "So the US/India split of each vest is ready before sign-off."),
        ],
        "tickets": [
            {
                "question": "Do I need to tell my US employer anything before I move back?",
                "draft": "Yes: they will stop US payroll on your last day, and any RSUs vesting after you leave are handled under their mobility policy.",
                "answer": "Yes. Tell them your last US working day so payroll and withholding stop correctly, and ask HR how vests after that date are handled. Send me whatever they reply and I'll fold it into your plan.",
                "days_ago": 12, "answered_after_hours": 20, "status": "resolved",
            },
            {
                "question": "Why does my assessment say I'll be RNOR rather than resident when I move back?",
                "draft": "Because you were non-resident in at least nine of the ten years before FY 2027-28, the RNOR test applies (IN-RES-RNOR-729DAYS). Pending review.",
                "days_ago": 1, "status": "open",
            },
        ],
        "notes": [
            "Plans to keep the Pune flat rented after the move. Recheck rent taxation for the RNOR years.",
        ],
        "review_status": "in_review",
    },
}


WHY = {
    "interest_certificate": "Shows the tax already deducted, so it is credited against what you owe.",
    "rental_agreement": "Confirms the rent and the period, which sets the taxable rental income.",
    "brokerage_statement": "Gives the dividends and gains for the year, with cost basis.",
    "mf_cas": "Lists each fund and its gains; needed for both returns.",
    "property_document": "Sets the value used for the property in both countries' disclosures.",
    "form_16": "Your employer's statement of salary and tax deducted.",
    "401k_statement": "Year-end balance for the foreign asset disclosures.",
    "prior_returns": "So this year's disclosures match what was filed before.",
    "passport": "Your entry and exit stamps fix the days counted for residency.",
    "generic": "Supports a position your expert is preparing.",
}


def _due(days: int) -> str:
    from datetime import date, timedelta

    return (date.today() + timedelta(days=days)).isoformat()


async def _apply(session, case: Case, spec: dict[str, Any]) -> int:
    """Add one spec's records to a case, skipping anything already there. No commit."""
    case_id = case.id
    n = 0
    keys = set((await session.execute(select(Fact.key).where(Fact.case_id == case_id))).scalars())

    for h in spec.get("holdings", []):
        key = f"holding:{h['id']}"
        if key not in keys:
            session.add(Fact(case_id=case_id, key=key, value=json.dumps(h, ensure_ascii=False), source=SOURCE))
            n += 1
    for key, value in spec.get("facts", {}).items():
        if key not in keys:
            session.add(Fact(case_id=case_id, key=key, value=value, source=SOURCE))
            n += 1
    for e in spec.get("estimates", []):
        key = f"tax_estimate:{e['country']}"
        if key not in keys:
            session.add(Fact(case_id=case_id, key=key, value=json.dumps(e, ensure_ascii=False), source=SOURCE))
            n += 1

    stays = {(s.arrived, s.departed) for s in (await session.execute(select(Stay).where(Stay.case_id == case_id))).scalars()}
    for arrived, departed in spec.get("stays", []):
        if (arrived, departed) not in stays:
            session.add(Stay(case_id=case_id, country="IN", arrived=arrived, departed=departed, source=STAY_SOURCE))
            n += 1

    names = set((await session.execute(select(HouseholdMember.name).where(HouseholdMember.case_id == case_id))).scalars())
    for name, role, citizenship, visa in spec.get("members", []):
        if name not in names:
            session.add(HouseholdMember(case_id=case_id, name=name, role=role, citizenship=citizenship, visa_status=visa, notes="Illustrative household member"))
            n += 1

    titles = set((await session.execute(select(DocumentRequest.title).where(DocumentRequest.case_id == case_id))).scalars())
    for title, country, doc_type, status, due_in in spec.get("requests", []):
        if title not in titles:
            session.add(DocumentRequest(
                case_id=case_id, title=title, country=country, doc_type=doc_type, status=status,
                why=WHY.get(doc_type, WHY["generic"]),
                rejection_reason="The copy was unreadable. Please upload a clearer scan." if status == "rejected" else None,
                due_date=_due(due_in),
            ))
            n += 1

    if spec.get("country_status") and not case.country_status:
        case.country_status = spec["country_status"]
        n += 1
    n += await _apply_case_work(session, case, spec)
    return n


def _ago(days: float = 0, hours: float = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)


async def _apply_case_work(session, case: Case, spec: dict[str, Any]) -> int:
    """Topics, expert work, questions, notes and the draft assessment. Each is matched by
    its title or text so a second run adds nothing."""
    n = 0
    cid = case.id
    lead = case.case_captain

    # Illustrative ranges added earlier become amounts (only Kiyos-made illustrative rows).
    by_key = {f.key: f for f in (await session.execute(select(Fact).where(Fact.case_id == cid))).scalars()}
    for h in spec.get("holdings", []):
        f = by_key.get(f"holding:{h['id']}")
        if f and f.source == SOURCE and "amount" in h:
            cur = json.loads(f.value)
            if cur.get("amount") is None:
                f.value = json.dumps(h, ensure_ascii=False)
                n += 1

    titles = set((await session.execute(select(TaxTopic.title).where(TaxTopic.case_id == cid))).scalars())
    for key, title, status, conf, conclusion, india, us, nxt, due in spec.get("topics", []):
        if title not in titles:
            session.add(TaxTopic(case_id=cid, topic_key=key, title=title, status=status, confidence=conf, conclusion=conclusion,
                                 india_position=india, us_position=us, next_action=nxt, owner=lead, due_date=_due(due) if due else None))
            n += 1

    if spec.get("assessment"):
        heads = set((await session.execute(select(Assessment.headline).where(Assessment.case_id == cid))).scalars())
        if spec["assessment"] not in heads:
            session.add(Assessment(case_id=cid, headline=spec["assessment"], status="draft", created_at=_ago(3)))
            n += 1

    items = set((await session.execute(select(ActionItem.title).where(ActionItem.case_id == cid))).scalars())
    for title, assignee, status, due, notes in spec.get("action_items", []):
        if title not in items:
            session.add(ActionItem(case_id=cid, title=title, assignee=assignee, status=status, owner=lead, due_date=_due(due), notes=notes, created_at=_ago(4)))
            n += 1

    notes = set((await session.execute(select(CaseNote.body).where(CaseNote.case_id == cid))).scalars())
    for body in spec.get("notes", []):
        if body not in notes:
            session.add(CaseNote(case_id=cid, author=lead, body=body, created_at=_ago(2)))
            n += 1

    convo = (await session.execute(select(Conversation).where(Conversation.case_id == cid).order_by(Conversation.id.desc()))).scalars().first()
    asked = set((await session.execute(select(Ticket.question).where(Ticket.case_id == cid))).scalars())
    for t in spec.get("tickets", []):
        if t["question"] in asked:
            continue
        at = _ago(t["days_ago"])
        user = Message(conversation_id=convo.id, role="user", content=t["question"], created_at=at) if convo else None
        if user:
            session.add(user)
            session.add(Message(conversation_id=convo.id, role="assistant", author="Kiyos", routed=True, confidence=0.5, created_at=at + timedelta(seconds=20),
                                content=f"Thanks. This one depends on the specifics of your situation, so I've passed it to {lead}, your case captain, to review before we answer. You'll get a reply here, usually within one business day."))
            await session.flush()
        ticket = Ticket(case_id=cid, conversation_id=convo.id if convo else None, message_id=user.id if user else None, question=t["question"],
                        draft_answer=t.get("draft"), confidence=0.5, reason="Depends on the customer's facts", owner=lead,
                        sla_due_at=at + timedelta(days=1), status=t["status"], created_at=at)
        if t["status"] == "resolved":
            done = at + timedelta(hours=t.get("answered_after_hours", 20))
            ticket.resolution, ticket.resolved_by, ticket.resolved_at = t["answer"], lead, done
            if convo:
                session.add(Message(conversation_id=convo.id, role="advisor", author=lead, content=t["answer"], created_at=done))
        session.add(ticket)
        session.add(CaseEvent(case_id=cid, actor="agent", action="ticket.created", target_type="ticket", detail={"label": t["question"][:80]}, created_at=at))
        n += 1

    if spec.get("review_status") and not case.review_status:
        case.review_status = spec["review_status"]
        n += 1
    return n


async def enrich_persona(session, case: Case) -> int:
    """Called by infra.personas after a reset (before its commit)."""
    spec = PERSONAS.get(case.demo_key or "")
    if not spec or (spec.get("paid_only") and case.plan != "premium"):
        return 0
    return await _apply(session, case, spec)


async def seed_hni() -> dict[int, int]:
    """Add the enrichment to the seeded paid cases and the persona cases; returns records added per case."""
    added: dict[int, int] = {}
    async with async_session() as session:
        for case_id, spec in SPECS.items():
            case = await session.get(Case, case_id)
            if not case or case.demo_key:
                continue
            added[case_id] = await _apply(session, case, spec)
        personas = (await session.execute(select(Case).where(Case.demo_key.in_(list(PERSONAS))))).scalars().all()
        for case in personas:
            added[case.id] = await enrich_persona(session, case)
        await session.commit()
    return added


if __name__ == "__main__":
    print(asyncio.run(seed_hni()))
