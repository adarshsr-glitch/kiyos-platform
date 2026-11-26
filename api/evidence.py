"""Evidence: exactly where a value in the case record came from.

`Fact.source` / `Stay.source` stay the short name ("Fidelity-401k-Dec2025.pdf", "WhatsApp
assessment"). `evidence` is the pointer the customer can open from the source icon:

  document    the document, and the line(s) read from it with their page
              {"kind": "document", "document_id", "filename", "title", "issuer", "pages",
               "lines": [{"page", "label", "value"}], "note"?}
  answer      a question Kiyos asked and the customer's answer
              {"kind": "answer", "channel": "WhatsApp" | "Onboarding", "question", "answer", "at"}
  said        a change the customer asked for in conversation and then confirmed
              {"kind": "said", "channel", "quote", "said_at", "confirmed_at", "previous"}
  expert      entered by the expert on the case
              {"kind": "expert", "by", "at"}
  demo        an illustrative figure with no document behind it
              {"kind": "demo"}

Nothing here calculates tax or interprets anything: it only records where a value was read
or who said it. Extraction is simulated in the prototype; real OCR fills the same shape.
"""

from __future__ import annotations

from datetime import date
from typing import Any

# Where each field sits in the (synthetic) document. Real OCR reports this itself.
PAGES: dict[str, dict[str, int]] = {
    "brokerage_statement": {"Total proceeds": 2, "Cost basis": 2, "Realised gain": 3, "Long-term": 3, "Short-term": 3, "Wash sales disallowed": 4},
    "401k_statement": {"Employee contributions 2025": 2, "Employer match 2025": 2, "Vested": 3},
    "bank_statement": {"Peak balance": 4, "Interest credited": 5, "TDS on interest (30%)": 5, "Closing balance": 6},
    "form_16": {"Gross salary": 3, "Regime": 3, "Tax deducted (TDS)": 4},
    "property_document": {"Owner(s)": 2, "Property": 3, "Consideration": 4, "Stamp duty paid": 17},
    "prior_returns": {"India · residential status declared": 2, "US · return filed": 7, "US · filing status": 7, "Foreign accounts reported (FBAR)": 11},
    "mf_cas": {"Folios": 2, "Market value": 2, "Equity funds": 3, "Debt funds": 3, "Redemptions in FY 2025-26": 5},
    "rental_agreement": {"Monthly rent": 3, "Tenant deducts TDS": 4},
}
STAMPS = ("Arrived", "Left")

# The field a document's headline amount is read from.
AMOUNT_FIELD: dict[str, str] = {
    "W-2": "Box 1 · Wages",
    "brokerage_statement": "Total proceeds",
    "401k_statement": "Ending balance",
    "bank_statement": "Closing balance",
    "interest_certificate": "Interest paid",
    "form_16": "Gross salary",
    "property_document": "Consideration",
    "mf_cas": "Market value",
    "rental_agreement": "Monthly rent",
}
# When the recorded amount is not the printed figure itself, say how it follows from it.
AMOUNT_NOTE: dict[str, str] = {
    "rental_agreement": "Recorded as a year's rent: the monthly rent on the agreement × 12.",
}


def with_pages(doc_type: str | None, fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The fields with a page each. Passport stamps run from page 4, two to a page."""
    out, stamp = [], 0
    for f in fields:
        f = dict(f)
        if "page" not in f:
            if doc_type in ("passport", "travel_history"):
                if f.get("label") in STAMPS:
                    f["page"] = 4 + stamp // 2
                    stamp += 1
                else:
                    f["page"] = 2
            else:
                f["page"] = PAGES.get(doc_type or "", {}).get(f.get("label", ""), 1)
        out.append(f)
    return out


def _doc(doc, title: str | None, issuer: str | None, pages: int | None, lines: list[dict[str, Any]], note: str | None = None) -> dict[str, Any]:
    ev = {"kind": "document", "document_id": doc.id, "filename": doc.filename, "title": title or doc.filename,
          "issuer": issuer, "pages": pages, "lines": [{"page": l.get("page", 1), "label": l["label"], "value": l["value"]} for l in lines]}
    if note:
        ev["note"] = note
    return ev


def from_fields(doc, doc_type: str | None, title: str | None, issuer: str | None, pages: int | None,
                fields: list[dict[str, Any]], labels: list[str], note: str | None = None) -> dict[str, Any] | None:
    paged = with_pages(doc_type, fields)
    lines = [f for f in paged if f.get("label") in labels]
    return _doc(doc, title, issuer, pages, lines, note) if lines else None


def for_amount(doc, sample) -> dict[str, Any] | None:
    """Evidence for the amount a document put on a holding."""
    label = AMOUNT_FIELD.get(sample.doc_type)
    if not label:
        return None
    return from_fields(doc, sample.doc_type, sample.title, sample.issuer, sample.pages, sample.fields, [label], AMOUNT_NOTE.get(sample.doc_type))


def for_reading(doc, labels: list[str], note: str | None = None) -> dict[str, Any] | None:
    """Evidence from a document's stored reading (used to backfill older records)."""
    ex = doc.extracted_json or {}
    fields = ex.get("field_list") or [{"label": k, "value": str(v)} for k, v in (ex.get("fields") or {}).items()]
    return from_fields(doc, doc.doc_type, ex.get("title"), ex.get("issuer"), ex.get("pages"), fields, labels, note)


def _stamp(iso: str) -> str:
    return date.fromisoformat(iso).strftime("%d %b %Y")


def for_stay(doc, fields: list[dict[str, Any]], title: str | None, issuer: str | None, pages: int | None,
             arrived: str, departed: str | None) -> dict[str, Any] | None:
    """The entry stamp (and exit stamp, if any) behind one trip."""
    paged = with_pages(doc.doc_type or "passport", fields)
    want = [("Arrived", _stamp(arrived))] + ([("Left", _stamp(departed))] if departed else [])
    lines = [f for f in paged if (f.get("label"), f.get("value")) in want]
    return _doc(doc, title, issuer, pages, lines) if lines else None


def stay_from_reading(doc, arrived: str, departed: str | None) -> dict[str, Any] | None:
    ex = doc.extracted_json or {}
    return for_stay(doc, ex.get("field_list") or [], ex.get("title"), ex.get("issuer"), ex.get("pages"), arrived, departed)


def answer(question: str, value: str, at: str | None, channel: str = "WhatsApp") -> dict[str, Any]:
    return {"kind": "answer", "channel": channel, "question": question, "answer": value, "at": at}


def said(change) -> dict[str, Any]:
    """From a confirmed ProfileChange: the customer's own words, and when they confirmed."""
    return {"kind": "said", "channel": "WhatsApp" if (change.source or "").lower() == "whatsapp" else "Chat",
            "quote": change.quote, "said_at": change.created_at.isoformat() if change.created_at else None,
            "confirmed_at": change.decided_at.isoformat() if change.decided_at else None, "previous": change.previous_value}


def expert(by: str | None, at: str | None) -> dict[str, Any]:
    return {"kind": "expert", "by": by, "at": at}


DEMO: dict[str, Any] = {"kind": "demo"}


# --------------------------------------------------------------------------- sample references
# Seeded demo facts carry only a short source name ("W-2", "AIS", "valuation report"). For the
# proof of concept, each gets a plausible reference into the document that name points to:
# the document, the section and line, and the line as printed. Marked "sample" so the UI says
# it is illustrative; real extraction (OCR with page and position) fills the same shape.

import re as _re

# source-name pattern -> (document title, issuer, section, default line label)
_REF: list[tuple[str, tuple[str, str | None, str, str]]] = [
    (r"w-?2", ("Form W-2 · Wage and Tax Statement", "Employer payroll", "Box 1", "Wages, tips, other compensation")),
    (r"1099-b", ("Form 1099-B · Proceeds from broker transactions 2025", "E*TRADE from Morgan Stanley", "Summary · Line 1d", "Total proceeds")),
    (r"pay stubs?", ("Pay stub · October 2026", "Employer payroll", "Earnings", "Annual base rate")),
    (r"offer letter", ("Offer letter", "Employer HR", "Clause 3 · Compensation", "Annual base salary")),
    (r"form 16a", ("Form 16A · TDS certificate FY 2025-26", "Tenant (deductor)", "Part A · Summary of TDS", "Tax deducted at source")),
    (r"form 16", ("Form 16 · FY 2026-27", "Employer (TAN on file)", "Part B · Line 1(d)", "Gross salary")),
    (r"\bais\b", ("Annual Information Statement (AIS) · FY 2025-26", "Income Tax Department", "Part B · SFT-016", "Rent received")),
    (r"itr filed", ("ITR-2 · FY 2025-26", "Income Tax Department", "Schedule FA", "Foreign assets disclosed")),
    (r"us return", ("Form 1040 · tax year 2025", "IRS e-file", "Schedule B · Part III", "Form 8938 attached")),
    (r"fincen", ("FinCEN BSA E-Filing acknowledgement", "Financial Crimes Enforcement Network", "Report 114 (FBAR) · calendar year 2025", "Filing status")),
    (r"travel history", ("Travel log · from passport stamps", "Kiyos travel record", "Summary by financial year", "Days in India")),
    (r"passport pages", ("Passport · entry and exit stamps", "Republic of India", "Visa and stamp pages", "Stamp")),
    (r"i-551", ("Permanent resident card (Form I-551)", "U.S. Citizenship and Immigration Services", "Card face", "Resident since")),
    (r"i-407", ("Form I-407 · Record of abandonment of LPR status", "U.S. Citizenship and Immigration Services", "Part 3", "Date of abandonment")),
    (r"409a", ("409A valuation report", "Independent valuation firm", "Section 6 · Conclusion of value", "Fair market value of planned exercise")),
    (r"grant agreement", ("Stock option grant agreement", "Employer equity plan", "Section 2 · Exercise price", "Aggregate exercise price")),
    (r"shareworks", ("Equity award summary · Shareworks", "Morgan Stanley at Work", "Unvested awards", "Unvested units")),
    (r"carta", ("Equity holdings summary · Carta", "Carta", "Vesting schedule", "RSUs vesting")),
    (r"kuvera", ("Consolidated portfolio statement · Kuvera", "Kuvera", "Portfolio summary", "Current value")),
    (r"valuation", ("Registered valuer's report", "Government-approved valuer", "Section 5 · Valuation summary", "Fair market value")),
    (r"ca records", ("CA working papers", "Chartered accountant, Chennai", "Schedule of Indian assets", "Total")),
    (r"estate planner", ("Estate planner's memo", "Estate planning counsel", "Giving intentions", "Planned annual giving")),
    (r"irs 2026", ("IRS Revenue Procedure · 2026 inflation adjustments", "Internal Revenue Service", "Section 3 · Unified credit", "Basic exclusion amount")),
    (r"1099-div", ("Form 1099-DIV · Dividends and distributions 2025", "Brokerage", "Box 1a", "Total ordinary dividends")),
    (r"1099-int", ("Form 1099-INT · Interest income 2025", "Bank", "Box 1", "Interest income")),
    (r"interest certificate", ("Interest certificate · FY 2025-26", "HDFC Bank", "Interest summary", "Interest paid")),
    (r"\bcas\b", ("Consolidated account statement (CAS)", "CAMS and KFintech", "Portfolio summary", "Market value")),
    (r"529", ("529 plan year-end statement", "State 529 plan", "Account summary", "Ending balance")),
    (r"bank statement", ("Account statement · Dec 2025", "Bank", "Account summary", "Closing balance")),
    (r"lease", ("Leave and licence agreement", "Registered, Sub-Registrar", "Clause 4 · Licence fee", "Monthly licence fee")),
    (r"hdfc|year-end$|joint", ("Account statement · year end", "HDFC Bank", "Account summary", "Closing balance")),
    (r"fidelity|empower|tiaa|vanguard|schwab|year-end statement|statement", ("Year-end statement · Dec 2025", None, "Account summary", "Ending balance")),
]

# Line labels for keys that say more than the document's default line.
_KEY_LABEL: list[tuple[str, str]] = [
    (r"vest_price", "Last vest price per share"), (r"unvested_count", "Unvested units"), (r"cost_basis", "Cost basis per share"),
    (r"transfer_effective", "Transfer effective from"), (r"days_in_india_(\d{4})_(\d{2})", "Days in India, FY {0}-{1}"),
    (r"tds", "TDS deducted on rent"), (r"mf_count|mutual_funds_count", "Schemes held"), (r"bank_accounts_count", "Accounts held"),
    (r"ira", "IRA ending balance"), (r"brokerage", "Total account value"), (r"401k", "Plan ending balance"),
    (r"strike", "Aggregate exercise price"), (r"fmv", "Fair market value of planned exercise"), (r"left_india", "Departure, Delhi (DEL)"),
    (r"us_arrived", "Arrival, Newark (EWR)"), (r"rmd", "Required minimum distributions"),
]
_SECTION_OF = {"tds": "Part A · Summary of TDS", "transfer_effective": "Clause 1 · Start date and location"}


def _money(v: float, unit: str | None) -> str:
    if unit == "INR":
        n = int(round(v))
        s = str(n)
        head, tail = s[:-3], s[-3:]
        head = _re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", head)
        return f"₹{head + ',' if head else ''}{tail}"
    return f"${v:,.2f}" if v % 1 else f"${int(v):,}"


def _shown(value: str, unit: str | None) -> str:
    try:
        return date.fromisoformat(value).strftime("%d %b %Y")
    except ValueError:
        pass
    try:
        v = float(value)
    except ValueError:
        return value
    if unit in ("INR", "USD"):
        return _money(v, unit)
    if unit == "USD/share":
        return f"${v:,.2f}"
    if unit:
        return f"{int(v):,} {unit}" if v == int(v) else f"{v} {unit}"
    return f"{int(v):,}" if v == int(v) else str(v)


def sample_reference(key: str, value: str, unit: str | None, source: str, label_override: str | None = None) -> dict[str, Any] | None:
    """A plausible line in the document a seeded fact names. None when the name is not a
    document (e.g. "derived")."""
    src = source.lower()
    ref = next((r for pat, r in _REF if _re.search(pat, src)), None)
    if not ref:
        return None
    title, issuer, section, label = ref
    for pat, lab in _KEY_LABEL:
        m = _re.search(pat, key)
        if m:
            label = lab.format(*m.groups()) if m.groups() else lab
            section = next((s for k, s in _SECTION_OF.items() if k in key), section)
            break
    if label_override:
        label = label_override
    shown_value = value
    if key.startswith("holding:"):
        import json as _json
        h = _json.loads(value)
        if h.get("amount") is None:
            return None  # only a range was given; no document prints a range
        unit = h.get("currency")
        shown_value = str(h["amount"]) if h.get("amount") is not None else h.get("band", "")
        if not label_override:
            label = {"401(k)": "Plan ending balance"}.get(h.get("label", ""), label)
    note = None
    if "lease" in src and unit == "INR":
        try:
            shown_value, note = str(float(value) / 12), "Recorded as a year's rent: the monthly licence fee × 12."
        except ValueError:
            pass
    seed = sum(map(ord, key)) % 7
    ev = {"kind": "document", "document_id": None, "filename": source, "title": title, "issuer": issuer, "pages": 2 + seed,
          "lines": [{"page": 1 + seed % 3, "section": section, "label": label, "value": _shown(shown_value, unit)}], "sample": True}
    if note:
        ev["note"] = note
    return ev


# Illustrative demo holdings: the document each kind of figure would be read from.
_ILLUSTRATIVE: list[tuple[str, str, str, str | None]] = [
    # (pattern on label/id, country or "*", source name, line label)
    (r"flat|plot|villa|house|property|land|apartment", "IN", "valuation", None),
    (r"capital gain", "*", "1099-B", "Realised gain"),
    (r"dividend", "US", "1099-DIV", None),
    (r"dividend", "IN", "AIS", "Dividend income"),
    (r"interest", "US", "1099-INT", None),
    (r"interest", "IN", "interest certificate", None),
    (r"^rent|rental income", "IN", "AIS", "Rent received"),
    (r"rsu|vest", "US", "Carta", "RSUs vested, value at vest"),
    (r"salary", "US", "W-2", None),
    (r"salary", "IN", "Form 16", None),
    (r"529", "*", "529", None),
    (r"401|ira|roth|retire", "*", "Fidelity statement", "Ending balance"),
    (r"mutual|\bmf\b", "IN", "CAS", None),
    (r"listed shares|equity", "IN", "CAS", "Equity holdings, market value"),
    (r"savings|hysa", "US", "bank statement", None),
    (r"deposit|nre|nro|fd", "IN", "HDFC statement", "Fixed deposits, principal"),
    (r"brokerage|rsu|shares", "US", "Schwab statement", "Total account value"),
]
_ILLUSTRATIVE_DATES = {"left_india_on": "Departure, Delhi (DEL)", "us_arrived_on": "Arrival, Newark (EWR)",
                       "us_departed_on": "Departure, Newark (EWR)", "india_return_date": "Arrival, Bengaluru (BLR)"}


def illustrative_reference(key: str, value: str, unit: str | None) -> dict[str, Any] | None:
    """A sample reference for a demo figure. Tax figures get none: they come from the expert."""
    if key.startswith("tax_estimate"):
        return None
    if key in _ILLUSTRATIVE_DATES:
        return sample_reference(key, value, unit, "Passport pages", _ILLUSTRATIVE_DATES[key])
    if not key.startswith("holding:"):
        return None
    import json as _json
    h = _json.loads(value)
    text = f"{h.get('label', '')} {h.get('id', '')}".lower()
    for pat, country, source, label in _ILLUSTRATIVE:
        # An asset's name can mention its income ("Flat in Pune (rented out)"): match assets
        # only against asset patterns, income only against income patterns.
        is_asset_pat = source in ("valuation", "CAS", "Fidelity statement", "529", "bank statement", "HDFC statement", "Schwab statement")
        if is_asset_pat != (h.get("kind") == "asset"):
            continue
        if (country == "*" or country == h.get("country")) and _re.search(pat, text):
            return sample_reference(key, value, unit, source, label)
    return None


def illustrative_trip(arrived: str, departed: str | None) -> dict[str, Any]:
    """Sample passport stamps for a demo trip."""
    seed = sum(map(ord, arrived)) % 9
    lines = [{"page": 4 + seed, "section": "Visa and stamp pages", "label": "Arrival, Bengaluru (BLR)", "value": _shown(arrived, None)}]
    if departed:
        lines.append({"page": 4 + seed, "section": "Visa and stamp pages", "label": "Departure, Bengaluru (BLR)", "value": _shown(departed, None)})
    return {"kind": "document", "document_id": None, "filename": "Passport", "title": "Passport · entry and exit stamps",
            "issuer": "Republic of India", "pages": 36, "lines": lines, "sample": True}
