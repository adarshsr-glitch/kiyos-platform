# IN-RES-RNOR-9OF10 — RNOR via 9-of-10 preceding years

## What the rule says

An individual who is resident in India for the current tax year is classified as **Resident but Not Ordinarily Resident (RNOR)** — rather than Resident and Ordinarily Resident (ROR) — if they were a non-resident in at least **9 of the 10 previous years** immediately preceding the current year.

## Why the rule exists

RNOR status is India's "transition cushion" for people returning to India after a long period abroad. During RNOR years:

- Indian-source income is fully taxable as for any resident.
- Foreign-source income is **not taxable in India** unless derived from a business controlled or profession set up in India.
- Foreign assets do not trigger Schedule FA disclosure.

The 9-of-10 limb exists so that a long-time NRI returning to India gets at least one year — often two or three in combination with limb (b) — before all their global income and assets become visible to Indian tax.

## How the engine uses it

- Input: ten prior-year statuses, indexed PY-1 through PY-10.
- Count the number of NR entries.
- If ≥ 9, this limb is satisfied; the individual qualifies as RNOR.
- If < 9, this limb fails. Check the sister rule `IN-RES-RNOR-729DAYS` (limb b).

## When to cite this to a user

Any returning NRI's first assessment. The rule's output drives whether foreign salary, foreign dividends, and foreign capital gains are taxable in India for the current year, and whether Schedule FA filing is required.

## Interaction with the DTAA

RNOR classification is a domestic-law determination. It does not depend on treaty tie-breakers. However, for an individual who is simultaneously treaty-resident in the US under Article 4(1) of the India–US DTAA, the tie-breaker rules in Article 4(2) may override the domestic status for treaty purposes. See the DTAA rule set.
