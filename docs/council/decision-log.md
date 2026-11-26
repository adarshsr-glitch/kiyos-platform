# Council decision log

Read before every review. Change a status only with a reason and the review it came from.
Statuses:
- **Awaiting approval:** the council agreed; the user or founders have not approved it.
- **Approved:** cleared to build.
- **Done:** built and verified in a follow-up review.
- **Rejected / Deferred:** with the reason.

## Confirmed product decisions (from PRD v1 §14 — not for re-debate)

| ID | Decision | Source |
|---|---|---|
| C-01 | Free generic Q&A is capped at 3 questions in total. Personal questions pivot to a paid offering from the first question. The assessment doesn't count toward the cap. | PRD, 10 Nov |
| C-02 | Two paid offerings: Advisory ₹29,500 / ₹35,400 couple; Full service ₹47,200 / ₹59,000 couple. Provisional, incl. 18% GST. | PRD §10, 6 Nov |
| C-03 | The bot uses only Kiyos's approved, versioned rules. No open web, no general model knowledge for tax answers. | PRD §8, 6 Nov |
| C-04 | Paid expert response within 1 business day (2 in peak). Business days run 9–6 IST, Mon–Fri, excluding Indian public holidays. | PRD, 6 & 10 Nov |
| C-05 | The lead expert approves assessments and checklists. India and US reviewers sign off on personal advice and filings. | PRD, 6 Nov |
| C-06 | WhatsApp is one-to-one only at launch, on a new dedicated number. Admins see full bot history. | PRD, 10 Nov |
| C-07 | The free assessment is based on the customer's answers plus approved rules. Each row shows the input behind it. | PRD, 10 Nov |
| C-08 | No standalone paid assessment. Event packs are P1. Scenario modelling is P2. | PRD §7, §10 |

## Carried forward (built before the council, 11–12 Nov)

These are in `docs/PRD-ALIGNMENT.md` and the 12 Nov overhaul:
- need-first intake and risk map;
- the 3-question cap;
- plan choice and scope recap;
- the mocked payment, NDA and consent;
- the paid overview;
- per-item document requests;
- proposed profile changes;
- journey stages in the expert workspace.

They were not reviewed by the council before being built. Review 01 accepted them as the baseline.

## Recommendations

| ID | Recommendation | Priority | Status | From |
|---|---|---|---|---|
| R-01 | `explainer` knowledge kind + ~12 approved returnee explainers; free Q&A answers only from active ones | Critical | Awaiting approval | Review 01 |
| R-01a | "Not covered yet" replies don't count toward the free cap | High | Awaiting approval | Review 01 |
| R-02 | US status (self and spouse) in intake; scan and band respect it | Critical | Awaiting approval (wording: Q-03) | Review 01 |
| R-03 | Personal gate: specificity signals, stored reason, labelled set (0 missed-personal), optional shadow model | High | Awaiting approval | Review 01 |
| R-04 | Scan rows state workstream + answer, no conclusions; neutral chips | High | Awaiting approval | Review 01 |
| R-04a | Scan YAML stays demo-only until Sidhant approves | High | Awaiting approval | Review 01 |
| R-05 | Computed confidence (green/amber/red), not model self-score | High | Awaiting approval | Review 01 |
| R-06 | Per-jurisdiction reviewer name, qualification and date, or no "reviewed" label | High | Awaiting approval | Review 01 |
| R-07 | Business-day IST SLA clock; "SLA at risk" replaces "AI calls · 7d" | Medium | Awaiting approval | Review 01 |
| R-08 | Security baseline (OTP, case-scoped authz, expert login, encrypted files, access log) | Critical if live cohort | Blocked on Q-01 | Review 01 |
| R-09 | Start Meta verification, number and templates now; adapter after R-01 to R-03 | High | Awaiting approval | Review 01 |
| R-10 | Funnel events + counts on expert home | Medium | Awaiting approval | Review 01 |
| R-11 | Journey API tests, before R-02 to R-05 | High | Awaiting approval | Review 01 |

## Rejected

| ID | Idea | Why | From |
|---|---|---|---|
| X-02 | Expand expert-side scenario compare and charts this cycle | Scenario modelling is P2 (C-08). No expert usage evidence yet. | Review 01 |
| X-03 | Replace the regex gate with a pure model classifier | The gate must be explainable and auditable. The model may run as a shadow only (R-03). | Review 01 |
| X-04 | Further polish of the simulated WhatsApp phone | It's a demo artefact. Effort goes to the real channel (R-09). | Review 01 |
| X-05 | Split `api/main.py` now | No tests yet and no forcing need. Revisit after R-11. | Review 01 |

## Deferred

| ID | Item | Until | From |
|---|---|---|---|
| D-01 | Real payments (Razorpay/UPI) | Hena settles rails and GST for US payers, and Q-01 = live cohort | Review 01 |
| D-02 | Email fallback for the pricing matrix | Milestone 2 | Review 01 |
| D-03 | NDA e-signature, household invitations, quarterly-call scheduling | Milestone 3 cohort | Review 01 |
| D-04 | Reconciliation pack, pre-file approval | P1 | Review 01 |

## Open questions

| ID | Question | Owner | Status |
|---|---|---|---|
| Q-01 | Next milestone: usability test on seeded data, or live narrow cohort? | Founders | Open |
| Q-02 | Approval capacity and timeline for the scan YAML and explainers | Founders / Sidhant | Open |
| Q-03 | US-status options, wording and effect on scan rows | Sidhant | Open |
| Q-04 | Does US citizen or green-card status move the price band? | Founders / Tax | Open |
| Q-05 | Model region and retention settings before real facts enter prompts | Engineering / Hena | Open |
| Q-06 | Indian public holiday list for the SLA clock | Sidhant | Open |
| Q-07 | Fictional "Vikram Desai" vs Sidhant as the demo lead expert | Founders | Open |

## Stakeholder meeting, 13 Nov 2026 — direction signals (not yet confirmed)

Source: the user's written analysis of the meeting. The council has not seen the transcript itself.
Treat these as proposals until the Phase One scope document confirms them.

| ID | Signal | Effect on this log |
|---|---|---|
| S-01 | Phase One is a WhatsApp-led advisory POC with a light expert dashboard. Target is about one month; estimates are pending. | The real channel moves from R-09 "after R-01 to R-03" to the centre of Phase One. Paid customer workspace work is parked. |
| S-02 | Filing is not in Phase One. | Consistent with Milestone 3 sequencing. No change. |
| S-03 | Expert takeover inside WhatsApp, with auto-return to AI after 5–10 min of inactivity (not final). | Manual takeover and handback already exist in code. A timeout and expert notes are new. Needs a state machine (P1-Q2). |
| S-04 | Personal-question detection via an agent prompt; personal questions are **flagged to an expert**. | Reopens X-03. **Conflicts with PRD §5:** before payment, personal questions pivot to a paid offering and no expert is assigned (P1-Q1). |
| S-05 | Reuse the client's Excel workbook as the tax-rules engine. | May replace YAML rules for the assessment (R-01 rules side). It must still meet C-03: approved and versioned. Explainers are still needed. |
| S-06 | 12–15 progressive onboarding questions, then a basic report. | Today's intake has 8. Supports R-02 (US status). |
| S-07 | WhatsApp-number identity and a 10–15 min magic link for uploads. | Narrows R-08 to one auth method plus a secure link. |
| S-08 | Document upload is conditional; extraction is unproven. | Upload only, no extraction dependency. |

### Open questions from the meeting

| ID | Question | Owner |
|---|---|---|
| P1-Q1 | In Phase One, are free users' personal questions handed to an expert, or pivoted to a paid offering as the PRD requires? If Phase One is paid-only, how does a customer pay? | Founders |
| P1-Q2 | Takeover rules. While an expert has control, does the AI read but stay silent? What does a timeout do: resume the AI, or only send a holding message and alert the expert? | Founders / Tax |
| P1-Q3 | One sample Excel input, its output and the expected result. Where does the workbook run today? | Client |
| P1-Q4 | Who owns Meta business verification, the number and templates, and by when? What is the demo fallback if this slips? | Client |
| P1-Q5 | Definition of done for "one month": a demo POC, an internally tested product, or ready for real customers? Supersedes Q-01. | Founders |

## Customer dashboard (Review 02, 16 Nov 2026)

The strategy is approved; each item still needs build approval. Scope is the customer side only.
Full rationale is in the review.

**Principles adopted:**
- Task-first and mobile-first.
- Actions complete where they appear.
- Every piece of information has one home:
  - Home: summaries and tasks.
  - Tax position: outputs.
  - Your details: inputs.
  - Documents: requests and the vault.
- Customers see review state, never model confidence.

| ID | Recommendation | Pri | Status |
|---|---|---|---|
| CD-01 | Per-jurisdiction "Reviewed by…" or "Not yet reviewed"; only true security copy (supersedes the UI half of R-06) | P0 | Built 16 Nov; awaiting follow-up review |
| CD-02 | Shared task sheet: upload and confirm from Home and deep links | P0 | Built 16 Nov; awaiting follow-up review |
| CD-03 | Home order: Needs you → Your position → With Kiyos → deadlines; full "why" | P0 | Built 16 Nov; awaiting follow-up review |
| CD-04 | Deadlines = filing and statutory only, never capped out | P0 | Built 16 Nov; awaiting follow-up review |
| CD-05 | One FY/AY convention | P0 | Blocked on OQ-2 |
| CD-06 | Tax-relevant profile edits become proposals | P0 | Blocked on OQ-5 |
| CD-07 | Remove the Chat tab; add a WhatsApp action | P0 | Built 16 Nov; awaiting follow-up review |
| CD-08 | Position summary on Home; full country panels on Tax position | P1 | Awaiting approval |
| CD-09 | One status vocabulary; no confidence chips for customers | P1 | Awaiting approval |
| CD-10 | Residency history → Tax position; Profile → "Your details" | P1 | Awaiting approval |
| CD-11 | Plan and scope in the avatar menu | P1 | Awaiting approval |
| CD-12 | Top nav ≥768px; two-column ≥1024px | P1 | Awaiting approval |
| CD-13 | Portal `loading.tsx` / `error.tsx` + skeletons | P1 | Folded into UX-05 (Review 05) |
| CD-14 | Routes `/home`, `/tax-position`, `/details`, `/plan` + redirects | P1 | Folded into UX-13 (Review 05) |
| CD-15 | "With Kiyos": open items only; overdue copy after R-07 | P1 | Awaiting approval |
| CD-16 | Compact expert chip + team sheet | P1 | Awaiting approval |
| CD-17 | Status/Button/Sheet/Skeleton on `ui/*`; tokens | P2 | Folded into UX-16 (Review 05) |
| CD-18 | Serif for titles only; text ≥12px | P2 | Folded into UX-14 (Review 05) |
| CD-19 | Empty states and accessibility pass | P2 | Folded into UX-02/03/10/16 (Review 05) |
| CD-20 | Document-reminder timing setting | P2 | Blocked on OQ-4 |
| CD-21 | Notice banner on Home | P3 | Deferred (notice module) |
| CD-22 | "Since your last visit" digest | P3 | Deferred (needs last-visit store) |
| CD-23 | Conversation history view | P3 | Deferred (real channel) |
| CD-24 | Filing timeline | P3 | Deferred (filing workflow) |

**Rejected in Review 02:**
- A unified To-do tab replacing Documents. Documents is also the evidence vault.
- A horizontal desktop timeline. Too few real milestones.
- Charts on Home.
- Confidence chips for customers.
- Hiding the expert on mobile.
- A first-visit guided tour.

| ID | Open question | Owner | Status |
|---|---|---|---|
| OQ-1 | Phase One ships the P0 dashboard items only (deep-link landing pages)? | Founders | Open |
| OQ-2 | Arjun's RNOR year: FY 2026-27 or AY 2026-27? Display convention? | Sidhant | Open |
| OQ-3 | Plan names and prices: production $99/$249 vs PRD ₹29,500/₹47,200 | Founders | Open |
| OQ-4 | Where customers set document-reminder timing | Founders | Open |
| OQ-5 | Which facts are tax-relevant (edit = proposal) | Sidhant | Open |
| OQ-6 | Reviewer qualifications shown; real vs demo names | Founders | Open |
| OQ-7 | Unverified claims on production `/check` and the landing page | Founders / Hena | Open |

## Journey prototype (Review 03, 17 Nov 2026)

The prototype is restructured into five scripted journeys, chosen from a landing page at `/`. Approved by the product owner on 17 Nov and built the same day.

| ID | Decision | Status |
|---|---|---|
| JX-01 | ~~Journeys run on browser-only fixtures~~ Superseded by JX-10 | Superseded 17 Nov |
| JX-02 | `/` is the journey landing page; expert workspace moved to `/expert`; full app reachable only from its footer | Built 17 Nov |
| JX-03 | No customer/expert toggle or persona switcher inside a journey; one person, one context per journey | Built 17 Nov |
| JX-04 | Personas follow the brief: Arjun = new free user, Preeti = paid customer with history (journey data only; backend seeds unchanged) | Built 17 Nov |
| JX-05 | Money shown as ranges the customer gives, labelled "You told us"; never totalled or converted; ranges only flag possible thresholds ("may apply") | Built 17 Nov |
| JX-06 | Automated output is labelled "Indicative, not reviewed" everywhere until an expert signs off | Built 17 Nov |
| JX-07 | Magic-link sign-in shown with cautious copy: single-use, short-lived, production adds device/session checks | Built 17 Nov |
| JX-08 | Expert workspace is a separate product; new expert actions (request documents, notes, case status, discrepancy review) exist in journeys only | Built 17 Nov (journeys only) |
| JX-09 | ~~Council panel at `/council`~~ Removed: the council is internal only, never in any UI | Removed 17 Nov |
| JX-10 | Journeys run the real product: backend persona reset (`POST /demo/journeys/{key}/reset`), real portal and expert pages, live agent; a guide bar is the only prototype layer | Built 17 Nov |
| JX-11 | Product integrity: facts are entered or imported, outcomes are calculated by the rules engine, no cosmetic controls, simulations kept separate | Adopted 17 Nov |
| JX-12 | Residency Clock: per-year India/US status calculated from recorded stays and dated facts, read-only, each year traceable to rules, inputs and sources | Built 17 Nov |
| JX-13 | Residency rules IN-RES-182, IN-RES-60-365, IN-RES-RNOR-729DAYS, US-RES-GREEN-CARD, US-RES-SPT added as `pending_validation`; agent answers use `active` rules only | Built 17 Nov; needs Sidhant |
| JX-14 | Proactive agent message (recalculation on a proposed change) and document reading for the 1099-B are scripted for the persona; reading is labelled simulated | Built 17 Nov (prototype) |
| JX-15 | Expert case brief + real actions: document requests, notes, clarifications, review status; sign-off blocked by API while a clarification is open | Built 17 Nov |
| JX-16 | Prototype document reading: every upload opens an in-app picker of synthetic documents for that customer; extraction is simulated, shown field by field with confidence, applied to the case (amounts, passport stays) and checked against what the customer said | Built 17 Nov (prototype) |
| JX-17 | Visual expert workspace: KPI strip, case timeline Gantt, money by country (documents), evidence matrix on the case Brief; portfolio Gantt, document pipeline, residency mix, documented money on Today | Built 17 Nov |
| JX-Q1 | Build JX-08's expert actions into the real app? When? | Open (Founders) |
| JX-Q2 | Validate every obligation, threshold and band edge in the demo personas before any external demo | Open (Sidhant) |

## Design and UX audit (Review 05, 25 Nov 2026)

This review folds in CD-13 (portal loading and error screens), CD-14 (routes), CD-17 (primitives and tokens), CD-18 (type at least 12px) and CD-19 (empty states and accessibility). Those are now tracked here.

| ID | Recommendation | Pri | Status |
|---|---|---|---|
| UX-01 | WhatsApp thread reachable below 1280px (a "Thread" panel; "Open thread" at every width) | P0 | Built 25 Nov |
| UX-02 | Visible keyboard focus on both sides (full-strength ring, beats `outline-none`) | P0 | Built 25 Nov |
| UX-03 | `SideSheet` on Radix Dialog: focus trap, accessible name, the page's fonts | P0 | Built 25 Nov |
| UX-04 | Cases page: honest copy and count; whole row opens the case | P0 | Built 25 Nov |
| UX-05 | Error recovery (Agent quality, withdrawing a way to save); portal loading and error screens (was CD-13) | P0 | Built 25 Nov |
| UX-06 | Expert phone bar: the side switch is always visible | P0 | Built 25 Nov |
| UX-07 | Case tabs: 8 on one row, a "Client file" tab, tab kept in the URL | P1 | Built 25 Nov (tab named "Profile", per UQ-3) |
| UX-08 | One page-header pattern on both sides | P1 | Built 25 Nov (shared `PageHeader` / `PageBar`) |
| UX-09 | Expert Home: counts merged into the queue; rows open filtered Cases | P1 | Built 25 Nov (adds `open_tickets_count`, `awaiting_signoff_count` to `GET /cases`, additive) |
| UX-10 | A browser title per page (WCAG 2.4.2) | P1 | Built 25 Nov |
| UX-11 | Messages on phones: tab bar and side padding | P1 | Built 25 Nov |
| UX-12 | One name for the expert role. Fallback fixed ("Kiyos team", never "Unassigned's") | P1 | Built 25 Nov ("Expert" everywhere, per UQ-1) |
| UX-13 | Portal URLs match their labels, with redirects (was CD-14) | P1 | Built 25 Nov (old addresses redirect, query kept) |
| UX-14 | 7-step type scale; nothing under 12px (was CD-18) | P2 | Awaiting approval |
| UX-15 | One status and residency colour map; semantic status tokens | P2 | Awaiting approval |
| UX-16 | Primitives: Button, Card, SectionHeader, StatusPill, EmptyState; shared helpers (was CD-17) | P2 | Awaiting approval |
| UX-17 | Remove dead components (tracked only; ask about untracked) | P2 | Awaiting approval |
| UX-18 | Map the sidebar colour tokens in Tailwind | P2 | Awaiting approval |
| UX-19 | Cases table at 1024px: columns, wrapping, repeated names | P3 | Awaiting approval |
| UX-20 | One date locale; skip link; loading skeleton width | P3 | Awaiting approval |
| UX-21 | One-panel rule on the customer side: every figure, row and action opens the same right-hand panel (bottom sheet on phones); no pop-overs; only links (→) change page; nothing is sent on one click; nothing important is hover-only | P0 | Built 25 Nov (after the product owner found figures opening up, down or as a document at random) |
| UX-22 | Customer Overview as three short sections (To do, Where you stand, From the expert), one screen at 1440px; income split by source moves into the panel and Tax position (supersedes the 19 Nov income-first layout on the Overview) | P1 | Built 25 Nov |
| UX-23 | One customer workspace, not six pages: each page owns one job (Overview = hub, Tax position = how much and why, Year = when, Documents, Messages, Profile); the Overview previews every page (status tiles, to-do and expert, income donuts, coming up); shared blocks (`portal/blocks.tsx`: section head, panel row, stat tile, income donut) on every page; the one-panel rule extended to Year (month rows), Documents (document opens in the same panel), Messages (suggestions fill the box, never send) and Profile (standard panel width); Year no longer repeats Tax position's country cards | P0 | Built 25 Nov (supersedes the UX-22 layout; donut charts restored) |
| UX-24 | Use the screen: customer pages fill a 1480px area (no fixed 1000-1120px column in a wide window); the Overview on a three-column grid (to do and expert; money and coming up) | P1 | Built 25 Nov |
| UX-25 | One home per fact, enforced: income lives on the Overview only; Tax position is tax only (one card per country: residency, the expert's figure with its source, the return), with no income donuts and no "Money behind the position" tile | P1 | Built 25 Nov |
| UX-26 | Year at a glance timeline redrawn to answer one question in words: where you lived, India status, US status (split at the move), the dates due; labels on the bars instead of a colour legend; one colour meaning "today"; every part opens the panel with how it was worked out. The expert's case timeline is unchanged | P1 | Built 25 Nov |
| UX-27 | Documents built to grow: one progress bar per return (share ready) with counts in words instead of a segment per document; search over 8 documents; Accepted folds after 5; anything needing the customer always shown in full | P1 | Built 25 Nov |

| ID | Open question | Owner | Status |
|---|---|---|---|
| UQ-1 | One name for the expert role: "Case captain" or "Your expert"? | Product owner | Answered 25 Nov: "Expert" |
| UQ-2 | Rename portal URLs (`/portal/profile`, `/portal/tax-position`…) with redirects? | Product owner | Answered 25 Nov: rename, with redirects |
| UQ-3 | Case-tab grouping: is "Client file" the right name? | Product owner | Answered 25 Nov: "Profile" |

## Expert workspace (Review 06, 26 Nov 2026)

Root cause: the expert side shows the agent's work (draft answers, documents read, mismatches, sign-off readiness) as identical raw rows. New model: Kiyos prepares, the expert approves. Rationale in the review.

| ID | Recommendation | Pri | Status |
|---|---|---|---|
| EX-01 | Organise the expert side around the daily loop: brief → prepared → overdue → coming weeks → book | P0 | Built 26 Nov (Home and Triage) |
| EX-02 | Home hero: brand surface, a brief composed from records (each line linked), overdue · ready to approve · due this week, reply-time status (C-04), "cleared today", one primary action "Start triage" | P0 | Built 26 Nov |
| EX-03 | "Prepared by Kiyos" cards by kind (draft answer, document read, mismatch, ready to sign off), capped at 6. Questions can be approved and sent only with the full draft and its cited rule on screen; documents and sign-offs open in triage | P0 | Built 26 Nov |
| EX-04 | Workload heatmap: 4 weeks × 7 days, a count per cell, an overdue cell, filing dates on their week; a click filters Work (replaces the dot calendar) | P0 | Built 26 Nov |
| EX-05 | Filing runway: per coming filing date, customers by stage with days remaining | P1 | Built 26 Nov |
| EX-06 | Work becomes Triage: list and item side by side, rendered by kind, moves on after each action, keyboard | P0 | Built 26 Nov |
| EX-07 | `GET /experts/desk` aggregate (queue, counts, heatmap, runway); one call per page | P0 | Built 26 Nov |
| EX-08 | Expert visual language as tokens: hero surface, display numerals, tinted icon tiles by kind, card variants, spacing and radius scale, motion | P1 | Partly built 26 Nov (Home and Triage use it; not yet tokens) |
| EX-09 | Cases: pipeline strip and saved views | P2 | Built 26 Nov |
| EX-10 | Case page "Up next" uses the triage renderers | P2 | Built 26 Nov (Up next items open in Triage, filtered to the case) |
| EX-11 | Rules as a library for people: in use / waiting for validation / tests / cited counts; each rule shows the law it quotes, what Kiyos checks in words, its tests run on load, and where it's cited; opens in place; YAML folded (`GET /rules`, read-only) | P2 | Built 26 Nov (asked for by the product owner) |

**Rejected in Review 06:**
- A customer board on Home.
- Dot calendars and day-column week boards.
- Risk scatter, funnels and money charts on Home.
- One-click document accept or sign-off from Home.
- A model-written brief.
- Time estimates per item.

**Superseded:** the three Home builds of 26 Nov and UX-09. Removed from the code when EX-02/03 landed.

| ID | Open question | Owner | Status |
|---|---|---|---|
| EQ-1 | Does an approved answer go out at once, or wait for the 9–6 IST window? | Founders | Open |
| EQ-2 | Team view for a lead expert? | Founders | Open |
| EQ-3 | Brief "since yesterday" or "since your last visit" (needs a per-expert visit store)? | Product owner | Open |
| EQ-4 | Can a draft citing a pending-validation rule be approved as written? | Sidhant | Open |

## Review history

| # | Date | Area | Minutes |
|---|---|---|---|
| 01 | 12 Nov 2026 | MVP readiness baseline | [reviews/2026-11-12-01-mvp-readiness.md](reviews/2026-11-12-01-mvp-readiness.md) |
| 02 | 16 Nov 2026 | Customer dashboard | [reviews/2026-11-16-02-customer-dashboard.md](reviews/2026-11-16-02-customer-dashboard.md) |
| 03 | 17 Nov 2026 | Journey prototype restructure | [reviews/2026-11-17-03-journey-prototype.md](reviews/2026-11-17-03-journey-prototype.md) |
| 04 | 17 Nov 2026 | Agentic differentiation, real-product journeys | [reviews/2026-11-17-04-agentic-journeys.md](reviews/2026-11-17-04-agentic-journeys.md) |
| 05 | 25 Nov 2026 | Design and UX audit (8 specialists) | [reviews/2026-11-25-05-design-ux-audit.md](reviews/2026-11-25-05-design-ux-audit.md) |
| 06 | 26 Nov 2026 | Expert workspace | [reviews/2026-11-26-06-expert-workspace.md](reviews/2026-11-26-06-expert-workspace.md) |
