# Review 01 — MVP readiness baseline (12 Nov 2026)

**Scope.** The founders' brief named no area, so the first meeting is a baseline: can the current
build demonstrate the PRD wedge (WhatsApp → free scan → personal-question pivot → paid workspace →
expert)? Later reviews narrow from here.

**Inputs.** PRD v1 (6 Nov, decisions to 10 Nov), `docs/PRD-ALIGNMENT.md` (11 Nov), branch
`feature/prd-p0-workflows` (uncommitted overhaul included), live app on :3000/:8000, `data/kiyos.db`.

**No prior council minutes exist.** Earlier decisions are taken from the PRD register and the
11 Nov alignment audit only.

---

## Baseline — what is actually built

| Capability (PRD ref) | Status | Evidence |
|---|---|---|
| WhatsApp channel (§8) | **Mock/UI only** | No WhatsApp API, webhook or number. A web panel styled as WhatsApp (`whatsapp-phone.tsx`) posts to `/conversations/{id}/messages`. |
| Session window and templates (§8, M1) | **Not implemented** | — |
| Need-first intake with "Not sure" and consent (§7 P0) | **Functional** (in the simulated channel) | `api/services/intake.py` driven by `knowledge/assessment/initial-scan.yaml`; deterministic. |
| Initial risk map with input per row and price band (§5.2) | **Functional, but on unapproved rules** | `initial-scan.yaml` is `status: draft`. Rows, answers, confidence and band all render. |
| Intake facts collected | **Incomplete** | 8 steps: need, move timing, years abroad, 401(k)/IRA, equity, Indian MFs, India property, household. **No US status** (citizen / green card / visa). |
| Free generic Q&A (§7 P0) | **Incomplete — fails its release test beyond one topic** | Approved knowledge = **one rule** (`IN-RES-RNOR-9OF10`). The free path routes away any answer that cites no approved rule (`converse.py:153`). An earlier seed question on 401(k) had to be replaced because nothing could answer it. |
| Personal-question detection (§7 P0) | **Functional, crude** | `converse.py:81-95`: a pronoun regex (I/my/we/our/lower-case "us"). No record of why a question was classed as it was. No false-positive or missed-personal audit. |
| 3-question free cap; assessment not counted (10 Nov) | **Functional** | `FREE_GENERIC_LIMIT = 3`. Kavita (case 8) shows the counter. |
| Pivot and funnel instrumentation (§7 P0) | **Incomplete** | Only `plan.activated`, `plan.changed` and `workspace.signed_in` events. Classification lives on messages; there is no funnel view. |
| Plan choice and scope recap (§10) | **Functional** | `/plans`, `/activate`, `plan-checkout.tsx`. Prices from §10, marked provisional. No email fallback. |
| Payment, NDA, consent (§5.5) | **Mock/UI only** | Payment success/failure is simulated (Rahul, case 9, shows the retry banner). No e-signature. |
| Authentication (§9) | **Mock only** | The `kiyos-case` cookie holds a case ID. OTP accepts any 6 digits. **Expert workspace has no login.** |
| Paid overview: country status, filings, next steps, owner (§6) | **Functional** on seeded data | Arjun (case 1). |
| Per-item document requests with "why" (§8) | **Functional** | `/document-requests`. |
| Document storage (§9 baseline) | **Incomplete** | Plain files on local disk (`data/documents/case_N/`), SHA-256 dedupe. No encryption, no access log. |
| Profile change proposal + confirmation with history (§8) | **Functional** | `/profile-changes`. |
| Paid grounded Q&A (§8) | **Functional; violates the confidence policy** | Claude Opus 5.5 with case-snapshot tools (`ai_call` shows live calls). Routing uses the **model's self-reported confidence** against 0.7. PRD §8: confidence must *not* come from that. |
| Expert gate: tickets, takeover, handback (§7 P0) | **Functional** | 2 open tickets in the DB. |
| Expert response SLA (10 Nov: business days, 9–6 IST) | **Incomplete** | `TICKET_SLA = timedelta(hours=24)`, so the clock is wall time. |
| Separate India and US reviewer sign-off (§5.7, §9) | **Not implemented** | `Case.reviewers` holds display names only. Assessments have one `reviewed_by`. The customer UI shows "Reviewed and verified" whenever `reviewed_by` is set (`overview.tsx:331`). |
| Sensitive-content guard (§8) | **Functional for text** | SSN, PAN and Aadhaar regexes are stripped before the model sees them. No media path exists, because the channel is simulated. |
| AI audit (§9) | **Functional** | Every call is logged to `ai_call`. There is no advisor access log. |
| Reconciliation pack, pre-file approval (P1) | **Not implemented** | Out of MVP scope. |
| Tests | **Thin** | `engine/tests` (1 rule). No API or UI tests. |
| Local start-up | **Fixed today** | `make up`. Cause was a second dev server started by Cursor. |

**One-line baseline.** The *demo* of the full journey is coherent and works end to end on seeded
customers. The *wedge* is not yet real:
- the free bot can answer one topic;
- the scan runs on draft rules;
- the channel is simulated;
- nothing is authenticated.

---

## Stage 3 — Individual assessments

**Architect.** The bones are sound:
- One `Case` and `Conversation` state is shared by all three surfaces, as PRD §5 requires.
- Rules live in versioned YAML with test cases, which is the right shape for "tax logic lives in
  engines, not prompts".
- Every model call is logged.

The shortcuts are what would hurt a live cohort: no authentication or authorization anywhere,
plaintext uploads, and confidence taken from the model. `main.py` is 1,715 lines, which is
manageable for now. I would not split it until tests exist.
*Top 3:*
1. Computed confidence (green/amber/red) in place of the model's self-score.
2. API tests over the journey transitions before anything else changes.
3. A security baseline (auth, case-scoped authorization, encrypted files, access log) as a gate
   before real data.

**Design.** The paid overview is the strongest screen. It shows country status, the named expert,
next steps with due dates, and a reason for every ask. That is the "silence is a defect"
principle made visible.

Two problems:
- **The free risk map reads like a verdict.** "You may qualify as RNOR", "Your 401(k) needs a plan…",
  with a green "Likely" chip, is visually indistinguishable from reviewed advice.
- **The UI makes claims it can't back.** "Reviewed and verified" appears on a single
  `reviewed_by`. The expert home spends a top tile on "AI calls · 7d", which is useless to an
  expert. SLA risk is what they need at a glance.

*Top 3:*
1. Trust labels show who reviewed, per country, and when, or nothing.
2. Visually separate the free scan from reviewed output.
3. Replace "AI calls" with "SLA at risk".

**Tax.** Three issues:
- **The intake never asks US status.** For a returnee, whether they are a US citizen or green-card
  holder, or were on a visa, decides whether US filing ends after a dual-status year or continues
  indefinitely. It also decides whether Indian mutual funds raise PFIC questions and whether
  FBAR/FATCA keep applying. Today the scan infers obligations without it.
  *(General principle; exact wording and scan logic need Sidhant's validation.)*
- **The pronoun classifier lets fact-specific questions through as "generic".** Example:
  "Is a $30,000 401(k) withdrawal taxable in India for someone who returned in August?" has no
  pronoun, so it passes as generic. That is the exact half-answer the PRD forbids.
- **One approved rule means the free tier can't educate**, and none of the scan rules is approved.

*Top 3:*
1. Add US status (and spouse's) to the intake.
2. Harden the personal-question gate with specificity signals and a labelled test set.
3. Get the scan YAML and the core explainers approved before any real customer sees them.

**Strategy.** We have polished the part of the funnel *after* the customer pays, while the part
that earns the payment is hollow. Kiyos's answer to "why not ChatGPT" is approved rules, a named
expert and accountability. Today a free user asking about FBAR gets routed away, which is worse
than ChatGPT. The free bot must be good at the ~15 questions returnees actually ask, and
honest-but-specific on the scan.

Meanwhile, stop investing in expert-side scenario modelling and charts (P2 in the PRD) and in
the fake phone.
*Top 3:*
1. Approved education content for the top returnee questions.
2. Start Meta verification and the dedicated number now. It is calendar time, not engineering time.
3. Freeze new paid-side features until the free funnel converts in a usability test.

**PM.** Mapped to the PRD release sequence, we are partway into Milestone 1 (bot onboarding and
free assessment), with Milestone 3 screens built ahead of it. The PRD explicitly says not to
bundle the milestones.

Milestone 1 release tests currently failing:
- "What is RNOR?" passes, but no other generic topic does.
- No false-positive/missed-personal audit.
- No session window or templates.
- No funnel instrumentation.

*Top 3:*
1. Finish the Milestone 1 release tests before more Milestone 3 work.
2. Decide whether the next milestone is a usability demo or a live cohort, because that sets the
   security priority.
3. Instrument the funnel.

---

## Stage 4 — Discussion

**1. Free education content.**

**Strategy:** The free bot answers one topic. That's the wedge, and it's empty.

**Architect:** The engine requires every rule to have a `logic` block and ≥2 test cases
(`test_knowledge_rules.py`). That's right for calculations, but most education is explanatory:
what FBAR is, what Form 10-EE does. Forcing fake logic into explainers would be worse. I'd add a
second kind, `kind: explainer`: versioned, sourced, dated and `status`-gated, but with no
`evaluate`. The free path already retrieves by rule ID, so this is contained.

**Tax:** Fine, provided an explainer can't ship as `active` without a named approver and date. I
won't sign off on twenty topics in a week. Draft them; Sidhant approves in batches.

**Strategy:** Which twenty?

**PM:** Not twenty. Take the questions from Hena's call transcripts and the seeded journeys, and
cap the first batch at about 12. Acceptance: each top question gets an answer with jurisdiction,
source and date, and a question outside the set gets an honest "not covered" plus an offer.

**Design:** And the "not covered" reply must not burn one of the three free questions. Otherwise
we're charging the user for our gap.

**PM:** Agreed, and I'm logging that as a rule. *Resolved → R-01, R-01a.*

**2. The personal-question gate.**

**Tax:** The regex misses fact-specific questions with no pronoun.

**Architect:** An LLM classifier would catch more, but the code comment says the gate is
deterministic on purpose: it has to be explainable and auditable. I'd keep the regex and add
deterministic specificity signals: money amounts, specific dates, "someone who…/a person
who…/if a…" hypotheticals with concrete facts. Optionally run the model as a *shadow*
classifier that only logs disagreements, which gives us the PRD's missed-personal audit.

**Strategy:** Bias it toward "personal". A false positive costs us a slightly annoyed free user.
A false negative is unreviewed advice, and that is our whole liability story.

**Design:** A false positive on "What's RNOR? asking for my dad" feels like a paywall trick.

**Tax:** Then the pivot copy should say *why*: "That depends on your dad's dates; here's what RNOR
means in general…" No, wait, that's the half-answer problem. Better: the pivot answers nothing
personal, but offers to answer the general version.

**PM:** Acceptance: a labelled set of about 50 questions, written by Tax and approved by Sidhant,
with **zero** personal questions classed generic, and generic misclassification under 10%.
Every classification stores its reason. *Resolved → R-03. Pure LLM classifier rejected (X-03).*

**3. Free risk map wording.**

**Tax:** "You may qualify as RNOR" with a "Likely" chip is a personal position on a draft rule.

**Strategy:** Careful. PRD §2 says "specificity beats polish." A vague scan won't convert. People
pay because the scan clearly understood their situation.

**Tax:** Specific about the *workstream*, not the *conclusion*. "Your residency status for the
return year needs working out; RNOR is possible given '10+ years abroad'" is specific without
being a verdict.

**Design:** Agreed. And no more disclaimers. The header already says "A first scan, not a
personal tax opinion." Fix the verbs and drop the green chip colour, which reads as "approved".
Use neutral "likely / possible / unclear" chips.

**Strategy:** Fine, as long as each row still names their answer. That's the aha.

*Resolved → R-04.* The scan YAML stays draft-only until Sidhant approves it (R-04a). This is an
approval dependency, not engineering.

**4. US status in the intake.**

**Tax:** This is the biggest correctness gap. Without US status the scan can't tell "US filing
ends" from "US filing forever".

**PM:** Does it add a step? The PRD wants a five-minute assessment.

**Design:** One tap question with "Not sure". It replaces nothing; it's step 2 or 3.

**Strategy:** It also moves price. A US citizen returnee is almost certainly full service. That
helps the band be realistic.

**Architect:** Small change: one YAML step plus `ask_if`/row conditions. The seeded prospects in
`infra/journey.py` need re-seeding.

*Resolved → R-02.* Exact options and wording need Tax and Sidhant validation (Q-03).

**5. Confidence policy.**

**Architect:** Paid answers route on the model's own 0–1 score. PRD §8 says confidence comes from
evidence quality, tool determinism and fact completeness, not self-report. Proposal:
- **Green:** a deterministic tool answered, its rule is `active`, and every input is a verified fact.
- **Amber:** complete facts, but the question asks for a recommendation.
- **Red:** anything else, routed to a ticket.

**Strategy:** Does a customer see any of this?

**Architect:** Indirectly. More paid questions will become tickets until rules exist. Expect the
ticket queue to grow.

**Tax:** That's the correct failure mode.

**Strategy:** Then it's correct, but it's Milestone 3. Don't let it jump ahead of the free funnel.

**PM:** High priority, sequenced after R-01 to R-04. *Resolved → R-05.*

**6. Security and authentication.**

**Architect:** No login on the expert side and a guessable case-ID cookie. Before any real
customer, this is a hard gate.

**Strategy:** We don't have a real customer, and we don't know the funnel converts. Building
auth now is building for a launch we haven't earned.

**Architect:** If the next step is a usability test with seeded data, I agree. If it's the PRD's
"narrow cohort", real tax documents can't go into a plaintext folder.

**PM:** So it depends on a founder decision we don't have. **Not resolved.** Logged as Q-01.
R-08 is Critical *if* Q-01 = live cohort, otherwise deferred.

**7. The WhatsApp channel.**

**Strategy:** The thesis is WhatsApp-first, and we have a web imitation.

**Architect:** The conversation service is already channel-agnostic. Messages land in one table
via one endpoint. A WhatsApp Cloud API adapter means a webhook, the session-window tracker and a
template sender. That's a contained piece. The long pole is Meta business verification, the
dedicated number (10 Nov decision) and template approval.

**Design:** Once it's real, the fake phone in the workspace should become a plain conversation
history. Don't polish the phone.

**PM:** Start the non-engineering steps now (R-09). Build the adapter after R-01 to R-03, because
a real channel answering one topic is worse than a demo. *Polishing the simulated phone: rejected
(X-04).*

**8. Trust labels and the expert home.**

**Design:**
- "Reviewed and verified" overclaims. The PRD needs separate India and US sign-off, and we store
  one name.
- "AI calls · 7d" is a vanity tile.
- The ticket SLA is 24 wall-clock hours, while the decision says business days, 9–6 IST, Monday
  to Friday.

**Tax:** Strongly agree on the label. It's a verifiable-claims issue under PRD §2.

**Architect:** Both are small. The business-day clock needs the holiday list, which the PRD says
lives in §14. Until we have it, use weekends only and flag it.

**Strategy:** Fine, cheap, and the label one protects us. Do it.

*Resolved → R-06, R-07.*

**9. Things the council turned down.**

- **Strategy:** No real Razorpay until Hena settles rails and GST for US payers.
  **Architect** agrees: the mock already models failure and retry. *Deferred (D-01).*
- **Design** wanted a pass on the expert case page (scenario compare, charts).
  **Strategy:** Scenario modelling is P2 in the PRD, and no expert has used the page yet. Wait for
  usage evidence. *Rejected for this cycle (X-02).*
- **Architect** suggested splitting `main.py`.
  **PM:** Not until tests exist and something forces it. *Rejected for now (X-05).*

---

## Minutes

### A. Overall assessment

- **Current state.** A coherent, clickable end-to-end demo across all three surfaces on one
  shared case model, with real model calls on the paid path. Milestone 1 (bot and free scan) is
  partly built. Milestone 3 (paid workspace) is visually ahead of it.
- **Strengths.**
  - One case state shared across bot, workspace and expert.
  - Versioned rules with tests.
  - Every model call audited.
  - A paid overview that shows owner, status and why each item is asked.
  - Journey stages visible to experts.
- **Weaknesses.**
  - The free tier can educate on one topic.
  - Scan rules are unapproved.
  - The intake omits US status.
  - The personal gate is pronoun-only.
  - Paid routing trusts model self-confidence.
  - No authentication and plaintext files.
  - The channel is simulated.
- **Gap to the PRD.** The wedge (free scan → pivot → pay) is demonstrable but would not survive
  real questions. Several UI claims ("Reviewed and verified") exceed what the data supports.

### B. Key discussion points

Covered above (§1–9). Disagreements:
- **Wording vs. specificity on the scan:** resolved with workstream-specific, conclusion-free
  wording.
- **Security timing:** unresolved; depends on Q-01.
- **Classifier bias:** resolved toward "personal", with a test set.

### C. Agreed recommendations

| ID | What changes | Why | Impact | Technical implications | Priority |
|---|---|---|---|---|---|
| R-01 | Add an `explainer` knowledge kind (sourced, dated, status-gated, approver recorded). Draft ~12 explainers for top returnee questions. Free Q&A answers from `active` ones only. | Free Q&A fails its PRD release test beyond RNOR. | Free users get real value; core of "why not ChatGPT". | Engine loader + test rule for the new kind; `_generic_from_knowledge` retrieval; content work by Tax. | **Critical** |
| R-01a | An honest "not covered yet" reply does **not** count toward the 3 free questions. | Don't charge users for our coverage gap. | Fairness, trust. | Category value on message; `free_usage` excludes it. | High |
| R-02 | Add US status (self and spouse) to intake; scan rows and band respect it. | Decides whether US filing ends; drives PFIC/FBAR relevance and price. | Correct scan, realistic band. | YAML step + conditions; re-seed `infra/journey.py` prospects. | **Critical** |
| R-03 | Harden the personal gate: specificity signals (amounts, dates, concrete hypotheticals); store a reason per classification; ~50-question labelled set as a test; optional shadow model logging disagreements. | Pronoun regex lets fact-specific questions through. | Removes the main liability path in the free tier. | `classify_free_question`, message metadata, new test file. | High |
| R-04 | Scan rows state the *workstream* and the customer's answer, not a conclusion; neutral likely/possible/unclear chips. R-04a: the scan stays draft (demo-only) until Sidhant approves the YAML. | Free output reads as reviewed advice. | Keeps specificity, removes implied verdicts. | Copy in `initial-scan.yaml`; chip styles in the assessment page. | High |
| R-05 | Computed confidence: green/amber/red from tool determinism, rule status and fact verification; drop model self-score from routing. | PRD §8 explicitly. | Fewer unreviewed answers; more tickets (expected). | `converse.py` routing; ticket volume rises. | High |
| R-06 | Replace "Reviewed and verified" with "Reviewed by {name}, {qualification} · {date}" per jurisdiction, or nothing. Store India and US reviewer sign-off separately. | Trust claims must be verifiable (PRD §2, §9). | Credibility. | Assessment/topic schema fields; `overview.tsx`; `case-hero.tsx`. | High |
| R-07 | Ticket SLA on business days, 9–6 IST, Mon–Fri (holidays flagged as pending); expert home: "SLA at risk" replaces "AI calls · 7d". | 10 Nov decision; experts need risk, not usage. | Fewer missed responses. | `TICKET_SLA` → function; one stat tile. | Medium |
| R-08 | Security baseline: real OTP, server-side case-scoped authorization, expert login, encrypted file storage, advisor access log. | PRD §9 release baseline. | Allows real data. | Auth layer across API + web; storage change. | **Critical if Q-01 = live cohort**, else deferred |
| R-09 | Start Meta business verification, dedicated number and template submissions now; build the Cloud API adapter (webhook, session window, templates) after R-01 to R-03. | Milestone 1 needs the real channel; approval lead time. | Unblocks a real pilot. | Adapter on the existing conversation endpoint. | High (start now) |
| R-10 | Funnel events: `free.question` (category, reason), `pivot.shown`, `plans.viewed`, `plan.selected`, `payment.failed`, `activated`; counts on expert home. | PRD pivot instrumentation; the key conversion metric. | Know if the wedge works. | `CaseEvent` writes at existing call sites. | Medium |
| R-11 | API tests for journey transitions: intake → scan, free cap, pivot, sign-in, activate, payment failure. **Do first.** | R-02 to R-05 change these paths. | Regression safety. | New `api/tests/`; needs `pytest` installed. | High |

### D. Open questions

| ID | Question | For |
|---|---|---|
| Q-01 | Is the next milestone a usability test on seeded data, or a live narrow cohort with real documents? Sets R-08 priority. | Founders |
| Q-02 | When can Sidhant approve the scan YAML and the first ~12 explainers, and who else can approve? | Founders / Tax |
| Q-03 | Exact US-status options and wording, and how each changes scan rows and plan band. | Sidhant |
| Q-04 | Does a US citizen or green-card returnee change the indicative price band beyond the plan choice? | Founders / Tax |
| Q-05 | Model provider region and retention settings before real customer facts enter prompts (PRD §9). | Engineering / Hena |
| Q-06 | Indian public holiday list for the SLA clock (§14). | Sidhant |
| Q-07 | The prototype's lead expert is "Vikram Desai"; the PRD default is Sidhant. Keep a fictional name for demos? | Founders |

### E. Individual takeaways

- **Architect:**
  1. Tests before changing gates.
  2. Confidence must be computed, not self-reported.
  3. No real data until auth and encrypted storage exist.
- **Design:**
  1. Remove every claim the data can't back.
  2. Free output must look different from reviewed output.
  3. Show experts risk (SLA), not usage.
- **Tax:**
  1. US status is the missing fact that changes everything for returnees.
  2. The personal gate is the liability boundary; test it like one.
  3. Nothing tax-substantive reaches a real customer unapproved.
- **Strategy:**
  1. The free bot must beat ChatGPT on the 12 questions returnees ask.
  2. Stop adding paid-side features until the funnel converts.
  3. Start Meta approval now; it's calendar time.
- **PM:**
  1. Finish the Milestone 1 release tests before more Milestone 3 work.
  2. Every recommendation has an acceptance test.
  3. Q-01 decides the next sprint's shape.

### F. Product direction

Shift investment from the paid workspace to the front of the funnel. Over the next iteration the
free experience should become:
- **Approved:** scan and explainers signed off.
- **Correct:** asks US status, has a hardened gate.
- **Honest:** neutral wording, verifiable labels.
- **Measured:** funnel events.

Then connect the real WhatsApp channel. The paid workspace stays as built, with only the
trust-label and confidence fixes, until a usability test shows the funnel converts.

### G. Immediate action plan

| # | Task | Expected outcome | Owner | Depends on | Priority | Phase |
|---|---|---|---|---|---|---|
| 1 | R-11 journey API tests | Green suite covering 6 transitions | Engineering | pytest installed | High | MVP |
| 2 | R-06 trust labels + per-jurisdiction sign-off fields | No unverifiable "reviewed" claim | Engineering + Design | — | High | MVP |
| 3 | R-07 business-day SLA + "SLA at risk" tile | Correct clock; at-risk count on home | Engineering | Q-06 (holidays; weekends only until then) | Medium | MVP |
| 4 | R-04 scan wording and neutral chips | Workstream-specific, no verdicts | Tax (copy) + Design | — | High | MVP |
| 5 | R-02 US-status intake step | Scan and band respect US status | Engineering + Tax | Q-03 | Critical | MVP |
| 6 | R-01 explainer kind + 12 drafts; R-01a | Top questions answered with source and date | Engineering + Tax | Q-02 for go-live | Critical | MVP |
| 7 | R-03 gate hardening + labelled set | 0 missed-personal on the set | Engineering + Tax | #1 | High | MVP |
| 8 | R-10 funnel events | Conversion visible per stage | Engineering + PM | — | Medium | MVP |
| 9 | R-09 Meta verification, number, templates | Approved templates in hand | Founders / Ops | — | High | MVP (start now) |
| 10 | R-05 computed confidence | No routing on self-score | Engineering | #1 | High | MVP (Milestone 3) |
| 11 | R-08 security baseline | Real data safe | Engineering | Q-01 | Critical / deferred | Depends on Q-01 |

**Implementation sequencing.**
- **Batch A — small, within current scope (≈1–2 days):** #1, #2, #3, #4.
- **Batch B — moderate (≈3–5 days):** #5, #6 (engineering part), #7, #8.
- **Batch C — architectural:** #10, #11, and the WhatsApp adapter after #9.

**Regression risks.**
- **#5:** changes every scan and the seeded prospects. Re-seed and re-check Sanjay, Neha, Kavita
  and Rahul.
- **#7:** may re-class seeded free questions. Kavita's counter must still read 2 of 3.
- **#10:** raises ticket volume on Arjun's paid chat.
- **#2:** touches `overview.tsx` and `case-hero.tsx`, used by both portal and expert views.

### H. Decision and recommendation log

Recorded in [`../decision-log.md`](../decision-log.md).
