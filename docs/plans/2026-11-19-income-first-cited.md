# Kiyos: income-first, every number cited

Status: revised 19 Nov 2026 after product-owner review. All four phases built and verified 19 Nov (phase 3 reworked as an income ring after review).

## Ground rules (product owner, 19 Nov)

- **No tax logic from Kiyos.** No tax calculator, no computed tax, no computed savings. Every tax
  figure and every way to save is entered by the expert and handed to the customer as the expert's.
  The LLM never generates a tax number or a tax conclusion.
- **Ways to save** are limited to options set in law (e.g. 54EC bonds, s.54), chosen and quantified by
  the expert. Kiyos only displays them with who added them and when.
- **The current UI is untouchable.** Keep our layout, palette and components. What we take from the
  second prototype (`devanand-keyvalue/kiyos-prototype`) is functionality and workflow, not its look.
- **Profile stays "Profile".**
- **Individual only for now.** Household comes later.

## What we take from the prototype

| Prototype functionality | In our dashboard |
|---|---|
| "Since your last visit": "Ananya corrected 1 answer" with the question and answer | Briefing at the top of Overview |
| Each fact shows its source; click to see it | Source icon on every figure, opening a side sheet |
| Earned-income chart: cumulative this year, per country | Same idea, split by income source (salary, RSU vesting, dividends, rent, interest) |
| Ways to save, marked not reviewed | Expert-entered statutory options only |
| Requests: everything waiting on you or the expert | Already partly in Needs you; a Requests view if you want one later |
| Kiyos proposes a change, you confirm | Already in Profile (proposal flow) |

## Where the platform stands today

| Need | Today | Gap |
|---|---|---|
| Citations | `fact.source` is a name only | No page, excerpt or message link |
| Extraction | Fields have label, value, confidence (`api/samples.py`) | No page or excerpt per field |
| Residency days | Counted from trips, each trip has a source | Breakdown not exposed per number |
| Income | One annual amount per source | No dates, so no "earned over the year" |
| Tax estimates | `tax_estimate:*` facts (seeded) | Need to be expert-entered, with who and when |
| Expert corrections | Tickets keep `draft_answer` and `resolution` | Not surfaced as "what changed" |
| Ways to save | None | Expert entry and display |

## Design (inside the existing UI)

### 1. Sources on every figure
- A small source icon to the right of a value. Click opens the existing side sheet with:
  - **Document:** title, page, the extracted line with the value highlighted, status
    (being checked / reviewed by Sidhant on date), "Open document".
  - **WhatsApp or chat:** the message as sent, date and time, link to the conversation.
  - **Counted from records** (e.g. 212 days in India): the trips that make it up, each with its own
    source icon (passport page). Counting, never tax logic.
  - **Expert:** who entered or confirmed it, and when.
- Backend: one additive, nullable `evidence` JSON column on `fact` and `stay`; `source` stays.
  Extraction fields gain `page` and `excerpt`; propagation writes evidence; chat-derived facts keep
  the message id. Backfill from documents where the fields match; otherwise the sheet says only the
  source name is known.
- Extraction stays simulated for now; this format is what real OCR fills later.

### 2. Since your last visit (Overview)
- Answers the expert corrected (draft differs from resolution) or confirmed, documents reviewed,
  new expert entries (estimate, way to save), new requests. Each line opens what it is about.

### 3. Income earned this year (Overview)
- Per country, own currency: cumulative earned this year, split by source (salary, RSU vesting,
  dividends, rent, interest), each from dated document entries (payslips, vesting confirmations,
  dividend statements). Only what documents show; no projection unless the expert enters one.
- Each source line has its source icon.
- Built with our existing chart components and palette.

### 4. Tax this year, from the expert (Overview, Tax position)
- Estimated tax, paid, left, next payment: shown only when the expert has entered them, labelled
  "From Sidhant, 18 Nov", with the source icon opening the expert entry. Otherwise "Sidhant adds this
  once your income documents are reviewed".
- Expert side: a form on the case page to enter or update these.

### 5. Ways to save, from the expert (Overview)
- The expert picks from a fixed list of statutory options (54EC bonds, s.54 reinvestment, Form 10-EE,
  regime choice, timing of a sale within the RNOR window, foreign tax credit), writes why it applies,
  the amount and the deadline. The customer sees it with "Ask Sidhant" to discuss.
- Kiyos never suggests or sizes an option itself.

### 6. Profile
- Stays Profile, same look. Rows gain source icons; assets stay as they are, with the income each
  produces shown alongside.

## Phases (each ends with type-check, lint, tests and browser checks on Kavita Reddy, Arjun Rao,
Arjun Mehta and a free customer; the next starts only when the previous one is verified)

| # | Phase | Done when |
|---|---|---|
| 1 | Sources: evidence column, extraction page and excerpt, propagation, source icon + sheet on residency days, income, holdings, Profile | Click "212 days" → trips → passport page with the stamp highlighted |
| 2 | Since your last visit | A corrected answer shows with question, Kiyos's draft and the expert's answer |
| 3 | Income earned this year, split by source | Chart and list per country match the documents, each line cited |
| 4 | Expert-entered tax and ways to save: expert form + customer display | Nothing tax-related shows unless the expert entered it, with who and when |

## Not in scope
Any tax calculation, household, real OCR, currency conversion, visual redesign.
