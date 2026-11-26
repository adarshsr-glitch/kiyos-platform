"""Writes knowledge/index.yaml: the catalogue of rules Kiyos needs, for the tax team to write.

An index, not rules. Each entry names an area, a neutral title, the law it sits under (and the
section where well established) and a kind. It carries no tax wording, logic, thresholds or
outcomes: those are written by the tax team as rule files (or imported from their spreadsheet)
and validated before Kiyos answers from them (C-03). Section references are a starting point
for the tax team to confirm. Rules already written keep their existing IDs.

Run: python scripts/build_rule_index.py
"""

from pathlib import Path

import yaml

ITA, IRC, DTAA, FEMA, BMA, BSA = "Income Tax Act, 1961", "Internal Revenue Code", "India–US tax treaty", "FEMA, 1999", "Black Money Act, 2015", "Bank Secrecy Act"

# (area key, country, area title, [(title, law, section or None, kind, existing rule id or None)])
AREAS = [
    ("in-res", "IN", "Residency and scope", [
        ("Resident: the 182-day test", ITA, "6(1)(a)", "test", "IN-RES-182"),
        ("Resident: the 60-day and 365-day test", ITA, "6(1)(c)", "test", "IN-RES-60-365"),
        ("The 60-day test for citizens and PIOs visiting India", ITA, "6(1), Explanation 1", "caveat", None),
        ("The 120-day variant where Indian income crosses the limit", ITA, "6(1), Explanation 1", "caveat", None),
        ("Deemed resident: citizens not liable to tax elsewhere", ITA, "6(1A)", "test", None),
        ("RNOR: non-resident in nine of ten years", ITA, "6(6)(a)", "test", "IN-RES-RNOR-9OF10"),
        ("RNOR: 729 days or less in seven years", ITA, "6(6)(a)", "test", "IN-RES-RNOR-729DAYS"),
        ("RNOR for deemed residents", ITA, "6(6)(d)", "test", None),
        ("Scope of total income by residential status", ITA, "5", "definition", None),
        ("Income deemed to accrue or arise in India", ITA, "9", "definition", None),
        ("Counting a day of presence in India", ITA, None, "caveat", None),
        ("Previous year and assessment year", ITA, "2(34), 3", "definition", None),
    ]),
    ("in-nri", "IN", "NRI bank accounts and interest", [
        ("Interest on NRE accounts", ITA, "10(4)(ii)", "exemption", None),
        ("Interest on FCNR deposits", ITA, None, "exemption", None),
        ("Interest on NRO accounts", ITA, None, "rate", None),
        ("TDS on NRO interest", ITA, "195", "withholding", None),
        ("Status of NRE and FCNR accounts after becoming resident", FEMA, None, "procedure", None),
        ("Redesignating accounts as RFC on return", FEMA, None, "procedure", None),
        ("Repatriating money from NRO accounts", FEMA, None, "procedure", None),
        ("Interest on savings accounts", ITA, "80TTA", "deduction", None),
    ]),
    ("in-salary", "IN", "Salary and employee equity", [
        ("Salary: when it is taxable in India", ITA, "15", "definition", None),
        ("Salary for services rendered in India", ITA, "9(1)(ii)", "definition", None),
        ("Perquisites", ITA, "17(2)", "definition", None),
        ("ESOPs and RSUs as a perquisite", ITA, "17(2)(vi)", "definition", None),
        ("Value of an ESOP or RSU on allotment", ITA, "17(2)(vi)", "valuation", None),
        ("Foreign RSUs vesting during RNOR years", ITA, None, "caveat", None),
        ("RSUs vesting across a move between countries", ITA, None, "caveat", None),
        ("Selling shares allotted under an ESOP", ITA, "49(2AA)", "valuation", None),
        ("Standard deduction from salary", ITA, "16(ia)", "deduction", None),
        ("Leave encashment and gratuity on leaving a job", ITA, "10(10), 10(10AA)", "exemption", None),
        ("TDS on salary", ITA, "192", "withholding", None),
    ]),
    ("in-house", "IN", "House property", [
        ("Rent from property in India", ITA, "22", "definition", None),
        ("Annual value of a let-out property", ITA, "23", "valuation", None),
        ("Self-occupied property", ITA, "23(2)", "definition", None),
        ("Deductions from house property income", ITA, "24", "deduction", None),
        ("Interest on a home loan", ITA, "24(b)", "deduction", None),
        ("TDS on rent paid to a non-resident landlord", ITA, "195", "withholding", None),
        ("Set-off of house property loss", ITA, "71(3A)", "caveat", None),
    ]),
    ("in-cg", "IN", "Capital gains", [
        ("What a capital asset is", ITA, "2(14)", "definition", None),
        ("Short-term and long-term holding periods", ITA, "2(42A)", "definition", None),
        ("Charge of capital gains", ITA, "45", "definition", None),
        ("Computing a capital gain", ITA, "48", "valuation", None),
        ("Cost of an inherited or gifted asset", ITA, "49(1)", "valuation", None),
        ("Stamp duty value as sale consideration", ITA, "50C", "valuation", None),
        ("Short-term gains on listed equity", ITA, "111A", "rate", None),
        ("Long-term gains on listed equity", ITA, "112A", "rate", None),
        ("Long-term gains on other assets", ITA, "112", "rate", None),
        ("Gains on debt mutual funds", ITA, "50AA", "rate", None),
        ("Reinvesting in a residential house", ITA, "54", "exemption", None),
        ("Investing in specified bonds", ITA, "54EC", "exemption", None),
        ("Reinvesting proceeds of other assets in a house", ITA, "54F", "exemption", None),
        ("Capital gains account scheme", ITA, "54(2)", "procedure", None),
        ("TDS when a non-resident sells property", ITA, "195", "withholding", None),
        ("TDS when buying property from a resident", ITA, "194-IA", "withholding", None),
        ("Lower TDS certificate", ITA, "197", "procedure", None),
        ("Gains on foreign shares and funds", ITA, None, "caveat", None),
        ("Indexation for assets bought before the cut-off", ITA, "48", "caveat", None),
    ]),
    ("in-other", "IN", "Other income", [
        ("Dividends", ITA, "56(2)(i)", "definition", None),
        ("TDS on dividends to non-residents", ITA, "195", "withholding", None),
        ("Gifts received", ITA, "56(2)(x)", "definition", None),
        ("Gifts from relatives", ITA, "56(2)(x)", "exemption", None),
        ("Clubbing of a spouse's income", ITA, "64", "caveat", None),
        ("Interest on income tax refunds", ITA, "244A", "definition", None),
        ("Foreign pensions and retirement withdrawals", ITA, None, "caveat", None),
    ]),
    ("in-nri-special", "IN", "Special provisions for non-residents", [
        ("Investment income of non-residents", ITA, "115C–115I", "rate", None),
        ("Choosing not to apply the special provisions", ITA, "115I", "procedure", None),
        ("Continuing the special provisions after becoming resident", ITA, "115H", "caveat", None),
        ("When a non-resident need not file a return", ITA, "115G", "procedure", None),
    ]),
    ("in-regime", "IN", "Tax regimes and deductions", [
        ("The new tax regime", ITA, "115BAC", "rate", None),
        ("Choosing the old regime", ITA, "115BAC(6)", "procedure", None),
        ("Basic exemption limit for non-residents", ITA, None, "caveat", None),
        ("Rebate for lower incomes", ITA, "87A", "deduction", None),
        ("Investments and payments", ITA, "80C", "deduction", None),
        ("Health insurance premiums", ITA, "80D", "deduction", None),
        ("Surcharge and cess", ITA, None, "rate", None),
    ]),
    ("in-relief", "IN", "Relief from double taxation", [
        ("Relief under a tax treaty", ITA, "90", "relief", None),
        ("Relief where there is no treaty", ITA, "91", "relief", None),
        ("Foreign tax credit rules", ITA, "Rule 128", "relief", None),
        ("Form 67 for foreign tax credit", ITA, "Rule 128", "procedure", None),
        ("Tax residency certificate", ITA, "90(4)", "procedure", None),
        ("Timing differences between Indian and US tax years", ITA, None, "caveat", None),
    ]),
    ("in-file", "IN", "Returns, disclosure and deadlines", [
        ("Who must file a return", ITA, "139(1)", "procedure", None),
        ("Return due dates", ITA, "139(1)", "deadline", None),
        ("Which ITR form applies", ITA, None, "procedure", None),
        ("Schedule FA: foreign assets", ITA, None, "disclosure", None),
        ("Schedule FA during RNOR years", ITA, None, "caveat", None),
        ("Belated and revised returns", ITA, "139(4), 139(5)", "deadline", None),
        ("Updated return", ITA, "139(8A)", "procedure", None),
        ("Advance tax", ITA, "208", "deadline", None),
        ("Interest for late filing", ITA, "234A", "penalty", None),
        ("Interest for short advance tax", ITA, "234B, 234C", "penalty", None),
        ("Fee for late filing", ITA, "234F", "penalty", None),
        ("Undisclosed foreign assets", BMA, None, "penalty", None),
        ("Penalty for not disclosing foreign assets in a return", BMA, "43", "penalty", None),
        ("PAN for non-residents", ITA, "139A", "procedure", None),
        ("Responding to an income tax notice", ITA, None, "procedure", None),
    ]),
    ("in-fema", "IN", "Foreign exchange (FEMA)", [
        ("Liberalised Remittance Scheme", FEMA, None, "procedure", None),
        ("Tax collected at source on remittances", ITA, "206C(1G)", "withholding", None),
        ("Holding foreign assets after returning", FEMA, None, "procedure", None),
        ("Buying and selling property in India as an NRI", FEMA, None, "procedure", None),
        ("Moving sale proceeds abroad", FEMA, None, "procedure", None),
    ]),
    ("us-res", "US", "Residency and filing status", [
        ("Resident alien: the green card test", IRC, "7701(b)(1)(A)(i)", "test", "US-RES-GREEN-CARD"),
        ("Resident alien: the substantial presence test", IRC, "7701(b)(3)", "test", "US-RES-SPT"),
        ("Exempt individuals (students, teachers, diplomats)", IRC, "7701(b)(5)", "caveat", None),
        ("Closer connection exception", IRC, "7701(b)(3)(B)", "caveat", None),
        ("First-year choice", IRC, "7701(b)(4)", "procedure", None),
        ("Residency start and end dates", IRC, "7701(b)(2)", "definition", None),
        ("Dual-status year", IRC, None, "definition", None),
        ("Treating a non-resident spouse as resident", IRC, "6013(g)", "procedure", None),
        ("Election for the year residency starts or ends", IRC, "6013(h)", "procedure", None),
        ("US citizens taxed on worldwide income", IRC, "1, 61", "definition", None),
    ]),
    ("us-income", "US", "Income and exclusions", [
        ("Gross income", IRC, "61", "definition", None),
        ("Foreign earned income exclusion", IRC, "911", "exemption", None),
        ("Foreign housing exclusion", IRC, "911(c)", "exemption", None),
        ("Selling a main home", IRC, "121", "exemption", None),
        ("Rental income from property abroad", IRC, None, "definition", None),
        ("Foreign currency gains and losses", IRC, "988", "caveat", None),
        ("Interest on Indian bank accounts", IRC, None, "definition", None),
        ("Qualified dividends", IRC, "1(h)(11)", "rate", None),
        ("Net investment income tax", IRC, "1411", "rate", None),
        ("Capital gains rates", IRC, "1(h)", "rate", None),
    ]),
    ("us-equity", "US", "Equity compensation", [
        ("Property transferred for services (RSUs)", IRC, "83", "definition", None),
        ("Election to be taxed at grant", IRC, "83(b)", "procedure", None),
        ("Incentive stock options", IRC, "422", "definition", None),
        ("Non-qualified stock options", IRC, "83", "definition", None),
        ("Alternative minimum tax", IRC, "55", "rate", None),
        ("Sourcing equity income across countries", IRC, "861, 862", "caveat", None),
        ("Withholding on supplemental wages", IRC, None, "withholding", None),
    ]),
    ("us-ftc", "US", "Foreign tax credit", [
        ("Credit for foreign taxes", IRC, "901", "relief", None),
        ("Limit on the credit", IRC, "904", "relief", None),
        ("Separate categories of income", IRC, "904(d)", "caveat", None),
        ("Carrying unused credits back or forward", IRC, "904(c)", "relief", None),
        ("Form 1116", IRC, None, "procedure", None),
        ("Deducting foreign taxes instead", IRC, "164", "procedure", None),
    ]),
    ("us-pfic", "US", "Foreign funds (PFIC)", [
        ("What a PFIC is", IRC, "1297", "definition", None),
        ("Indian mutual funds as PFICs", IRC, "1297", "caveat", None),
        ("Excess distribution rules", IRC, "1291", "rate", None),
        ("Qualified electing fund", IRC, "1295", "procedure", None),
        ("Mark-to-market election", IRC, "1296", "procedure", None),
        ("Form 8621", IRC, "1298(f)", "disclosure", None),
    ]),
    ("us-report", "US", "Foreign account and asset reporting", [
        ("FBAR (FinCEN 114)", BSA, None, "disclosure", None),
        ("Who must file an FBAR", BSA, None, "disclosure", None),
        ("FBAR due date and extension", BSA, None, "deadline", None),
        ("FBAR penalties", BSA, None, "penalty", None),
        ("Form 8938 (FATCA)", IRC, "6038D", "disclosure", None),
        ("Form 8938 thresholds by filing status", IRC, "6038D", "disclosure", None),
        ("Form 3520: foreign gifts and inheritances", IRC, "6039F", "disclosure", None),
        ("Form 3520: foreign trusts", IRC, "6048", "disclosure", None),
        ("Form 5471: foreign companies", IRC, "6038", "disclosure", None),
        ("Streamlined filing compliance procedures", IRC, None, "procedure", None),
    ]),
    ("us-retire", "US", "Retirement accounts", [
        ("Traditional IRA", IRC, "408", "definition", None),
        ("Roth IRA", IRC, "408A", "definition", None),
        ("Roth conversions", IRC, "408A(d)(3)", "procedure", None),
        ("401(k) plans", IRC, "401(k)", "definition", None),
        ("Early withdrawal additional tax", IRC, "72(t)", "penalty", None),
        ("Required minimum distributions", IRC, "401(a)(9)", "deadline", None),
        ("US retirement accounts for residents of India", IRC, None, "caveat", None),
    ]),
    ("us-file", "US", "Returns and deadlines", [
        ("Who must file", IRC, "6012", "procedure", None),
        ("Return due date", IRC, "6072", "deadline", None),
        ("Automatic extension for taxpayers abroad", IRC, None, "deadline", None),
        ("Form 1040-NR", IRC, None, "procedure", None),
        ("Dual-status statement", IRC, None, "procedure", None),
        ("Estimated tax payments", IRC, "6654", "deadline", None),
        ("Withholding for non-resident aliens", IRC, "1441", "withholding", None),
        ("Taxation of non-resident aliens", IRC, "871", "rate", None),
        ("ITIN for a spouse or dependants", IRC, None, "procedure", None),
        ("State residency after leaving", IRC, None, "caveat", None),
    ]),
    ("us-estate", "US", "Estate, gift and expatriation", [
        ("Estate tax exemption", IRC, "2010", "threshold", None),
        ("Estate tax for non-resident non-citizens", IRC, "2101", "rate", None),
        ("Gifts to a non-citizen spouse", IRC, "2523(i)", "threshold", None),
        ("Qualified domestic trust", IRC, "2056(d)", "procedure", None),
        ("Annual gift exclusion", IRC, "2503(b)", "threshold", None),
        ("Expatriation tax", IRC, "877A", "rate", None),
        ("Covered expatriate tests", IRC, "877(a)(2)", "test", None),
    ]),
    ("treaty", "IN-US", "India–US tax treaty", [
        ("Who is a resident under the treaty", DTAA, "Article 4", "definition", None),
        ("Tie-breaker for residents of both countries", DTAA, "Article 4(2)", "test", None),
        ("Saving clause for US citizens", DTAA, "Article 1(3)", "caveat", None),
        ("Dividends", DTAA, "Article 10", "rate", None),
        ("Interest", DTAA, "Article 11", "rate", None),
        ("Royalties and fees for included services", DTAA, "Article 12", "rate", None),
        ("Capital gains", DTAA, "Article 13", "definition", None),
        ("Employment income", DTAA, "Article 16", "definition", None),
        ("Pensions and social security", DTAA, "Article 20", "definition", None),
        ("Students and trainees", DTAA, "Article 21", "exemption", None),
        ("Relief from double taxation", DTAA, "Article 25", "relief", None),
        ("Mutual agreement procedure", DTAA, "Article 27", "procedure", None),
        ("Claiming treaty benefits on a US return (Form 8833)", IRC, "6114", "disclosure", None),
    ]),
]

CODE = {"IN": "IN", "US": "US", "IN-US": "TR"}


def build() -> dict:
    entries = []
    for key, country, area, items in AREAS:
        for n, (title, law, section, kind, rid) in enumerate(items, 1):
            entries.append({
                "id": rid or f"{CODE[country]}-{key.split('-', 1)[-1].upper()}-{n:02d}",
                "country": country, "area": area, "title": title, "law": law, "section": section, "kind": kind,
            })
    ids = [e["id"] for e in entries]
    assert len(ids) == len(set(ids)), "duplicate index id"
    return {
        "about": "Catalogue of the rules Kiyos needs, for the tax team to write and validate. Titles and references only: "
                 "no tax wording, logic or outcomes. Section references are a starting point to confirm.",
        "index": entries,
    }


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "knowledge" / "index.yaml"
    data = build()
    out.write_text("# Generated by scripts/build_rule_index.py. Edit the script, not this file.\n" + yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=120))
    print(f"{len(data['index'])} entries → {out}")
