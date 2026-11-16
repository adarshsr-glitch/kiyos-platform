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
| CD-13 | Portal `loading.tsx` / `error.tsx` + skeletons | P1 | Awaiting approval |
| CD-14 | Routes `/home`, `/tax-position`, `/details`, `/plan` + redirects | P1 | Awaiting approval |
| CD-15 | "With Kiyos": open items only; overdue copy after R-07 | P1 | Awaiting approval |
| CD-16 | Compact expert chip + team sheet | P1 | Awaiting approval |
| CD-17 | Status/Button/Sheet/Skeleton on `ui/*`; tokens | P2 | Awaiting approval |
| CD-18 | Serif for titles only; text ≥12px | P2 | Awaiting approval |
| CD-19 | Empty states and accessibility pass | P2 | Awaiting approval |
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

## Review history

| # | Date | Area | Minutes |
|---|---|---|---|
| 01 | 12 Nov 2026 | MVP readiness baseline | [reviews/2026-11-12-01-mvp-readiness.md](reviews/2026-11-12-01-mvp-readiness.md) |
| 02 | 16 Nov 2026 | Customer dashboard | [reviews/2026-11-16-02-customer-dashboard.md](reviews/2026-11-16-02-customer-dashboard.md) |
