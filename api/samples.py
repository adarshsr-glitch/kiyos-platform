"""Synthetic documents and extraction for the prototype (proof of concept).

Document reading isn't built yet. For the demo, each requested document type has a
realistic synthetic sample, generated for the customer it belongs to. "Uploading" a
sample stores it as a document, runs a simulated extraction (fixed fields with a
per-field confidence), and applies what was read to the case: amounts on holdings,
stays from passport stamps, and mismatches against what the customer told us.
Everything produced here is marked `synthetic: true`.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import evidence
from infra.schema import Case, Document, Fact, Stay

INR_BANDS = {"Under ₹5L": (0, 5e5), "₹5–25L": (5e5, 2.5e6), "₹25L–1Cr": (2.5e6, 1e7), "Over ₹1Cr": (1e7, None)}
USD_BANDS = {"Under $10k": (0, 1e4), "$10–50k": (1e4, 5e4), "$50–250k": (5e4, 2.5e5), "Over $250k": (2.5e5, None)}


def _band_range(band: str | None) -> tuple[float, float | None] | None:
    if not band:
        return None
    return INR_BANDS.get(band) or USD_BANDS.get(band)


def _seed(case: Case, doc_type: str) -> int:
    return int(hashlib.sha256(f"{case.id}:{case.client_name}:{doc_type}".encode()).hexdigest()[:8], 16)


def _within(band: str | None, fallback: float, seed: int) -> float:
    r = _band_range(band)
    if not r:
        return fallback
    lo, hi = r
    hi = hi or lo * 2.5
    lo = max(lo, hi * 0.08)
    return round(lo + (hi - lo) * (0.35 + (seed % 40) / 100), -2)


def usd(n: float) -> str:
    return f"${n:,.0f}"


def inr(n: float) -> str:
    s = f"{int(round(n))}"
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return "₹" + (",".join(groups) + "," + tail if groups else tail)


# What each reader's holding is, so a document can create it when the case doesn't have it
# yet (e.g. a customer who paid straight after the WhatsApp scan, without onboarding).
HOLDING_META: dict[str, tuple[str, str, str]] = {
    "us-salary": ("US", "income", "Salary (US employer)"),
    "us-brokerage": ("US", "asset", "Brokerage account"),
    "us-401k": ("US", "asset", "401(k)"),
    "in-nro": ("IN", "asset", "NRO savings and deposits"),
    "in-bank": ("IN", "asset", "Bank account"),
    "in-interest": ("IN", "income", "Interest on deposits"),
    "in-salary": ("IN", "income", "Salary (India)"),
    "in-flat": ("IN", "asset", "Flat in India"),
    "in-property": ("IN", "asset", "Property in India"),
    "in-rent": ("IN", "income", "Rental income"),
    "in-mf": ("IN", "asset", "Indian mutual funds"),
}


def _band_for(amount: float, currency: str | None) -> str:
    if currency == "USD":
        return "Under $10k" if amount < 1e4 else "$10–50k" if amount < 5e4 else "$50–250k" if amount < 2.5e5 else "Over $250k"
    return "Under ₹5L" if amount < 5e5 else "₹5–25L" if amount < 25e5 else "₹25L–1Cr" if amount < 1e7 else "Over ₹1Cr"


# What counts as "the same kind of holding", across structured holdings and older fact keys.
SIMILAR: dict[str, str] = {
    "us-401k": r"401k|401\(k\)|\bira\b|roth|retire",
    "us-brokerage": r"brokerage|rsu|shares|equity|etrade|schwab",
    "in-property": r"property|flat|plot|land|house|villa|bungalow|apt",
    "in-flat": r"property|flat|plot|land|house|villa|bungalow|apt",
    "in-mf": r"_mf_|mutual|\bmf\b",
    # A salary is already on record if any salary fact exists for that country.
    "in-salary": r"salary|form_?16",
    "us-salary": r"salary|wage|w-?2",
}


def has_similar(facts: list[Fact], hid: str) -> bool:
    """True if the case already records this kind of holding, under any id or legacy key."""
    import re
    if any(f.key == f"holding:{hid}" for f in facts):
        return True
    pat = SIMILAR.get(hid)
    if not pat:
        return False
    country = HOLDING_META.get(hid, ("", "", ""))[0]
    for f in facts:
        text = f.key
        if f.key.startswith("holding:"):
            try:
                h = json.loads(f.value)
            except ValueError:
                continue
            if h.get("country") != country or h.get("kind") != HOLDING_META.get(hid, ("", "asset", ""))[1]:
                continue
            text = f"{f.key} {h.get('label', '')}"
        elif country == "US" and not f.key.startswith(("us_", "fidelity", "401k")):
            continue
        if re.search(pat, text.lower()):
            return True
    return False


def propagate(case: Case, doc: Document, sample: "Sample", facts: list[Fact], stays: list[Stay], session) -> list[str]:
    """Put what a document established into the case record: the holding's amount (creating
    the holding if the case didn't have it) and any trips from passport stamps. Additive and
    idempotent; never changes the document's own status. Returns what changed."""
    changed: list[str] = []
    h = {f.key.split(":", 1)[1]: f for f in facts if f.key.startswith("holding:")}
    if sample.holding_id and sample.amount is not None and sample.holding_id not in h and sample.holding_id in HOLDING_META and not has_similar(facts, sample.holding_id):
        country, kind, label = HOLDING_META[sample.holding_id]
        data = {"id": sample.holding_id, "country": country, "kind": kind, "label": label,
                "currency": sample.currency or ("USD" if country == "US" else "INR"),
                "band": _band_for(sample.amount, sample.currency), "amount": sample.amount, "evidence": doc.filename}
        fact = Fact(case_id=case.id, key=f"holding:{sample.holding_id}", value=json.dumps(data, ensure_ascii=False), source=doc.filename,
                    evidence=evidence.for_amount(doc, sample))
        session.add(fact)
        facts.append(fact)
        changed.append(label)
    if sample.stays:
        have = {(st.arrived, st.departed) for st in stays if st.country == "IN"}
        for a, d in sample.stays:
            if (a, d) not in have:
                st = Stay(case_id=case.id, country="IN", arrived=a, departed=d, source="Passport stamps", document_id=doc.id,
                          evidence=evidence.for_stay(doc, sample.fields, sample.title, sample.issuer, sample.pages, a, d))
                session.add(st)
                stays.append(st)
                changed.append(f"trip {a}")
    return changed


@dataclass
class Sample:
    doc_type: str
    title: str
    filename: str
    issuer: str
    period: str
    pages: int
    fields: list[dict[str, Any]]
    holding_id: str | None = None
    amount: float | None = None
    currency: str | None = None
    stays: list[tuple[str, str | None]] | None = None


def _holdings(facts: list[Fact]) -> dict[str, dict]:
    return {f.key.split(":", 1)[1]: json.loads(f.value) for f in facts if f.key.startswith("holding:")}


def build(case: Case, doc_type: str, facts: list[Fact], stays: list[Stay]) -> Sample:
    """The synthetic document for this case and type, each field with the page it sits on."""
    sample = _build(case, doc_type, facts, stays)
    sample.fields = evidence.with_pages(doc_type, sample.fields)
    return sample


def _build(case: Case, doc_type: str, facts: list[Fact], stays: list[Stay]) -> Sample:
    h = _holdings(facts)
    s = _seed(case, doc_type)
    name = case.client_name
    first = name.split()[0]
    pan = f"{'ABCDE'[s % 5]}{'FGHIJ'[s % 5]}{'KLMNP'[(s // 7) % 5]}P{name.split()[-1][0]}••••{s % 10}{'XYZ'[s % 3]}"
    f = lambda label, value, conf=0.98: {"label": label, "value": value, "confidence": conf}  # noqa: E731

    if doc_type == "W-2":
        employer = "Amazon.com Services LLC" if case.demo_key == "preeti" else "Stripe, Inc."
        wages = _within(h.get("us-salary", {}).get("band"), 142000, s)
        return Sample(doc_type, "W-2 Wage and Tax Statement 2025", f"W2-2025-{employer.split()[0]}.pdf", employer, "Tax year 2025", 1, [
            f("Employee", name), f("Employer", employer), f("Box 1 · Wages", usd(wages)),
            f("Box 2 · Federal tax withheld", usd(wages * 0.21)), f("Box 16 · State wages (WA)" if case.demo_key == "preeti" else "Box 16 · State wages", usd(wages)),
            f("Box 12 · 401(k) deferrals (D)", usd(23000), 0.93),
        ], "us-salary", wages, "USD")
    if doc_type == "brokerage_statement":
        if case.demo_key == "preeti":
            proceeds, gain = 148200.0, 86300.0
        else:
            proceeds = _within(h.get("us-brokerage", {}).get("band"), 38000, s)
            gain = round(proceeds * 0.32, -2)
        return Sample(doc_type, "Form 1099-B · Proceeds from broker transactions 2026", "Schwab-1099B-2026.pdf", "Charles Schwab & Co.", "Tax year 2026", 4, [
            f("Recipient", name), f("Payer", "Charles Schwab & Co., Inc."), f("Total proceeds", usd(proceeds)),
            f("Cost basis", usd(proceeds - gain)), f("Realised gain", usd(gain)),
            f("Long-term", usd(round(gain * 0.86, -2)), 0.95), f("Short-term", usd(round(gain * 0.14, -2)), 0.95),
            f("Wash sales disallowed", "$0", 0.9),
        ], "us-brokerage", proceeds, "USD")
    if doc_type == "401k_statement":
        bal = _within(h.get("us-401k", {}).get("band"), 186000, s)
        return Sample(doc_type, "401(k) year-end statement", "Fidelity-401k-Dec2025.pdf", "Fidelity Investments", "31 Dec 2025", 3, [
            f("Participant", name), f("Plan", "Employer 401(k) Savings Plan"), f("Ending balance", usd(bal)),
            f("Employee contributions 2025", usd(23000)), f("Employer match 2025", usd(9200), 0.94), f("Vested", "100%"),
        ], "us-401k", bal, "USD")
    if doc_type == "bank_statement":
        hid = "in-nro" if "in-nro" in h else "in-bank"
        bal = _within(h.get(hid, {}).get("band"), 1850000, s)
        interest = round(bal * 0.068, -2)
        return Sample(doc_type, "NRO account statement · Apr 2025 – Mar 2026", "NRO-statement-FY2025-26.pdf", "HDFC Bank", "1 Apr 2025 – 31 Mar 2026", 6, [
            f("Account holder", name), f("Account", f"NRO ••••{4000 + s % 5000}"), f("Closing balance", inr(bal)),
            f("Peak balance", inr(bal * 1.12), 0.92), f("Interest credited", inr(interest)), f("TDS on interest (30%)", inr(interest * 0.312), 0.96),
        ], hid, bal, "INR")
    if doc_type == "interest_certificate":
        interest = _within(h.get("in-interest", {}).get("band"), 120000, s)
        return Sample(doc_type, "Interest certificate FY 2025-26", "Interest-certificate-FY2025-26.pdf", "HDFC Bank", "FY 2025-26", 1, [
            f("Depositor", name), f("PAN", pan), f("Interest paid", inr(interest)), f("TDS deducted", inr(interest * 0.312)),
        ], "in-interest", interest, "INR")
    if doc_type == "form_16":
        gross = _within(h.get("in-salary", {}).get("band"), 4200000, s)
        return Sample(doc_type, "Form 16 · FY 2025-26", "Form16-FY2025-26.pdf", "Infosys Ltd", "FY 2025-26", 4, [
            f("Employee", name), f("PAN", pan), f("Employer TAN", "BLRI•••••E"), f("Gross salary", inr(gross)),
            f("Tax deducted (TDS)", inr(gross * 0.24)), f("Regime", "New tax regime", 0.9),
        ], "in-salary", gross, "INR")
    if doc_type == "property_document":
        hid = "in-flat" if "in-flat" in h else "in-property"
        price = _within(h.get(hid, {}).get("band"), 14500000, s)
        city = "Hyderabad" if case.demo_key == "ananya" else "Pune"
        return Sample(doc_type, "Sale deed (registered)", f"Sale-deed-{city}.pdf", f"Sub-Registrar, {city}", "Registered 14 Mar 2019", 18, [
            f("Owner(s)", name if case.demo_key != "ananya" else f"{name} and Rohit Bose (joint)"), f("Property", f"Flat 1204, {city}"),
            f("Registration date", "14 Mar 2019"), f("Consideration", inr(price)), f("Stamp duty paid", inr(price * 0.06), 0.94),
        ], hid, price, "INR")
    if doc_type == "prior_returns":
        return Sample(doc_type, "Last year's returns · ITR-V and Form 1040", f"Prior-returns-{first}.pdf", "Income Tax Department / IRS", "FY 2024-25 and tax year 2024", 12, [
            f("Taxpayer", name), f("PAN", pan), f("India · return filed", "ITR-2, filed 28 Jul 2025"),
            f("India · residential status declared", "Non-resident", 0.94), f("US · return filed", "Form 1040, filed 9 Apr 2025"),
            f("US · filing status", "Single", 0.93), f("Foreign accounts reported (FBAR)", "Yes, 3 accounts", 0.88),
        ])
    if doc_type == "mf_cas":
        value = _within(h.get("in-mf", {}).get("band"), 420000, s)
        return Sample(doc_type, "Consolidated account statement (CAS)", "CAS-CAMS-KFintech-Mar2026.pdf", "CAMS and KFintech", "As of 31 Mar 2026", 5, [
            f("Investor", name), f("PAN", pan), f("Folios", "4"), f("Market value", inr(value)),
            f("Equity funds", inr(value * 0.7), 0.95), f("Debt funds", inr(value * 0.3), 0.95), f("Redemptions in FY 2025-26", inr(0), 0.9),
        ], "in-mf", value, "INR")
    if doc_type in ("passport", "travel_history"):
        recorded = [(st.arrived, st.departed) for st in stays if st.country == "IN"]
        if not recorded:
            # Nothing on record yet: the (synthetic) stamps show two winter visits and, if
            # the customer has moved back, the arrival that started their current stay.
            y = date.today().year
            recorded = [(f"{y - 2}-12-{14 + s % 7:02d}", f"{y - 1}-01-{4 + s % 6:02d}"), (f"{y - 1}-12-{16 + s % 6:02d}", f"{y}-01-{3 + s % 5:02d}")]
            if getattr(case, "_moved_back", False):
                recorded.append((f"{y}-0{3 + s % 4}-{10 + s % 15:02d}", None))
        if case.demo_key == "ananya":
            recorded = recorded + [("2026-06-02", "2026-07-17")]  # a trip she didn't mention
        entries = []
        for a, d in sorted(recorded):
            entries.append(["Arrived", a])
            if d:
                entries.append(["Left", d])
        fields = [f("Name", name), f("Passport", f"Z{s % 10}••••{s % 1000:03d}"), f("Nationality", "Indian")]
        fields += [f(k, date.fromisoformat(v).strftime("%d %b %Y"), 0.9) for k, v in entries]
        return Sample(doc_type, "Passport · entry and exit stamps", f"Passport-{first}-travel-pages.pdf", "Republic of India", "Pages 4–17", 14, fields, stays=recorded)
    if doc_type == "rental_agreement":
        rent = _within(h.get("in-rent", {}).get("band"), 420000, s) / 12
        return Sample(doc_type, "Leave and licence agreement", "Lease-Pune-2025.pdf", "Registered, Pune", "Jun 2025 – May 2026", 9, [
            f("Licensor", name), f("Monthly rent", inr(rent)), f("Licensor PAN on agreement", pan, 0.88), f("Tenant deducts TDS", "Yes, 31.2%", 0.85),
        ], "in-rent", rent * 12, "INR")
    if doc_type == "payslip":
        # Monthly payslips from the Indian employer on record. Salary lines only: no tax
        # figures are made up here; tax comes from the expert.
        employer = next((x.value for x in facts if x.key == "india_employer" and x.value), None) or "Infosys Ltd"
        monthly = _within(h.get("in-salary", {}).get("band"), 7500000, s) / 12
        basic = round(monthly * 0.4, -2)
        return Sample(doc_type, "Payslips · Aug–Oct 2026", f"Payslips-{employer.split()[0]}-Aug-Oct-2026.pdf", employer, "Aug – Oct 2026", 3, [
            f("Employee", name), f("Employer", employer), f("Pay period", "Aug – Oct 2026"),
            f("Gross salary per month", inr(monthly)), f("Basic pay per month", inr(basic), 0.96),
            f("Joining bonus (Aug)", inr(round(monthly * 0.8, -4)), 0.93), f("Employee PF per month", inr(round(basic * 0.12, -1)), 0.95),
        ])
    label = doc_type.replace("_", " ")
    return Sample(doc_type, label[0].upper() + label[1:], f"{doc_type}.pdf", "Uploaded document", "Undated", 1, [f("Holder", name)])


def apply(case: Case, doc: Document, sample: Sample, facts: list[Fact], stays: list[Stay], session) -> dict[str, Any]:
    """Store the extraction on the document and apply it to the case. Returns what changed."""
    effects: list[str] = []
    mismatch = None
    h = {f.key.split(":", 1)[1]: f for f in facts if f.key.startswith("holding:")}
    if sample.holding_id and sample.amount is not None:
        fact = h.get(sample.holding_id)
        money = usd(sample.amount) if sample.currency == "USD" else inr(sample.amount)
        if fact:
            data = json.loads(fact.value)
            r = _band_range(data.get("band"))
            data.update({"amount": sample.amount, "evidence": doc.filename})
            fact.value = json.dumps(data)
            fact.source = doc.filename
            fact.evidence = evidence.for_amount(doc, sample)
            effects.append(f"{data['label']}: {money} confirmed from the document")
            if r and not (r[0] <= sample.amount <= (r[1] or 1e15)):
                mismatch = {"title": data["label"], "stated": f"{data['band']} (you told us)", "found": f"{money} ({doc.filename})",
                            "effect": f"The document shows {money}, outside the {data['band']} range given in onboarding. The range is replaced by the document figure."}
                effects.append(f"Doesn't match the range you gave ({data['band']}). Flagged for your expert")
        else:
            propagate(case, doc, sample, facts, stays, session)
            effects.append(f"{HOLDING_META.get(sample.holding_id, ('', '', 'Amount'))[2]}: {money} added to your record from the document")
    if sample.stays is not None:
        before = {(st.arrived, st.departed) for st in stays if st.country == "IN"}
        stamp = lambda a, d: evidence.for_stay(doc, sample.fields, sample.title, sample.issuer, sample.pages, a, d)  # noqa: E731
        for st in stays:
            if st.country == "IN":
                st.source, st.document_id = "Passport stamps", doc.id
                st.evidence = stamp(st.arrived, st.departed) or st.evidence
        new = [p for p in sample.stays if p not in before]
        for a, d in new:
            session.add(Stay(case_id=case.id, country="IN", arrived=a, departed=d, source="Passport stamps", document_id=doc.id, evidence=stamp(a, d)))
        effects.append(f"{len(sample.stays)} trip{'s' if len(sample.stays) != 1 else ''} to India confirmed from passport stamps")
        if new:
            days = sum(((date.fromisoformat(d) if d else date.today()) - date.fromisoformat(a)).days + 1 for a, d in new)
            effects.append(f"Found {len(new)} trip{'s' if len(new) != 1 else ''} you didn't mention ({days} days). Residency recalculated")
            plural = lambda n: f"{n} trip{'s' if n != 1 else ''}"  # noqa: E731
            mismatch = {"title": "Trips to India", "stated": f"{plural(len(before))} (onboarding)", "found": f"{plural(len(sample.stays))} (passport)",
                        "effect": f"An unreported trip adds {days} days in India. Residency has been recalculated from the passport."}
    if not effects:
        effects.append(f"{len(sample.fields)} details read and added to your record")
    doc.extracted_json = {
        "synthetic": True,
        # Malware scan before reading (S3 + GuardDuty Malware Protection in the product).
        "scan": {"status": "clean", "engine": "GuardDuty Malware Protection (simulated)", "at": date.today().isoformat()},
        "source": "Sample document (prototype). Reading is simulated.",
        "title": sample.title, "issuer": sample.issuer, "period": sample.period, "pages": sample.pages,
        "fields": {x["label"]: x["value"] for x in sample.fields},
        "field_list": sample.fields,
        "effects": effects,
        "mismatch": mismatch,
    }
    doc.status = "checking"
    return {"title": sample.title, "issuer": sample.issuer, "period": sample.period, "pages": sample.pages,
            "fields": sample.fields, "effects": effects, "mismatch": mismatch}


def catalogue(case: Case, doc_type: str | None, facts: list[Fact], stays: list[Stay]) -> list[dict[str, Any]]:
    """What the picker shows: the matching sample, as a file the customer has."""
    types = [doc_type] if doc_type else ["W-2", "bank_statement", "passport", "401k_statement", "form_16", "property_document"]
    out = []
    for t in types:
        smp = build(case, t, facts, stays)
        size = 180 + (_seed(case, t) % 900)
        out.append({"doc_type": t, "filename": smp.filename, "title": smp.title, "issuer": smp.issuer, "pages": smp.pages,
                    "size_kb": size, "modified": (date.today() - timedelta(days=_seed(case, t) % 40 + 2)).isoformat()})
    return out
