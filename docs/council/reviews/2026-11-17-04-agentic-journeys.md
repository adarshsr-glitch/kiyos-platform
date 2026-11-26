# Review 04: Agentic differentiation and journeys on the real product (17 Nov 2026)

Internal document. The council is never shown in any product or prototype UI.

## Why

The product owner's feedback on Review 03's prototype:
1. Data was presented as text where charts would read faster.
2. The journeys used copied screens instead of the real dashboard.
3. The council must not be public.
4. The prototype didn't show what makes Kiyos different.

**Principle adopted (JX-11):** interactive where the product is interactive, factual where information is factual, calculated where the system decides.

## Positioning

**An agent that works the case across both countries all year, and shows its work.** The differentiators:
- **One case, two tax systems:** the same facts evaluated under India and US rules side by side.
- **Residency as a clock:** status calculated year by year from the travel record.
- **The agent does the legwork:** it recalculates, reads documents, finds mismatches and drafts the expert's reply.
- **Every conclusion traceable:** each result links back to the fact, the rule, the result and the reviewer.

## Built

**Backend**

| Component | What it does |
|---|---|
| `api/services/residency.py` | Year-by-year India (FY) and US (calendar year) status, calculated from stays and dated facts |
| `api/journeys.py` | Residency, holdings, onboarding, brief, expert actions, persona reset, upload hook |
| `infra/personas.py` | Arjun, Preeti, Ananya and Rohan as resettable demo cases |

Supporting changes:
- **Engine:** new logic kinds `all_of`, `any_of`, `weighted_sum` and `flag`.
- **Rules:** 5 new residency rules, all `pending_validation`.
- **Schema:** new tables `Stay` and `CaseNote`; new fields `Case.demo_key` and `Case.review_status`.
- **Agent safeguard:** answers to customers use active rules only (`converse.py`).

**Frontend**

| Component | Where it's used |
|---|---|
| `components/charts/residency-clock.tsx` | Assessment, Tax position, Home, expert Brief |
| `components/charts/range-bars.tsx` | Free assessment |
| `components/charts/finding-grid.tsx` | Free assessment (replaces the text list) |
| `components/case-brief.tsx` | New first tab on `/expert/cases/[id]` |
| `/portal/onboarding` | Travel dates, trips and money ranges |
| `/portal/whatsapp` | The real thread with the real agent |
| `prototype/journeys.ts`, `prototype/journey-bar.tsx` | Five journeys on the real routes |

Removed:
- `/council`
- `/j/*`
- all copied journey screens and fixtures

## Validation (17 Nov 2026, in-app browser, 1440px plus spot checks at 375px)

| Journey | Result | What was checked |
|---|---|---|
| J1 Arjun | Pass | Live intake bot (8 answers, save, name) → OTP → risk map with grid → onboarding → saved result reporting 23 / 0 / 357 days and 6 rules → Residency Clock → year sheet showing the rules, inputs, legal section and pending flag → live agent answers "What is RNOR?" (1 free question used) → personal question routed to plans → plans page → finish |
| J2 Preeti | Pass | Proactive message calculated (291 → 264 days, still RNOR) → confirm change → Home clock uses 12 July, reviews marked as needing a recheck, recheck task created → 1099-B upload → agent reply places the gain in both countries and flags the mismatch → Tax position |
| J3 Ananya | Pass | Brief: residency calculated, 5 gaps, 4 suggested requests → request on WhatsApp → message in her thread |
| J4 Preeti (expert) | Pass at API and page level | Brief shows the 1099-B mismatch and a drafted reply; chat takeover is the existing feature |
| J5 Rohan | Pass | Discrepancy calculated (142 stated vs 211 from passport stays, which changes NR to RNOR) → note saved → question sent → status Awaiting customer → sign-off blocked in the UI and by the API (409) |

Checks:
- **Tests:** residency tests pass (7), and all rule test cases pass.
- **Types:** `tsc` clean.
- **Lint:** ESLint shows only 2 errors, both in code that predates this work.

## Fixed during validation

- The journey step counter skipped ahead after a redirect.
- The onboarding result link served a stale cached page.
- The agent cited a pending rule in a customer answer.
- A green-card holder was shown as dual-status after moving. They now stay resident until the card is given up.
- The internal 1099-B flag showed to the customer as "Your question". It's now a visible task, with the draft for the expert only.
- A deleted demo case gave a 500. It now shows a "reset" page.
- The phone layout of the clock is now a list.

## Open

- **Sidhant:** validate the 5 rules, the day-counting convention, and the green-card and dual-status logic.
- **Document reading** is simulated for Preeti's 1099-B only, and labelled as such.
- **Profile page:** the inline edit still overwrites tax facts directly (CD-06, blocked on OQ-5).
- **Pre-existing case:** ticket 1 on case 1 was resolved at 17:02 IST through the UI. This was not part of any journey run.

## Addendum (same day): documents and visual workspace

**Product owner's feedback:**
- The scripted wording was poor.
- An upload should never open Finder: the prototype must show document extraction end to end.
- The expert workspace was cards and text.

**Built (JX-16, JX-17):**
- **Synthetic documents and simulated extraction:** `api/samples.py`, plus the `/sample-documents` and `/document-readings` endpoints.
- **`components/document-reader.tsx`**, used in the task sheet and on the Documents page. The expert can also add a document from the case Brief.
- **New charts:**
  - `money-chart` (assets-only donut, bars and ranges)
  - `case-gantt`
  - `evidence-matrix`
  - `portfolio`, backed by the `/dashboard/portfolio` endpoint
- **Live intake bot wording tightened.**

**Validated in the in-app browser:**
- Preeti's 1099-B upload: picker → fields read with confidence → mismatch flagged → Home updates.
- Documents page reading view.
- Ananya's passport reveals an unreported 46-day trip, and her residency is recalculated.
- Rohan's and Ananya's briefs render the KPIs, timeline, money and evidence.
- Today page renders the portfolio charts.

**Environment note:** Cursor's agent started a second API server on 0.0.0.0:8000 alongside `make up`'s copy on 127.0.0.1:8000. Requests to different addresses can reach different processes.
