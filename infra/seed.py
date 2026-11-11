"""Seed the SQLite database with six persona cases per the PRD.

Deterministic — `make reset-db && make seed` yields the same six cases in the
same order every time. The six personas match PRD §4 (Target users and
life-event triggers) so each one shows a different shape of cross-border case:

  1. Arjun Rao          — Returning Indian household (US → India, H-1B)
  2. Priya Shah         — NRI with India ties (lives in SF, rental in Mumbai)
  3. Michael Thompson   — US citizen/GC-holder living in Bangalore
  4. Rohit Krishnan     — Cross-border executive mid-transition (RSUs/options)
  5. The Menon family   — Family with incumbent advisors (gap-filling only)
  6. Dr. Lakshmi Iyer   — High-asset returnee (estate planning)

Each case gets household members, facts, documents, tax topics, recommendations,
action items, notices, scenarios, a conversation + messages, ai_call entries
and assessments with derivation trails. Idempotency: if a case with the same
`name` already exists, that case is skipped — new cases are additive.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from infra.schema import (
    Base,
    Case,
    Fact,
    Document,
    Assessment,
    Conversation,
    Message,
    AiCall,
    HouseholdMember,
    TaxTopic,
    Recommendation,
    ActionItem,
    Notice,
    Scenario,
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/kiyos.db")

NOW = datetime.now(timezone.utc)


# ───────────────────────────────────────────────────────────────────
# Case specifications — structured data, one per persona.
# Each spec is consumed by `make_case()` below.
# ───────────────────────────────────────────────────────────────────

CASE_SPECS: list[dict] = [
    # ── 1. Arjun Rao — Returning Indian household (US → Bangalore) ──
    {
        "name": "Arjun Rao — US→IN return 2026",
        "client_name": "Arjun Rao",
        "status": "active",
        "summary": (
            "Arjun is a 34-year-old software engineer returning to India in July 2026 "
            "after 8 years in the US. He holds H-1B status, has a 401(k) with Fidelity, "
            "unvested RSUs from his employer, a US brokerage account, and rental income "
            "from a flat in Pune. Needs a full cross-border assessment for the transition "
            "year — residency, capital gains, 401(k) treatment, salary allocation, DTAA."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Vikram Desai",
        "arrival_date": "2026-07-15",
        "tax_year": "2026-27",
        "members": [
            {"name": "Arjun Rao", "role": "primary", "citizenship": "Indian",
             "visa_status": "H-1B (US)", "dob": "1992-03-14"},
            {"name": "Nisha Rao", "role": "spouse", "citizenship": "Indian",
             "visa_status": "H-4 (US)", "dob": "1993-11-02",
             "notes": "Not yet employed in India; eligible for PAN."},
        ],
        "facts": [
            ("india_return_date", "2026-07-15", None, "captain-entered"),
            ("us_salary_2026_h1", "120000", "USD", "W-2 import"),
            ("india_salary_2026_h2", "7500000", "INR", "offer letter"),
            ("us_employer", "Stripe Inc.", None, "captain-entered"),
            ("india_employer", "Flipkart Pvt Ltd", None, "captain-entered"),
            ("days_in_india_2025_26", "12", "days", "captain-entered"),
            ("days_in_india_2024_25", "8", "days", "captain-entered"),
            ("days_in_india_2023_24", "15", "days", "captain-entered"),
            ("fidelity_401k_balance", "380000", "USD", "year-end statement"),
            ("us_brokerage_value", "125000", "USD", "Schwab statement"),
            ("pune_rental_income_annual", "360000", "INR", "lease agreement"),
            ("rsu_unvested_count", "1200", "shares", "Shareworks export"),
            ("rsu_vest_price", "22.50", "USD/share", "Shareworks export"),
            ("pan_number", "ABCPR1234A", None, "captain-entered"),
            ("ssn_last_four", "7890", None, "captain-entered"),
            ("previous_year_statuses", "NR,NR,NR,NR,NR,NR,NR,NR,NR,NR",
             None, "derived"),
        ],
        "topics": [
            {
                "topic_key": "rnor", "title": "Residency status for AY 2026-27",
                "india_position": "RNOR qualifies via §6(6)(a): NR in 9 of 10 "
                                  "preceding years (all 10 are NR).",
                "us_position": "Resident alien for calendar 2026 (first half); "
                               "dual-status possible if departure is finalised.",
                "conclusion": "RNOR in India; dual-status US. India will not tax "
                              "foreign-source income Jul–Mar; US taxes worldwide "
                              "income through residency termination date.",
                "confidence": "confirmed", "status": "resolved",
                "next_action": "File Schedule FA next year once ROR kicks in.",
                "owner": "Vikram Desai", "due_date": "2027-07-31",
            },
            {
                "topic_key": "401k_strategy", "title": "401(k) distribution strategy",
                "india_position": "Form 10EE election defers India tax on 401(k) "
                                  "until withdrawal. Strongly recommended.",
                "us_position": "Early withdrawal pre-59½ triggers 10% penalty + "
                               "ordinary income tax. Roll to IRA to avoid forced "
                               "distribution.",
                "conclusion": "Roll 401(k) to a traditional IRA before departure; "
                              "file Form 10EE in the first ROR year (2028-29).",
                "confidence": "likely", "status": "in_progress",
                "next_action": "Open traditional IRA at Fidelity; initiate direct "
                               "rollover before 2026-06-30.",
                "owner": "Arjun", "due_date": "2026-06-30",
            },
            {
                "topic_key": "pfic_exposure", "title": "PFIC exposure on US ETFs",
                "india_position": "Indian MFs excluded; US ETFs held during ROR "
                                  "years attract PFIC once ROR starts.",
                "us_position": "No PFIC issue for US ETFs held by US person.",
                "conclusion": "Liquidate or convert US ETFs before ROR begins "
                              "(AY 2028-29) to avoid §1291 excess-distribution.",
                "confidence": "review_needed", "status": "open",
                "next_action": "Expert review of portfolio holdings for PFIC "
                               "candidates; QEF election feasibility.",
                "owner": "Anjali Kapoor", "due_date": "2026-11-30",
            },
            {
                "topic_key": "pune_rental", "title": "Pune rental taxation",
                "india_position": "Taxable in India under 'Income from House "
                                  "Property'; 30% standard deduction.",
                "us_position": "Taxable in US as foreign rental income; depreciation "
                               "under 40-year ADS. FTC available for Indian tax.",
                "conclusion": "Report in both countries; claim FTC in US using "
                              "Form 1116 (passive category).",
                "confidence": "confirmed", "status": "resolved",
                "next_action": "Ensure rent receipts are PAN-stamped for TDS trail.",
                "owner": "Arjun",
            },
        ],
        "recommendations": [
            {"author": "Vikram Desai",
             "content": "Direct-roll the Fidelity 401(k) into a Traditional IRA "
                        "before departing the US (by 2026-06-30).",
             "rationale": "Keeps US-side tax deferral intact and preserves future "
                          "Form 10EE election flexibility in India. Avoids any "
                          "deemed distribution or 10% penalty.",
             "status": "accepted", "date": "2026-05-12"},
            {"author": "Anjali Kapoor",
             "content": "Liquidate US ETF positions before 2028 to eliminate PFIC "
                        "risk once ROR begins.",
             "rationale": "PFIC §1291 excess-distribution regime is punitive; QEF "
                          "election usually impracticable for ETFs. Simpler to exit.",
             "status": "proposed", "date": "2026-10-08"},
            {"author": "agent",
             "content": "File Form 67 claiming FTC for Indian TDS withheld on "
                        "Pune rental in the US return.",
             "rationale": "Avoids double taxation under DTAA Art 23.",
             "status": "implemented_reported", "date": "2026-07-02"},
        ],
        "action_items": [
            {"title": "Open traditional IRA at Fidelity",
             "assignee": "customer", "status": "done",
             "due_date": "2026-06-15", "owner": "Arjun"},
            {"title": "Initiate 401(k) → IRA direct rollover",
             "assignee": "customer", "status": "done",
             "due_date": "2026-06-30", "owner": "Arjun"},
            {"title": "Share PortfolioAnalyzer export for PFIC review",
             "assignee": "customer", "status": "open",
             "due_date": "2026-11-20", "owner": "Arjun"},
            {"title": "Review Schedule FA readiness for AY 2027-28",
             "assignee": "advisor", "status": "open",
             "due_date": "2027-04-30", "owner": "Vikram Desai"},
            {"title": "Confirm India PAN stamp on Pune rental agreement",
             "assignee": "customer", "status": "blocked",
             "due_date": "2026-11-30", "owner": "Arjun",
             "notes": "Tenant hasn't shared the duly-stamped copy."},
        ],
        "notices": [],
        "scenarios": [
            {"label": "Rollover 401(k) now (recommended)",
             "assumptions": ["Rollover to Traditional IRA before departure",
                             "No early withdrawal",
                             "10EE election in first ROR year"],
             "results": [{"metric": "US tax (2026)", "value": "~$18,400"},
                         {"metric": "India tax impact (2026-27)",
                          "value": "No current tax on 401(k)"},
                         {"metric": "Combined penalty exposure", "value": "₹0"}],
             "recommended": True},
            {"label": "Full withdrawal before departure",
             "assumptions": ["Liquidate 401(k) in June 2026",
                             "Pay US tax + 10% penalty",
                             "Transfer net proceeds to India"],
             "results": [{"metric": "US tax (2026)", "value": "~$134,000"},
                         {"metric": "Early-withdrawal penalty", "value": "$38,000"},
                         {"metric": "India tax on receipt", "value": "Nil (RNOR)"}],
             "recommended": False},
        ],
        "messages": [
            ("assistant",
             "Hi Arjun! Welcome to Kiyos. I've gone through everything you've "
             "shared so far and things are looking good — your residency status "
             "is confirmed and the 401(k) rollover is complete. There's one item "
             "we still need from you: a portfolio export so we can review your "
             "US ETF holdings. Let me know if you have any questions!"),
            ("user",
             "Thanks! When does the Schedule FA requirement kick in for me?"),
            ("assistant",
             "Great question. Since you qualify as RNOR for this assessment year, "
             "Schedule FA won't apply until you become ordinarily resident — "
             "that's looking like AY 2028-29 based on your travel history. We've "
             "already added it to your action list so you'll be covered well in "
             "advance. Nothing to worry about right now."),
        ],
        "assessments": [
            {"headline": "Residency status: RNOR for AY 2026-27",
             "amount": None, "currency": None, "status": "signed_off",
             "derivation_trail": [
                 {"rule_id": "IN-RES-RNOR-9OF10",
                  "summary": "Resident is NOT ordinarily resident if NR in 9 of "
                             "10 preceding PYs",
                  "inputs_used": {"previous_year_statuses": ["NR"] * 10},
                  "output": True}]},
        ],
        "documents": [
            ("W-2_2026_Stripe.pdf", "W-2", "extracted",
             {"employer": "Stripe Inc.", "wages_box1": 240000,
              "fed_tax_withheld": 54000}),
            ("Fidelity_401k_YE2025.pdf", "401k_statement", "extracted",
             {"balance": 380000, "ytd_contrib": 22500, "employer_match": 11250}),
            ("Pune_rental_agreement.pdf", "rental_agreement", "uploaded", None),
            ("Form_10EE_draft.pdf", "form_draft", "review", None),
        ],
        "ai_calls": [
            ("explain", "claude-opus-5-5", 1420, 380, 2340),
            ("extract", "claude-haiku-5-5", 3200, 890, 1120),
            ("converse", "claude-opus-5-5", 2100, 620, 3100),
            ("explain", "claude-opus-5-5", 1100, 290, 1890),
        ],
    },

    # ── 2. Priya Shah — NRI with India ties ──
    {
        "name": "Priya Shah — SF-based NRI with Mumbai assets",
        "client_name": "Priya Shah",
        "status": "active",
        "summary": (
            "Priya is 38, lives in San Francisco since 2014, US citizen since 2021. "
            "Inherited a Mumbai flat generating ₹480K rent and ancestral Chennai land. "
            "Needs India AIS reconciliation, DTAA rental treatment, and ongoing FTC "
            "claim on her US return. Advisory-only engagement — her US CPA handles 1040."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Anjali Kapoor",
        "arrival_date": None,
        "tax_year": "2026-27",
        "members": [
            {"name": "Priya Shah", "role": "primary",
             "citizenship": "US (OCI holder)", "visa_status": "US citizen",
             "dob": "1988-06-21"},
        ],
        "facts": [
            ("us_city", "San Francisco, CA", None, "captain-entered"),
            ("india_oci_number", "A3821049", None, "captain-entered"),
            ("us_salary_2026", "215000", "USD", "W-2"),
            ("us_employer", "Databricks Inc.", None, "captain-entered"),
            ("mumbai_rental_income_annual", "480000", "INR", "AIS"),
            ("chennai_land_market_value", "12500000", "INR", "valuation report"),
            ("nre_balance", "4200000", "INR", "HDFC statement"),
            ("india_tds_on_rental_2025_26", "68000", "INR", "Form 16A"),
            ("pan_number", "AFBPS7723R", None, "captain-entered"),
            ("us_citizenship_date", "2021-09-14", None, "captain-entered"),
            ("days_in_india_2025_26", "32", "days", "travel history"),
            ("days_in_india_2024_25", "28", "days", "travel history"),
            ("fbar_status_2025", "filed", None, "FinCEN confirmation"),
        ],
        "topics": [
            {"topic_key": "ind_residency", "title": "India residency: NR",
             "india_position": "NR under §6 — fewer than 60 days in India any year.",
             "us_position": "US resident (citizen).",
             "conclusion": "Only India-source income taxable in India; rest exempt.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Anjali Kapoor"},
            {"topic_key": "rental_dtaa",
             "title": "Mumbai rental — DTAA & FTC path",
             "india_position": "Taxable; 30% standard deduction; TDS at 31.2% on rent.",
             "us_position": "Worldwide income; report Schedule E; FTC on Form 1116.",
             "conclusion": "India TDS fully creditable in US; net position roughly "
                           "neutral at her marginal rate.",
             "confidence": "confirmed", "status": "in_progress",
             "next_action": "Reconcile Form 16A vs AIS; forward to CPA with "
                            "pre-filled Form 1116 draft.",
             "owner": "Anjali Kapoor", "due_date": "2027-02-28"},
            {"topic_key": "chennai_land", "title": "Chennai land succession",
             "india_position": "Inherited from father 2018; cost basis = fair "
                               "market value on date of inheritance.",
             "us_position": "US cost basis = FMV at inheritance (stepped-up).",
             "conclusion": "No current tax; capital gain only on sale.",
             "confidence": "likely", "status": "open",
             "next_action": "Secure a current valuation for US basis record.",
             "owner": "Priya", "due_date": "2026-12-31"},
            {"topic_key": "schedule_fa", "title": "Schedule FA in India",
             "india_position": "Priya is NR; Schedule FA does NOT apply.",
             "us_position": "N/A.",
             "conclusion": "No disclosure obligation unless residency changes.",
             "confidence": "confirmed", "status": "resolved"},
        ],
        "recommendations": [
            {"author": "Anjali Kapoor",
             "content": "Pre-draft Form 1116 (passive) each year and share with "
                        "US CPA for inclusion in Priya's 1040.",
             "rationale": "Ensures full FTC is claimed and reconciles Form 16A "
                          "with AIS cleanly.",
             "status": "accepted", "date": "2026-04-18"},
            {"author": "Anjali Kapoor",
             "content": "Commission a market valuation of the Chennai land "
                        "parcel, dated 2018 if possible, otherwise current.",
             "rationale": "Establishes a defensible US cost basis; useful on sale.",
             "status": "proposed", "date": "2026-10-20"},
        ],
        "action_items": [
            {"title": "Reconcile Form 16A vs AIS for 2025-26",
             "assignee": "advisor", "status": "in_progress",
             "due_date": "2026-12-10", "owner": "Anjali Kapoor"},
            {"title": "Request Chennai land valuation from registered valuer",
             "assignee": "customer", "status": "open",
             "due_date": "2026-12-31", "owner": "Priya"},
            {"title": "Share pre-drafted Form 1116 with US CPA",
             "assignee": "advisor", "status": "open",
             "due_date": "2027-02-28", "owner": "Anjali Kapoor"},
        ],
        "notices": [
            {"authority": "ITD", "subject": "AIS mismatch — Mumbai rental TDS",
             "received_at": "2026-09-12", "deadline": "2026-10-12",
             "status": "responded", "response_filed_at": "2026-10-05"},
        ],
        "scenarios": [
            {"label": "Maintain NR status and advisory-only engagement",
             "assumptions": ["No India relocation planned",
                             "Annual AIS reconciliation",
                             "FTC claim on US 1040"],
             "results": [{"metric": "India tax (2026-27)", "value": "~₹28,500"},
                         {"metric": "US effective rate", "value": "No change"},
                         {"metric": "Net savings vs no FTC", "value": "~$6,400"}],
             "recommended": True},
        ],
        "messages": [
            ("assistant",
             "Hi Priya! Your case is all set up. Quick update — that AIS "
             "mismatch notice from September has been handled and resolved. "
             "The one thing still open is getting a valuation for the Chennai "
             "land. How are things going on that front?"),
            ("user", "Good to know about the notice. How exactly was it resolved?"),
            ("assistant",
             "We submitted copies of your Form 26AS and Form 16A along with a "
             "reconciliation worksheet. Turns out the mismatch was just ₹2,400 "
             "due to a TDS timing difference — nothing major. It's been resolved "
             "without any demand from the department. You're all clear there!"),
        ],
        "assessments": [
            {"headline": "Full-year India tax liability: ~₹28,500 (NR)",
             "amount": 28500, "currency": "INR", "status": "signed_off",
             "derivation_trail": [
                 {"rule_id": "IN-RES-NR",
                  "summary": "NR per §6; only India-source income taxable",
                  "inputs_used": {"days_in_india_last_year": 32},
                  "output": "NR"},
                 {"rule_id": "IN-HP-RENTAL-30PCT",
                  "summary": "30% standard deduction on rental income",
                  "inputs_used": {"gross_rent": 480000},
                  "output": {"net_taxable": 336000}}]},
        ],
        "documents": [
            ("Form_16A_HDFC_2025-26.pdf", "form_16A", "extracted",
             {"tds_amount": 68000, "deductor": "HDFC Bank"}),
            ("AIS_statement_2025-26.pdf", "ais", "extracted", None),
            ("ITD_notice_AIS_mismatch.pdf", "notice", "extracted", None),
            ("Response_letter.pdf", "response", "filed", None),
        ],
        "ai_calls": [
            ("explain", "claude-opus-5-5", 1280, 360, 2010),
            ("extract", "claude-haiku-5-5", 2640, 720, 980),
            ("converse", "claude-opus-5-5", 1810, 540, 2820),
        ],
    },

    # ── 3. Michael Thompson — US citizen in Bangalore ──
    {
        "name": "Michael Thompson — US citizen in Bangalore (11 yrs)",
        "client_name": "Michael Thompson",
        "status": "active",
        "summary": (
            "Michael, 42, US citizen, software exec at an Indian subsidiary of a US "
            "parent since 2015. Spouse is Indian. Holds Indian MFs (PFIC exposure), "
            "US 401(k), and a jointly-owned Bangalore flat. Full-service engagement: "
            "coordinated India + US filings, FBAR/FATCA, Form 8621, Form 10EE, FTC."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Vikram Desai",
        "arrival_date": "2015-02-08",
        "tax_year": "2026-27",
        "members": [
            {"name": "Michael Thompson", "role": "primary",
             "citizenship": "US", "visa_status": "OCI holder", "dob": "1984-01-20"},
            {"name": "Anita Thompson (née Rao)", "role": "spouse",
             "citizenship": "Indian", "visa_status": "Indian citizen",
             "dob": "1986-05-11"},
            {"name": "Alex Thompson", "role": "dependent",
             "citizenship": "US (dual)", "visa_status": "US/OCI minor",
             "dob": "2015-09-03"},
        ],
        "facts": [
            ("india_salary_2026_27", "9800000", "INR", "Form 16"),
            ("india_employer", "Oracle India Pvt Ltd", None, "captain-entered"),
            ("indian_mf_portfolio_value", "4800000", "INR",
             "Kuvera statement"),
            ("indian_mf_count", "12", "schemes", "Kuvera statement"),
            ("us_401k_balance", "720000", "USD", "Fidelity statement"),
            ("bangalore_flat_value", "22000000", "INR", "valuation"),
            ("joint_bank_hdfc_balance", "1800000", "INR", "year-end"),
            ("fbar_status_2025", "filed", None, "FinCEN"),
            ("form_8938_filed_2025", "yes", None, "US return"),
            ("pan_number", "AKJPT8810B", None, "captain-entered"),
            ("ssn_last_four", "1203", None, "captain-entered"),
            ("us_citizenship_status", "US citizen", None, "captain-entered"),
            ("global_income_disclosure_2025_26", "yes", None, "ITR filed"),
        ],
        "topics": [
            {"topic_key": "pfic_mfs",
             "title": "PFIC exposure on Indian mutual funds",
             "india_position": "Indian MFs are normal capital assets under IT Act.",
             "us_position": "Each scheme is a PFIC under §1297. Form 8621 "
                            "required annually; §1291 excess-distribution absent "
                            "QEF or MTM election.",
             "conclusion": "Transition to US direct equities or ETFs; file "
                           "Form 8621 for existing 12 schemes with MTM where "
                           "feasible.",
             "confidence": "likely", "status": "in_progress",
             "next_action": "Scheme-by-scheme MTM election analysis.",
             "owner": "Anjali Kapoor", "due_date": "2026-12-15"},
            {"topic_key": "fbar_fatca",
             "title": "FBAR + FATCA compliance",
             "india_position": "N/A.",
             "us_position": "FinCEN 114 (FBAR) + Form 8938 required; both "
                            "thresholds exceeded.",
             "conclusion": "Current filings up to date; add Anita's HDFC joint "
                           "holding to FBAR for 2026 cycle.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Vikram Desai"},
            {"topic_key": "form_10ee", "title": "Form 10EE election on 401(k)",
             "india_position": "Election available; defers India tax on 401(k) "
                               "accrual until withdrawal.",
             "us_position": "Account continues US-side deferral.",
             "conclusion": "Election filed for AY 2023-24; active and valid.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Vikram Desai"},
            {"topic_key": "ftc",
             "title": "Foreign Tax Credit optimisation",
             "india_position": "India tax paid eligible for US FTC.",
             "us_position": "Form 1116 categories: general + passive.",
             "conclusion": "Carryover available; consider election to treat "
                           "capital gains as general-category for optimisation.",
             "confidence": "review_needed", "status": "open",
             "next_action": "Model 2026 FTC with and without re-election.",
             "owner": "Vikram Desai", "due_date": "2027-03-15"},
            {"topic_key": "estate_planning",
             "title": "Household estate planning (preliminary)",
             "india_position": "No estate tax in India.",
             "us_position": "Michael's US estate subject to federal estate tax; "
                            "Anita (non-US citizen) subject to QDOT rules.",
             "conclusion": "Needs QDOT marital trust review; outside tax scope "
                           "but flagged.",
             "confidence": "incomplete", "status": "open",
             "next_action": "Refer to estate counsel partner.",
             "owner": "Anjali Kapoor"},
        ],
        "recommendations": [
            {"author": "Anjali Kapoor",
             "content": "Wind down 11 of 12 Indian MF holdings over 24 months; "
                        "transition to US-registered ETFs via US brokerage.",
             "rationale": "Exits PFIC regime permanently; preserves one as "
                          "legacy holding for cost-basis study.",
             "status": "accepted", "date": "2026-02-10"},
            {"author": "Anjali Kapoor",
             "content": "Elect Mark-to-Market under §1296 for the one retained "
                        "PFIC scheme.",
             "rationale": "Converts annual accrual to current income; avoids "
                          "§1291 trap on eventual sale.",
             "status": "proposed", "date": "2026-11-02"},
            {"author": "Vikram Desai",
             "content": "Introduce Michael + Anita to estate partner for QDOT "
                        "trust discussion.",
             "rationale": "Non-US-citizen spouse risk under US estate tax; QDOT "
                          "preserves marital deduction.",
             "status": "proposed", "date": "2026-10-28"},
        ],
        "action_items": [
            {"title": "Export Kuvera portfolio for scheme-level PFIC analysis",
             "assignee": "customer", "status": "done",
             "due_date": "2026-10-15", "owner": "Michael"},
            {"title": "Draft 2026 FBAR with Anita's HDFC joint account",
             "assignee": "advisor", "status": "in_progress",
             "due_date": "2027-04-15", "owner": "Vikram Desai"},
            {"title": "Model FTC with vs without category re-election",
             "assignee": "advisor", "status": "open",
             "due_date": "2027-03-15", "owner": "Vikram Desai"},
            {"title": "Introduce to estate counsel partner",
             "assignee": "advisor", "status": "open", "owner": "Anjali Kapoor"},
            {"title": "File Form 8621 for each MF scheme (12)",
             "assignee": "advisor", "status": "blocked",
             "due_date": "2027-04-15", "owner": "Vikram Desai",
             "notes": "Blocked on MTM election decision."},
        ],
        "notices": [],
        "scenarios": [
            {"label": "Exit all Indian MFs over 24 months (recommended)",
             "assumptions": ["Monthly redemption ₹2L over 24 months",
                             "Reinvest in US ETFs via Schwab",
                             "MTM on one retained scheme"],
             "results": [{"metric": "PFIC filing count by 2028",
                          "value": "1 scheme (vs 12 today)"},
                         {"metric": "Estimated reduction in annual compliance",
                          "value": "~$3,200"},
                         {"metric": "Transition tax drag", "value": "~₹68,000"}],
             "recommended": True},
            {"label": "Status quo — annual Form 8621 × 12",
             "assumptions": ["Continue existing MF SIP",
                             "File Form 8621 for 12 schemes annually"],
             "results": [{"metric": "Annual compliance burden",
                          "value": "~$4,000"},
                         {"metric": "§1291 exposure on exit",
                          "value": "Punitive"}],
             "recommended": False},
        ],
        "messages": [
            ("assistant",
             "Hi Michael! Your case covers a lot of ground but everything is "
             "under control. The biggest opportunity this year is transitioning "
             "out of the Indian mutual fund holdings to simplify your US "
             "compliance. Want me to walk you through the scheme-by-scheme plan?"),
            ("user", "Yes please. Also, any update on the estate planning intro?"),
            ("assistant",
             "That introduction to the estate planning partner is still on our "
             "list — we haven't sent it yet but it's coming soon. In the "
             "meantime, the PFIC transition plan is the priority since it has "
             "a tighter timeline. I'll have the details ready for your review "
             "shortly."),
        ],
        "assessments": [
            {"headline": "PFIC exposure: 12 Indian MF schemes; MTM feasible on 1",
             "amount": None, "currency": None, "status": "in_review",
             "derivation_trail": [
                 {"rule_id": "US-PFIC-1297",
                  "summary": "Each foreign mutual fund scheme is a PFIC",
                  "inputs_used": {"scheme_count": 12,
                                  "jurisdiction": "IN"},
                  "output": {"filing_required": True, "form": "8621"}}]},
            {"headline": "Form 10EE election active for 401(k)",
             "amount": None, "currency": None, "status": "signed_off",
             "derivation_trail": [
                 {"rule_id": "IN-10EE-ACTIVE",
                  "summary": "10EE election deferred India tax on 401(k) accrual",
                  "inputs_used": {"election_filed_ay": "2023-24"},
                  "output": True}]},
        ],
        "documents": [
            ("W-2_2026_virtual.pdf", "W-2", "extracted", None),
            ("Form_16_Oracle_2025-26.pdf", "form_16", "extracted",
             {"gross_salary": 9800000, "tds": 2450000}),
            ("Kuvera_portfolio_2026-10.pdf", "mf_statement", "extracted",
             {"scheme_count": 12, "total_value_inr": 4800000}),
            ("Fidelity_401k_YE2025.pdf", "401k_statement", "extracted", None),
            ("FBAR_confirmation_2025.pdf", "fbar_conf", "filed", None),
            ("Form_8938_2025.pdf", "form_8938", "filed", None),
        ],
        "ai_calls": [
            ("extract", "claude-haiku-5-5", 4100, 1200, 1480),
            ("explain", "claude-opus-5-5", 2240, 710, 3180),
            ("explain", "claude-opus-5-5", 1980, 520, 2650),
            ("converse", "claude-opus-5-5", 1640, 480, 2100),
            ("converse", "claude-opus-5-5", 1820, 540, 2410),
        ],
    },

    # ── 4. Rohit Krishnan — Cross-border executive mid-transition ──
    {
        "name": "Rohit Krishnan — RSU vest + India transfer 2027",
        "client_name": "Rohit Krishnan",
        "status": "active",
        "summary": (
            "Rohit, 36, VP Engineering at an NYC fintech, Indian citizen. Major RSU "
            "vest June 2026 ($340K), options exercise planned Nov 2026, employer is "
            "transferring him to Bangalore Feb 2027. Needs split-source allocation, "
            "treaty tie-breaker analysis, and permanent-establishment review for "
            "his continued US work after transfer."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Vikram Desai",
        "arrival_date": "2027-02-15",
        "tax_year": "2026-27",
        "members": [
            {"name": "Rohit Krishnan", "role": "primary", "citizenship": "Indian",
             "visa_status": "H-1B (US)", "dob": "1990-02-04"},
        ],
        "facts": [
            ("us_base_salary_2026", "285000", "USD", "pay stubs"),
            ("rsu_vest_2026_06", "340000", "USD", "Carta export"),
            ("options_exercise_planned_strike", "42500", "USD",
             "grant agreement"),
            ("options_exercise_planned_fmv", "148000", "USD", "409A valuation"),
            ("options_exercise_planned_date", "2026-11-18", None,
             "captain-entered"),
            ("india_transfer_effective", "2027-02-15", None, "offer letter"),
            ("india_offer_base_inr", "16500000", "INR", "offer letter"),
            ("us_cost_basis_rsu", "22.15", "USD/share", "Carta"),
            ("days_in_india_2025_26", "22", "days", "travel history"),
            ("days_in_india_2024_25", "18", "days", "travel history"),
            ("pan_number", "BKRPK9931C", None, "captain-entered"),
            ("ssn_last_four", "4421", None, "captain-entered"),
            ("401k_balance", "165000", "USD", "Empower statement"),
        ],
        "topics": [
            {"topic_key": "rsu_sourcing",
             "title": "RSU income sourcing (US vs India)",
             "india_position": "Vest during US residency → fully US-sourced; "
                               "no India tax if not resident.",
             "us_position": "Sourced to US; taxed as wages; employer withheld "
                            "22% supplemental + state + FICA.",
             "conclusion": "No India tax on 2026 RSU vest; US withholding "
                           "sufficient if no additional top-up.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Vikram Desai"},
            {"topic_key": "options_timing",
             "title": "Options exercise — US vs post-transfer India tax impact",
             "india_position": "If exercised before India residency → no India tax. "
                               "If after → taxable in India at marginal rate.",
             "us_position": "Ordinary income on spread; AMT exposure for ISOs.",
             "conclusion": "Exercise before departure (Nov 2026) locks the "
                           "lower US-only treatment. Model AMT.",
             "confidence": "likely", "status": "in_progress",
             "next_action": "Run AMT projection for Nov 2026 exercise.",
             "owner": "Vikram Desai", "due_date": "2026-11-05"},
            {"topic_key": "pe_risk",
             "title": "Permanent establishment risk post-transfer",
             "india_position": "If Rohit continues managing US team from India, "
                               "the US employer may trigger PE in India.",
             "us_position": "Employer-side issue; could trigger India corporate "
                            "tax on US operations.",
             "conclusion": "Require formal employer engagement letter with India "
                           "payroll from 2027-02-15; US work on business-visitor "
                           "basis only.",
             "confidence": "review_needed", "status": "open",
             "next_action": "Coordinate with employer HR + international tax team.",
             "owner": "Anjali Kapoor", "due_date": "2027-01-15"},
            {"topic_key": "treaty_tie_breaker",
             "title": "DTAA Art 4(2) tie-breaker — split year",
             "india_position": "Resident from Feb 2027 by §6(1)(a) if >182 days "
                               "in 2027-28.",
             "us_position": "Resident alien through transfer date; dual-status "
                            "election possible.",
             "conclusion": "Permanent home + centre of vital interests shift to "
                           "India from Feb 2027; treaty resident of India.",
             "confidence": "likely", "status": "open",
             "next_action": "Draft Art 4(2) worksheet for 2026-27 and 2027-28.",
             "owner": "Vikram Desai", "due_date": "2027-02-01"},
        ],
        "recommendations": [
            {"author": "Vikram Desai",
             "content": "Exercise outstanding options on 2026-11-18 while still "
                        "US tax resident; file 83(b) for any early-exercise ISOs.",
             "rationale": "Locks capital-gain holding clock + avoids India "
                          "ordinary-income treatment post-transfer.",
             "status": "accepted", "date": "2026-10-02"},
            {"author": "Anjali Kapoor",
             "content": "Negotiate split payroll with employer from Feb 2027: "
                        "India payroll for India-day work, US short-term visitor "
                        "for US travel only.",
             "rationale": "Avoids employer-side PE in India and simplifies "
                          "Rohit's personal split-source reporting.",
             "status": "proposed", "date": "2026-11-01"},
        ],
        "action_items": [
            {"title": "Run AMT projection for Nov 2026 options exercise",
             "assignee": "advisor", "status": "in_progress",
             "due_date": "2026-11-05", "owner": "Vikram Desai"},
            {"title": "Share employer transfer letter + India offer",
             "assignee": "customer", "status": "done",
             "due_date": "2026-10-20", "owner": "Rohit"},
            {"title": "Coordinate with employer HR on PE positioning",
             "assignee": "advisor", "status": "open",
             "due_date": "2026-12-15", "owner": "Anjali Kapoor"},
            {"title": "Draft Art 4(2) treaty tie-breaker worksheet",
             "assignee": "advisor", "status": "open",
             "due_date": "2027-02-01", "owner": "Vikram Desai"},
        ],
        "notices": [],
        "scenarios": [
            {"label": "Exercise options Nov 2026 before transfer (recommended)",
             "assumptions": ["Exercise strike $42.5K, FMV $148K spread",
                             "US ordinary income on spread; no India tax",
                             "Cap-gain clock starts Nov 2026"],
             "results": [{"metric": "US tax on exercise",
                          "value": "~$42,000 (incl. AMT)"},
                         {"metric": "India tax", "value": "₹0"},
                         {"metric": "Future cap-gain", "value": "LTCG if sold Nov 2027+"}],
             "recommended": True},
            {"label": "Delay exercise to post-transfer",
             "assumptions": ["Exercise in India (Mar 2027)",
                             "Taxable in India at marginal rate"],
             "results": [{"metric": "India tax on exercise",
                          "value": "~₹31,00,000"},
                         {"metric": "US tax", "value": "Nil (post-departure)"},
                         {"metric": "Treaty FTC complications",
                          "value": "High"}],
             "recommended": False},
        ],
        "messages": [
            ("assistant",
             "Hi Rohit! Two time-sensitive items on your plate right now: the "
             "options exercise coming up on November 18, and getting your "
             "employer set up for the February transfer. We're working on the "
             "AMT projection for the options — want me to walk you through "
             "what we have so far?"),
            ("user", "Not yet. What else is being worked on behind the scenes?"),
            ("assistant",
             "We're coordinating with your employer's HR team on how to "
             "structure things post-transfer so there are no complications on "
             "the corporate tax side. That's due by mid-December. We've also "
             "recommended a split-payroll setup starting February — still "
             "waiting on your employer's sign-off on that one. I'll keep you "
             "posted as things move along."),
        ],
        "assessments": [
            {"headline": "RSU 2026 vest fully US-sourced; no India tax",
             "amount": 340000, "currency": "USD", "status": "signed_off",
             "derivation_trail": [
                 {"rule_id": "US-RSU-VEST-SOURCING",
                  "summary": "RSUs vested during US residency are US-sourced",
                  "inputs_used": {"vest_date": "2026-06-30",
                                  "residency_at_vest": "US"},
                  "output": "US-sourced"}]},
        ],
        "documents": [
            ("Carta_vesting_2026-06.pdf", "equity_statement", "extracted",
             {"vested_shares": 15111, "fmv_at_vest": 22.50}),
            ("Options_grant_agreement.pdf", "grant_agreement", "extracted", None),
            ("India_offer_letter.pdf", "offer_letter", "extracted",
             {"base_inr": 16500000, "join_date": "2027-02-15"}),
            ("Pay_stub_2026_Q3.pdf", "pay_stub", "extracted", None),
        ],
        "ai_calls": [
            ("extract", "claude-haiku-5-5", 2890, 780, 1240),
            ("explain", "claude-opus-5-5", 2100, 680, 2780),
            ("explain", "claude-opus-5-5", 1740, 520, 2350),
        ],
    },

    # ── 5. The Menon family — Family with incumbent advisors ──
    {
        "name": "Menon family — advisory-only, gap-filling",
        "client_name": "Anil & Divya Menon",
        "status": "active",
        "summary": (
            "The Menons already use a CA in Chennai (Vaidya & Associates) and a "
            "CPA in Houston (Patel CPA PLLC). They came to Kiyos for the one "
            "thing neither advisor can do alone: a reconciled India–US position "
            "and a Schedule FA cross-check. Advisory-only engagement, no filing. "
            "Teenage daughter has her own small US return to think about."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Anjali Kapoor",
        "arrival_date": None,
        "tax_year": "2026-27",
        "members": [
            {"name": "Anil Menon", "role": "primary",
             "citizenship": "US (OCI holder)", "visa_status": "US citizen",
             "dob": "1976-11-29"},
            {"name": "Divya Menon", "role": "spouse",
             "citizenship": "US (OCI holder)", "visa_status": "US citizen",
             "dob": "1979-04-15"},
            {"name": "Meera Menon", "role": "dependent",
             "citizenship": "US", "visa_status": "US citizen",
             "dob": "2009-07-22",
             "notes": "Teenage daughter with ~$8K US summer-job income; "
                      "needs own 1040."},
            {"name": "Arav Menon", "role": "dependent",
             "citizenship": "US", "visa_status": "US citizen",
             "dob": "2012-10-10"},
        ],
        "facts": [
            ("us_city", "Houston, TX", None, "captain-entered"),
            ("anil_us_salary_2026", "285000", "USD", "W-2"),
            ("divya_us_salary_2026", "165000", "USD", "W-2"),
            ("india_assets_total", "22000000", "INR", "Chennai CA records"),
            ("india_mutual_funds_count", "6", "schemes", "CA records"),
            ("india_bank_accounts_count", "3", "accounts", "CA records"),
            ("chennai_apt_value", "14500000", "INR", "valuation"),
            ("us_brokerage_value", "1240000", "USD", "Vanguard statement"),
            ("incumbent_ca_name", "Vaidya & Associates, Chennai",
             None, "captain-entered"),
            ("incumbent_cpa_name", "Patel CPA PLLC, Houston",
             None, "captain-entered"),
            ("meera_us_income_2026", "8200", "USD", "W-2 summer job"),
            ("anil_ssn_last_four", "3344", None, "captain-entered"),
            ("divya_ssn_last_four", "5566", None, "captain-entered"),
        ],
        "topics": [
            {"topic_key": "schedule_fa_cross_check",
             "title": "Schedule FA cross-check against CA submission",
             "india_position": "Anil + Divya filed ROR; Schedule FA required.",
             "us_position": "N/A for advisory.",
             "conclusion": "Two accounts in incumbent CA's Schedule FA draft "
                           "appear misclassified (bank vs brokerage); flag for "
                           "revision pre-filing.",
             "confidence": "likely", "status": "in_progress",
             "next_action": "Share annotated worksheet with Vaidya & Associates.",
             "owner": "Anjali Kapoor", "due_date": "2027-07-20"},
            {"topic_key": "pfic_mf_review",
             "title": "PFIC check on 6 Indian MFs",
             "india_position": "Normal capital assets.",
             "us_position": "Each a PFIC; Form 8621 obligations.",
             "conclusion": "CPA has filed 8621 for 4 of 6; two schemes added "
                           "mid-year appear to have been missed.",
             "confidence": "review_needed", "status": "open",
             "next_action": "Email CPA with scheme list + exposure note.",
             "owner": "Anjali Kapoor", "due_date": "2026-11-28"},
            {"topic_key": "meera_dependent_return",
             "title": "Meera's own 1040 (dependent return)",
             "india_position": "N/A.",
             "us_position": "Required at $8.2K income; refund-eligible due to "
                            "withholding.",
             "conclusion": "Handle via CPA or recommend TurboTax Free Edition; "
                           "not inside Kiyos scope for advisory-only tier.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Anjali Kapoor"},
        ],
        "recommendations": [
            {"author": "Anjali Kapoor",
             "content": "Send annotated Schedule FA worksheet to Vaidya & "
                        "Associates flagging the two classification errors.",
             "rationale": "Pre-filing correction is cheaper than ITD revision.",
             "status": "accepted", "date": "2026-10-28"},
            {"author": "Anjali Kapoor",
             "content": "Email Patel CPA listing 2 Indian MFs likely missing "
                        "from 8621 filings for 2024.",
             "rationale": "PFIC §1298(f) reporting obligation is strict; better "
                          "to catch before IRS.",
             "status": "proposed", "date": "2026-11-05"},
        ],
        "action_items": [
            {"title": "Send annotated Schedule FA worksheet to CA",
             "assignee": "advisor", "status": "in_progress",
             "due_date": "2027-07-20", "owner": "Anjali Kapoor"},
            {"title": "Email Patel CPA re: 2 potentially-missed MFs",
             "assignee": "advisor", "status": "open",
             "due_date": "2026-11-28", "owner": "Anjali Kapoor"},
            {"title": "Confirm Meera's return approach with Divya",
             "assignee": "advisor", "status": "done", "owner": "Anjali Kapoor"},
        ],
        "notices": [],
        "scenarios": [
            {"label": "Continue advisory-only; nudge both incumbents",
             "assumptions": ["Vaidya handles India filing",
                             "Patel handles US filing",
                             "Kiyos reviews cross-border consistency annually"],
             "results": [{"metric": "Fee saving vs full service",
                          "value": "~₹18,000 / yr"},
                         {"metric": "Risk retained",
                          "value": "Low — both incumbents competent"}],
             "recommended": True},
        ],
        "messages": [
            ("assistant",
             "Hi Anil! We've completed our cross-check for this cycle and "
             "found two things worth flagging. First, a couple of items in your "
             "Schedule FA draft look like they may be misclassified. Second, it "
             "seems two of your mutual fund schemes might be missing from last "
             "year's US filings. Want me to go into the details?"),
            ("user", "Yes, tell me about the mutual fund issue."),
            ("assistant",
             "So your US CPA filed the required forms for 4 of your 6 Indian "
             "mutual fund schemes in 2024. The two that appear to be missing "
             "are Parag Parikh Flexi Cap and SBI Small Cap — both were added "
             "mid-year so they may have been overlooked. We've already drafted "
             "a note to send to your CPA to get this corrected. Nothing urgent, "
             "but good to catch it now rather than later."),
        ],
        "assessments": [
            {"headline": "Advisory review: Schedule FA + PFIC gaps identified",
             "amount": None, "currency": None, "status": "draft",
             "derivation_trail": [
                 {"rule_id": "IN-SCHEDULE-FA-CHECK",
                  "summary": "Cross-check reported FA vs actual asset base",
                  "inputs_used": {"asset_count": 9, "ca_reported_count": 7},
                  "output": {"discrepancy": 2}}]},
        ],
        "documents": [
            ("Vaidya_FA_draft_2025-26.pdf", "schedule_fa", "review", None),
            ("Patel_1040_2024.pdf", "form_1040", "extracted", None),
            ("Kuvera_MF_list_2026.pdf", "mf_statement", "extracted",
             {"scheme_count": 6}),
            ("Meera_W-2_summerjob.pdf", "W-2", "extracted",
             {"wages_box1": 8200}),
        ],
        "ai_calls": [
            ("extract", "claude-haiku-5-5", 2240, 610, 980),
            ("explain", "claude-opus-5-5", 1820, 520, 2210),
        ],
    },

    # ── 6. Dr. Lakshmi Iyer — High-asset returnee ──
    {
        "name": "Dr. Lakshmi Iyer — high-asset returnee, estate focus",
        "client_name": "Dr. Lakshmi Iyer",
        "status": "active",
        "summary": (
            "Dr. Lakshmi, 61, retired cardiologist, US citizen since 1998. "
            "Planning a Mumbai return in 2027 to be near family. US brokerage "
            "$2.4M, Mumbai bungalow ₹18Cr, US IRAs + 401(k) totalling $980K, "
            "two adult children settled in the US. Needs multi-year estate "
            "planning, GC-surrender-equivalent analysis, charitable-giving plan, "
            "and transition timing to optimise estate exposure."
        ),
        "jurisdictions": "IN,US",
        "case_captain": "Vikram Desai",
        "arrival_date": "2027-04-20",
        "tax_year": "2026-27",
        "members": [
            {"name": "Dr. Lakshmi Iyer", "role": "primary", "citizenship": "US",
             "visa_status": "US citizen", "dob": "1964-08-16"},
            {"name": "Arjun Iyer", "role": "dependent",
             "citizenship": "US", "visa_status": "US citizen",
             "dob": "1993-02-28", "notes": "Adult son in Boston; legal dependent for one US tax item only."},
        ],
        "facts": [
            ("us_brokerage_value", "2400000", "USD", "Fidelity statement"),
            ("us_ira_balance", "620000", "USD", "Vanguard statement"),
            ("us_401k_balance", "360000", "USD", "TIAA statement"),
            ("mumbai_property_value", "180000000", "INR", "valuation 2026"),
            ("mumbai_property_type", "Bungalow, Powai", None, "captain-entered"),
            ("us_citizenship_date", "1998-04-12", None, "captain-entered"),
            ("retirement_date", "2024-06-30", None, "captain-entered"),
            ("planned_india_return", "2027-04-20", None, "captain-entered"),
            ("rmd_status", "pending (age 73 in 2037)", None, "derived"),
            ("charitable_intent_annual", "50000", "USD", "estate planner note"),
            ("pan_number", "AKNPI2210L", None, "captain-entered"),
            ("ssn_last_four", "9087", None, "captain-entered"),
            ("us_estate_exemption_2026", "13990000", "USD",
             "IRS 2026 adjusted figure"),
            ("spouse_status", "widowed 2019", None, "captain-entered"),
        ],
        "topics": [
            {"topic_key": "estate_exposure",
             "title": "US estate-tax exposure projection",
             "india_position": "No India estate tax.",
             "us_position": "Lifetime exemption $13.99M (2026); gross estate "
                            "~$18M (incl. Mumbai property at US valuation).",
             "conclusion": "Estate projected ~$4M above exemption; 40% tax "
                           "exposure ≈ $1.6M. Mitigation via lifetime gifting + "
                           "ILIT.",
             "confidence": "likely", "status": "in_progress",
             "next_action": "Model lifetime exemption use through 2026 sunset.",
             "owner": "Anjali Kapoor", "due_date": "2026-12-01"},
            {"topic_key": "gc_equivalent_exit",
             "title": "US citizen 'exit' optimisation via residency shift",
             "india_position": "Return as ROR from 2028-29 triggers Schedule FA "
                               "+ global-income reporting.",
             "us_position": "US citizens taxed worldwide regardless of residence; "
                            "cannot 'exit' without §877A expatriation.",
             "conclusion": "No tax-residence relief — only §877A expatriation "
                           "would help; not recommended at current wealth level.",
             "confidence": "confirmed", "status": "resolved",
             "owner": "Vikram Desai"},
            {"topic_key": "ira_rmd_india",
             "title": "IRA + 401(k) RMD treatment in India",
             "india_position": "RMD distributions taxable in India once ROR; "
                               "treaty allows reduced withholding but not "
                               "exemption.",
             "us_position": "RMD starts age 73; required even while in India.",
             "conclusion": "Plan Roth conversions ahead of 2037 RMD age to "
                           "flatten income curve and reduce future India "
                           "exposure. Form 10EE option applies.",
             "confidence": "likely", "status": "open",
             "next_action": "Build 5-year Roth conversion ladder model.",
             "owner": "Vikram Desai", "due_date": "2026-12-20"},
            {"topic_key": "charitable_giving",
             "title": "US-India charitable-giving structure",
             "india_position": "§80G deductions available for registered Indian "
                               "charities.",
             "us_position": "Charitable deduction only for US-recognised 501(c)(3). "
                            "DAF or private foundation options.",
             "conclusion": "Open Fidelity Charitable DAF; split giving between "
                           "US and India; India gifts via friends-of structure "
                           "or dual-qualified orgs.",
             "confidence": "likely", "status": "open",
             "next_action": "Vet 2-3 DAF options; draft giving budget.",
             "owner": "Anjali Kapoor", "due_date": "2027-01-31"},
        ],
        "recommendations": [
            {"author": "Anjali Kapoor",
             "content": "Gift $19K/year to each adult child from 2026–2028 "
                        "(annual exclusion); layered with $2M lifetime-exemption "
                        "gift to an ILIT.",
             "rationale": "Reduces taxable estate before possible 2026 sunset "
                          "of elevated exemption; ILIT shelters future growth.",
             "status": "proposed", "date": "2026-10-30"},
            {"author": "Vikram Desai",
             "content": "Begin Roth conversions at $120K/year through 2029 to "
                        "flatten India tax exposure post-return.",
             "rationale": "Lowers post-ROR US-source IRA income (treaty-sourced "
                          "to US); India tax applies only on withdrawal, so Roth "
                          "basis conversions now are strategic.",
             "status": "proposed", "date": "2026-11-05"},
        ],
        "action_items": [
            {"title": "Share Fidelity + Vanguard + TIAA balances year-end",
             "assignee": "customer", "status": "done",
             "due_date": "2026-10-15", "owner": "Lakshmi"},
            {"title": "Model lifetime exemption use through 2026 sunset",
             "assignee": "advisor", "status": "in_progress",
             "due_date": "2026-12-01", "owner": "Anjali Kapoor"},
            {"title": "Build 5-year Roth conversion ladder model",
             "assignee": "advisor", "status": "open",
             "due_date": "2026-12-20", "owner": "Vikram Desai"},
            {"title": "Vet DAF options; present to Lakshmi",
             "assignee": "advisor", "status": "open",
             "due_date": "2027-01-31", "owner": "Anjali Kapoor"},
        ],
        "notices": [
            {"authority": "IRS", "subject": "CP2000 — 2024 IRA distribution match",
             "received_at": "2026-08-18", "deadline": "2026-10-18",
             "status": "responded", "response_filed_at": "2026-09-30"},
        ],
        "scenarios": [
            {"label": "Pre-sunset exemption gifting + ILIT (recommended)",
             "assumptions": ["$2M ILIT in 2026",
                             "Annual exclusion gifts 2026–2028",
                             "Roth conversions begin 2026"],
             "results": [{"metric": "Taxable estate at age 73",
                          "value": "~$11.2M (below exemption)"},
                         {"metric": "Estate tax saving",
                          "value": "~$1.6M"},
                         {"metric": "India tax on RMDs",
                          "value": "Reduced ~35%"}],
             "recommended": True},
            {"label": "No planning — maintain status quo",
             "assumptions": ["Hold all US assets as-is",
                             "RMDs begin age 73",
                             "Estate passes at death"],
             "results": [{"metric": "Projected estate-tax liability",
                          "value": "~$1.6M"},
                         {"metric": "India tax on RMDs (post-ROR)",
                          "value": "Full exposure"}],
             "recommended": False},
            {"label": "Partial planning — gifting only, no ILIT",
             "assumptions": ["Annual exclusion gifts only",
                             "No Roth conversions"],
             "results": [{"metric": "Estate tax saving", "value": "~$680K"},
                         {"metric": "Complexity", "value": "Low"}],
             "recommended": False},
        ],
        "messages": [
            ("assistant",
             "Hi Lakshmi! We've modelled three scenarios for your estate "
             "planning and have a recommended approach ready for you. The key "
             "thing to know is that there's a window closing at the end of 2026 "
             "that could save you a significant amount — so timing matters here. "
             "Want me to walk you through the gifting strategy?"),
            ("user", "Yes please. Also, what happened with that IRS notice?"),
            ("assistant",
             "Good news — that was taken care of back in September. The IRA "
             "distribution was actually reported correctly on your 2024 return; "
             "the issue was just a timing mismatch on the broker's side. We've "
             "responded and it's with the IRS now for final close-out. Nothing "
             "to worry about on your end."),
        ],
        "assessments": [
            {"headline": "US estate exposure ~$4M over exemption; mitigation modelled",
             "amount": 4000000, "currency": "USD", "status": "in_review",
             "derivation_trail": [
                 {"rule_id": "US-ESTATE-EXEMPT-2026",
                  "summary": "2026 lifetime exemption = $13.99M; sunset end-2026",
                  "inputs_used": {"gross_estate": 18000000,
                                  "exemption": 13990000},
                  "output": {"excess": 4010000, "tax_at_40pct": 1604000}}]},
        ],
        "documents": [
            ("Fidelity_statement_YE2025.pdf", "brokerage_statement", "extracted",
             {"balance": 2400000}),
            ("Vanguard_IRA_YE2025.pdf", "ira_statement", "extracted",
             {"balance": 620000}),
            ("Mumbai_property_valuation_2026.pdf", "valuation", "extracted",
             {"value_inr": 180000000}),
            ("IRS_CP2000_2024.pdf", "notice", "extracted", None),
            ("CP2000_response_letter.pdf", "response", "filed", None),
            ("Estate_planning_memo_v2.pdf", "memo", "review", None),
        ],
        "ai_calls": [
            ("extract", "claude-haiku-5-5", 3450, 920, 1340),
            ("explain", "claude-opus-5-5", 2610, 790, 2980),
            ("explain", "claude-opus-5-5", 2180, 640, 2520),
            ("converse", "claude-opus-5-5", 1920, 580, 2380),
        ],
    },
]


# ───────────────────────────────────────────────────────────────────
# Case builder — consumes a spec and writes every related record.
# ───────────────────────────────────────────────────────────────────


async def make_case(session: AsyncSession, spec: dict) -> None:
    """Create a case and all its children from a spec dict. Idempotent on name."""
    existing = await session.execute(
        select(Case).where(Case.name == spec["name"])
    )
    if existing.scalar_one_or_none() is not None:
        print(f"  ↩ skipping (exists): {spec['name']}")
        return

    case = Case(
        name=spec["name"],
        client_name=spec["client_name"],
        status=spec.get("status", "active"),
        summary=spec.get("summary"),
        jurisdictions=spec.get("jurisdictions"),
        case_captain=spec.get("case_captain", "demo"),
        arrival_date=spec.get("arrival_date"),
        tax_year=spec.get("tax_year"),
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(case)
    await session.flush()

    for m in spec.get("members", []):
        session.add(HouseholdMember(case_id=case.id, **m))

    for key, value, unit, source in spec.get("facts", []):
        session.add(Fact(
            case_id=case.id,
            key=key,
            value=value,
            unit=unit,
            source=source,
            as_of="2026-10-31",
        ))

    # Keep a mapping from topic_key → topic.id so recommendations can link.
    topic_map: dict[str, int] = {}
    for t in spec.get("topics", []):
        topic = TaxTopic(case_id=case.id, **t)
        session.add(topic)
        await session.flush()
        topic_map[t["topic_key"]] = topic.id

    for r in spec.get("recommendations", []):
        topic_key = r.pop("topic_key", None)
        topic_id = topic_map.get(topic_key) if topic_key else None
        session.add(Recommendation(case_id=case.id, topic_id=topic_id, **r))

    for item in spec.get("action_items", []):
        session.add(ActionItem(case_id=case.id, **item))

    for notice in spec.get("notices", []):
        session.add(Notice(case_id=case.id, **notice))

    for scenario in spec.get("scenarios", []):
        session.add(Scenario(case_id=case.id, **scenario))

    for filename, doc_type, status, extracted in spec.get("documents", []):
        session.add(Document(
            case_id=case.id,
            filename=filename,
            doc_type=doc_type,
            status=status,
            extracted_json=extracted,
        ))

    convo = Conversation(case_id=case.id, title="Main thread", created_at=NOW)
    session.add(convo)
    await session.flush()

    for role, content in spec.get("messages", []):
        session.add(Message(
            conversation_id=convo.id,
            role=role,
            content=content,
            created_at=NOW,
        ))

    for a in spec.get("assessments", []):
        session.add(Assessment(case_id=case.id, created_at=NOW, updated_at=NOW, **a))

    for service, model, pt, ct, latency in spec.get("ai_calls", []):
        session.add(AiCall(
            case_id=case.id,
            service=service,
            model=model,
            prompt_tokens=pt,
            completion_tokens=ct,
            latency_ms=latency,
            created_at=NOW,
        ))

    print(f"  ✓ seeded: {spec['name']}")


# ───────────────────────────────────────────────────────────────────
# Entry point
# ───────────────────────────────────────────────────────────────────


async def seed() -> None:
    os.makedirs("data/documents", exist_ok=True)

    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        print(f"Seeding {len(CASE_SPECS)} cases…")
        for spec in CASE_SPECS:
            await make_case(session, spec)
        await session.commit()
        print("Done.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
