# Kiyos Engagement — PM Playbook

**You lead, Dave supports. Commercials: scope agreed, MSA pending.**

---

## Context

You're about to take lead-PM on your first project — Kiyos's cross-border tax product — at a moment when a lot is in flight and little is written down. The client's technical lead (Hina) has explicitly set a high bar for subject-matter depth. Their product engine lives in a Claude Code project with no Git, no hosted backend, no spec. Nikita wants a feature list with value and effort before engineering starts. Sharbel is sitting on MSA + commercials.

This plan is a personal operating manual for you, not a client deliverable. It answers three things you asked for: how to approach the build, what you ask from everyone around you, and what you personally deliver — framed so your value to the office is legible from day one.

---

## The engagement in one page

- **What we build** — a WhatsApp-first cross-border tax product for Indians returning from the US, with a secure workspace behind it and a named case captain per customer. The reasoning engine already exists on Kiyos's side; we are productising it, wrapping it in UX, operations and infrastructure, and scaling it.
- **Who uses it** — a returning-NRI customer, interacting mostly via WhatsApp, with a human (the case captain) silently in the loop; and the case captain themselves, working inside an advisor dashboard.
- **What success looks like at V1** — a Kiyos customer can discover, pay, onboard, upload documents, get an assessment, ask questions, and have the case captain sign off on everything, without KeyValue or Kiyos touching a laptop-run Claude Code skill. The 30-minute intro call is removed from the conversion funnel for 60–70% of users.
- **What this is for KeyValue** — a lead account in a new vertical (cross-border fintech services), a reference case study for the AI-services playbook, and a template for how we lead client engagements end-to-end with a first-time PM in the chair.

---

## Phased approach

### Phase 0 — Lock and load (this week, ~5 working days)

Close the loose ends before engineering starts. Scope is agreed, paper isn't signed. Treat this phase as paid work by other means — your credibility is being set here.

- Get MSA + commercials across the line. Push Sharbel directly, loop Kiyos's finance side if needed. Do not let build start without it.
- Collect: Nikita's draft PRD, three sample live assessments (anonymised), read access to Sidhant's code once he ports it to Git.
- Agree the working cadence: weekly sync with Nikita + Sidhant + Hina; async decision log in a shared doc; WhatsApp group between the two teams for operational matters.
- Lock the KV side: confirm team shape (eng lead, designer, 2–3 engineers, QA), confirm Dave's workstream, confirm who at KV reviews your decisions.
- Start a shared "Open Decisions" doc. First entries: confidence-threshold tuning, data-residency, pilot-customer migration from Google Drive, licensed-partner forms selection.

### Phase 1 — Discovery sprint (weeks 1–3)

Pointed exploration so your V1 scope is grounded, not guessed.

- Read the PRD twice, audit three sample assessments against the DTAA / RNOR knowledge base you've built. Find three things the engine does well and three gaps. The gap list is your credibility move with Hina.
- Walk Sidhant's code with him: residency logic, source rules, disclosure triggers, JSON schema (matters hugely for WhatsApp rendering), ambiguity flagging.
- Shadow two live Nikita calls with real customers. Observe where friction is — at the diagnostic, at the 30-min call, at document upload, at assessment delivery.
- Map the current journey end-to-end, honestly. Where humans do work, where the agent does work, where it breaks.
- Lock V1 scope with Nikita in writing. Reference the feature list in `Kiyos_What_We_Build_Next.docx` as the starting draft.

### Phase 2 — Design sprint (weeks 3–5)

Design converges on what engineering will actually build.

- Customer flows for the five V1 journeys: discover → diagnostic, assessment conversation, paywall, onboarding (WhatsApp + workspace), document upload + checklist.
- Advisor flows for the case captain: home, customer profile, sign-off queue, takeover-in-thread, audit trail.
- API contracts between the engine (Kiyos) and the product surfaces (KV).
- Data model for customer, case, document, assessment, decision, message, ticket.
- Security + storage model for the workspace, replacing Google Drive.
- Agreed confidence-score thresholds and escalation triggers.

### Phase 3 — V1 build (weeks 5–13)

Build and integrate. Don't let scope slip, don't gold-plate.

- Weekly demos to Nikita + Sidhant + Hina. Nothing is "done" until they've seen it.
- Hina reviews every tax-logic-adjacent decision, in writing.
- Launch readiness checklist is live from week 5, not week 12.
- Dogfood internally from week 8 with Dave + you playing customer + captain.

### Phase 4 — Pilot (weeks 13–15)

Move 5–10 of Kiyos's current customers onto the new platform. Known names, high trust, close-loop feedback.

### Phase 5 — V1.5 (weeks 15–21)

Computation, form generation, proactive nudging, scheduled consultations, rule-engine versioning, token economics.

---

## Your asks

### From Kiyos (Nikita, Sidhant, Hina, Sharbel)

- MSA and commercial terms signed, no later than end of next week.
- Draft PRD shared.
- Three anonymised live customer assessments.
- Read access to the Git-ified repository + rule database + index database.
- A single point of decision on their side — propose Nikita by default, Hina for tax-logic questions.
- A standing weekly sync at a fixed time. Non-negotiable; you can't lead without it.
- A commitment that any tax-logic ambiguity is resolved by Hina within 48 hours of being raised.

### From KeyValue leadership

- A clear mandate: "Adarsh is lead PM on Kiyos, Dave supports." In writing, visible to the team.
- A team: eng lead + 2–3 engineers + a designer + QA, time-boxed through V1. Named at the start, not drip-fed.
- A senior PM or engineering lead inside KV as your reviewer — someone who sense-checks your decisions once a week, not a direct boss, a sounding board.
- Permission to invest 20% of your time for the first month on domain study — tax, compliance, the returning-NRI journey — because every bad PM decision here traces back to thin domain depth.
- Access to Dave's hospitality agent IP (the ticket + takeover pattern, confidence-scoring loop). Reuse beats rebuild.
- Clarity on commercial model: fixed-fee vs T&M, revenue-share upside, retention commitments. This changes how you prioritise and what you promise.

### From engineering and design at KeyValue

- Engineering lead who will own architecture decisions with Sidhant, so you can focus on scope and sequencing.
- Designer who can hold both the customer-facing WhatsApp + workspace UX and the advisor dashboard — one person, not two, for V1 coherence.
- QA named from week 1, embedded, not bolted on at the end.

### From Dave

- Own the advisor-facing module end-to-end: case captain workspace, sign-off queue, ticket + takeover. His hospitality background is the natural fit.
- Help with the feature-list doc, as he offered in call 2.
- Backup for Nikita syncs when you're out — but you own the relationship.

### From yourself

- Spend 30 minutes a day on the domain for the first six weeks. The study material you've been building is the foundation; keep going.
- Keep one living doc as source of truth: scope, decisions, open questions. If it's not in the doc, it didn't happen.

---

## Your deliverables (as lead PM)

These are what you personally ship. Not the engineering team's output — yours.

- **Feature list, prioritised** — the one Nikita asked for. Value + effort + V1/V1.5/V2 bucketing. Living document, updated weekly. Starting draft already exists in `Kiyos_What_We_Build_Next.docx`.
- **Product spec** — one doc per module (A–F), lightweight, screen-by-screen where UX matters, contract-by-contract where API matters.
- **Decision log** — every scope, trade-off, and ambiguity call, dated, with the reasoning. This is how you survive scope disputes six weeks in.
- **Risk register** — three to seven live risks at any time, each with a mitigation and owner.
- **Weekly status** — one page, Monday morning, to KV leadership and Kiyos. What shipped, what slipped, what's blocked, what's next. Same format every week.
- **Launch readiness checklist** — starts empty week 5, grows every week.
- **Internal KV knowledge base** — a tight domain primer other KV people can skim, drawn from your own study. This is what makes you valuable beyond this project.
- **Post-V1 retro** — written, honest, shared. Future-you benefits most.

---

## The value you add to the office

Legibility matters. Make sure the people who promoted you can point at what you did.

- **You unlock a long-term vertical.** Kiyos is lead account in cross-border fintech services. Win here and KeyValue has a case study, a reference, and a repeatable pattern for other services businesses that want to go AI-native.
- **You are the translator.** Hina speaks tax. Sidhant speaks Claude Code. KV engineering speaks React and APIs. KV leadership speaks revenue. You are the person who makes all four hear each other. First-time PMs lose when they skip this; you've already started it by building domain depth.
- **You build muscle for KeyValue in agentic services.** The patterns you ship — confidence scoring, ticket + takeover, case captain, audit trail per decision — are reusable across KV's hospitality, legal, healthcare adjacencies. Make this visible internally. Write the patterns up after V1.
- **You de-risk the services-PM pipeline.** KV will need more first-time PM leads. A clear playbook — this one — is what they'll point future PMs to.
- **You show commercial judgement.** By refusing to start without MSA, by saying no to voice onboarding and Plaid in V1, by sequencing the WhatsApp agent before form generation, you are already showing that you're not just a feature ticker. Say this out loud in reviews.

---

## Risks and how to manage them

| Risk | Signal | Mitigation |
|---|---|---|
| MSA slips past kickoff | Sharbel non-responsive, Nikita quiet on paperwork | Don't start building. Escalate at KV. If Kiyos drags past 2 weeks, that itself is signal. |
| Hina loses trust in your depth | Short, curt answers in meetings; bypasses you to KV engineering | Lead every meeting with one specific domain question or insight. Never fake. Flag your uncertainty early; it reads better than wrong confidence. |
| Sidhant's engine is weaker than claimed | Code read reveals brittleness, no versioning, no tests | Scope V1 to not depend on logic you can't trust. Propose a quiet engine-hardening workstream under Sidhant with KV eng support. |
| Scope creep from Nikita's vision | "While you're at it" requests, Plaid, voice, wealth | Feature list is the backstop. Every new request goes through value/effort/priority triage. Written. |
| Dave's responsibilities ambiguous | He waits for you to assign; you hesitate | Write his scope in week 1. His module is advisor-ops. He's not a backup PM, he's an owner of a workstream. |
| First-time PM syndrome: you shrink | You defer to Hina or Sidhant on decisions you should make | Keep a short list: "decisions I own, decisions I co-own, decisions I escalate." Review weekly with your KV reviewer. |
| Compliance / data residency surprise | Customer PII, cross-border data flow, DPDP / GLBA emerges mid-build | Raise this in Phase 0. Legal review before Phase 3. Don't discover it in month 3. |
| V1 demo is unimpressive | Nothing surprising at week 13 demo | Ship one "aha" moment per demo from week 5. Trust compounds. |

---

## First 30 days — concrete cadence

**Week 1**
- Day 1–2: close the loose ends. MSA push to Sharbel. PRD + sample assessments + repo access asks to Nikita + Sidhant. Lock standing weekly sync.
- Day 3: confirm team shape with KV leadership. Write Dave's workstream scope.
- Day 4–5: start reading PRD and sample assessments. Draft three questions for Hina.

**Week 2**
- Shadow two Nikita customer calls.
- First repo walkthrough with Sidhant.
- Draft V1 scope lock, share with Nikita by end of week.

**Week 3**
- Lock V1 scope in writing with Nikita.
- Start Phase 2 design sprint.
- First weekly status to KV leadership.

**Week 4**
- Design flows ready for customer module. Review with Nikita.
- Launch readiness checklist v0 created.
- First retro with Dave on the working rhythm.

---

## How to measure yourself at 30 / 60 / 90 days

- **30 days** — Scope is locked. Team is formed and running. You have a weekly rhythm that neither side wants to miss. Hina has said one unprompted positive thing to you in a meeting.
- **60 days** — V1 is being built against a spec you own. Two demos have landed. Decision log has 20+ entries, zero disputed. KV leadership can name three things you're responsible for without checking.
- **90 days** — V1 is in pilot with real customers. Nikita trusts you to make scope calls without her. A second KV engagement has started quoting your patterns.

---

## Verification — how you know this plan is working

- **Signed MSA before Phase 2 starts.** If not, the plan has stalled; stop and escalate.
- **One written feature-list artifact that both sides edit in the same doc.** If each side has its own version, communication has broken.
- **Hina answers tax-logic questions within 48 hours in writing.** If she doesn't, the engagement model has slipped and the weekly sync needs renegotiation.
- **Weekly status sent for four consecutive weeks** — same format, same day, no gaps. If you skip one, the rhythm is already brittle.
- **Decision log reviewed by your KV reviewer monthly.** If no one at KV knows what you're deciding, the value you're adding is invisible.

---

# Part II — The Prototype Build

## Context

The product direction has pivoted since the PM playbook was written: KeyValue is no longer wrapping Kiyos's existing engine. KV will own the engine and the knowledge base. You are building a solo prototype in Cursor first — not a product, a working demonstration — to prove the shape before a KV pod is pulled in. Stack is Next.js + React + TypeScript on the front, Python + FastAPI + Postgres (Supabase to start) on the back, Claude API for AI. The purpose of this part of the plan is to lock architecture, repo layout and a weekly cadence for the prototype so engineering doesn't drift and so what gets built can actually be trusted.

## The non-negotiable principle — four-layer separation

Trust is impossible if an LLM computes tax. Every architectural decision below flows from this split:

- **Sources layer** — raw primary statutes in the repo: Income Tax Act sections, DTAA text, IRC sections, IRS publications, CBDT circulars. PDF + extracted markdown. Public-domain government works. The ground truth every rule cites back to.
- **Knowledge layer** — verified tax rules, authored by humans, versioned in git, structured as machine-readable YAML with human-readable markdown alongside. Each rule cites specific source IDs. Jurisdiction and tax-year aware. Deterministic to read.
- **Deterministic engine layer** — Python, pure functions, no LLM calls. Takes structured inputs, applies rules from the knowledge layer, returns structured outputs plus a derivation trail (the ordered list of rule IDs applied). Unit-tested against the knowledge layer's own test cases.
- **AI reasoning layer** — Claude API, scoped to three jobs only: (a) extract structured data from uploaded documents, (b) explain a calculation in plain English with rule citations (which transitively cite sources), (c) hold a conversation that calls the engine for any number and defers to the knowledge layer for any rule. Never computes tax itself. Every call logged.

A user asking "how much tax do I owe?" triggers the engine, not Claude. Claude only ever says what the engine returned, cites the rules the engine applied, and those rules cite the sources. This is the architectural answer to "why should I trust this?"

## Stack decisions and why

- **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui** — fastest path to a polished dashboard in solo mode; shadcn gives you production-looking components without design time.
- **Python 3.12 + FastAPI + Pydantic** — tax logic in Python is right because the ecosystem (pandas, finance libraries, rule-authoring) is there, and Pydantic models double as API contracts and engine input/output types.
- **PostgreSQL via Supabase** — one dependency gives you auth, Postgres, storage (for documents) and row-level-security policies. Replaceable later; perfect for prototype.
- **Claude API** — `claude-opus-5-5` for reasoning and document extraction, `claude-haiku-5-5` for structured extraction at scale.
- **Localhost only for the prototype.** `pnpm dev` for web on :3000, `uvicorn` for api on :8000. No Vercel, no Fly, no Railway until the Kiyos demo forces the decision. Supabase stays cloud (free tier) because it saves days of setup; swap to local Supabase CLI later if the prototype needs to go fully offline.
- **pnpm + Poetry** — one package manager per language, no workspace monorepo yet; keep repo flat.
- **GitHub, private repo** — trunk-based, feature branches, tag every demo build (`v0.1-demo-01`, `v0.1-demo-02`) so you can roll a demo state back in one command.

## Repo layout

Keep it flat for a prototype — no monorepo tooling yet.

```
kiyos-platform/
├── web/                  # Next.js app
├── api/                  # FastAPI app
├── engine/               # Python tax calculation package (importable by api)
├── knowledge/            # YAML + markdown tax rules, versioned by jurisdiction + year
│   ├── india/
│   │   └── 2026-27/
│   └── us/
│       └── 2026/
├── sources/              # raw primary statutes — PDF + extracted markdown
│   ├── india/
│   │   ├── ita-1961/
│   │   ├── dtaa-india-us/
│   │   ├── cbdt-circulars/
│   │   └── black-money-act/
│   └── us/
│       ├── irc/
│       ├── irs-publications/
│       └── treaty/
├── docs/                 # architecture notes, decisions, demo scripts
│   ├── PLAN.md           # this plan, copied in
│   └── ARCHITECTURE.md   # four-layer explainer for future readers
├── .cursor/
│   └── rules/            # scoped rule files Cursor auto-loads
├── infra/                # supabase migrations, deployment config
├── .env.example
├── README.md
└── Makefile              # top-level: dev, test, lint, migrate
```

Flatness is deliberate. The moment a KV pod joins, we convert `web/` and `api/` into pnpm workspaces with `packages/engine` shared. Not yet.

## Knowledge layer schema

Every rule is one YAML file + an optional markdown explainer in the same directory. The engine reads YAML; the dashboard surfaces markdown when citing a rule to a user.

```yaml
# knowledge/india/2026-27/residency/rnor-9-of-10.yaml
id: IN-RES-RNOR-9OF10
jurisdiction: IN
tax_year: 2026-27
sources:
  - id: IN-ITA-S6              # points at sources/india/ita-1961/s6-residence.{pdf,md}
    section: "6(6)(a)"
    passage: "an individual who has been a non-resident in India in nine out of ten previous years"
summary: "Resident is NOT ordinarily resident if NR in 9 of 10 preceding PYs"
inputs:
  - name: previous_year_statuses
    type: array[enum[NR, RNOR, ROR]]
    length: 10
logic:
  kind: threshold_count
  count_of: NR
  within: previous_year_statuses
  operator: ">="
  threshold: 9
status: active        # active | deprecated | debated
test_cases:
  - name: "Standard returnee after 10 NR years"
    inputs:
      previous_year_statuses: [NR, NR, NR, NR, NR, NR, NR, NR, NR, NR]
    expected: true
  - name: "Only 8 NR years, fails"
    inputs:
      previous_year_statuses: [NR, NR, NR, NR, NR, NR, NR, NR, RNOR, RNOR]
    expected: false
```

Every rule has a stable ID that the engine emits in its derivation trail. Changes to rules are PRs with reasoning in the commit message. Every demo build is tagged; rolling back a demo also rolls back the knowledge layer.

## Deterministic engine design

- `engine/` is a pure Python package imported by `api/`.
- Public surface is a small set of functions, each taking a Pydantic model and returning a Pydantic model plus a `DerivationTrail` (ordered list of `(rule_id, inputs_used, output)`).
- No `anthropic` import inside `engine/`. Ever. Linted.
- Unit tests live next to each engine module, generated in part from the `test_cases` blocks in the YAML rules.
- The engine is the only thing allowed to compute a tax number.

## AI layer design — three jobs, scoped, logged

1. **Extraction service** (`api/services/extract.py`) — document → structured JSON. Uses Claude with vision on PDF/image. Output validates against a Pydantic schema per document type (W-2, 1099, Form 16, AIS). Rejects on validation failure.
2. **Explanation service** (`api/services/explain.py`) — takes an engine result + derivation trail + the user's situation, returns plain English that cites rule IDs. Must cite; prompt enforces this with a few-shot pattern.
3. **Conversation service** (`api/services/converse.py`) — a thin agent loop that answers questions. Tool-call style: can call the engine, can look up rules, can ask the user for more info. Cannot compute on its own.

Every AI call is written to an `AiCall` table: timestamp, service, model, prompt tokens, completion tokens, latency, request hash, response. This is the audit substrate.

## Data model (prototype — minimal)

- `user` — Supabase auth row.
- `case` — one open case per user for the prototype.
- `document` — uploaded file, status (uploaded / extracting / extracted / failed), extracted JSON.
- `fact` — a normalised datum (e.g. "US salary 2026 = $240K") tied to a case and optionally a source document. The engine reads facts, not documents.
- `assessment` — engine output: computed amounts, derivation trail, status.
- `explanation` — AI-generated explanation of an assessment, linked to it.
- `conversation` + `message` — chat history, same model whether the message came from dashboard or WhatsApp later.
- `ai_call` — audit log.
- `rule_version` — hash of the knowledge layer at the time of an assessment, so re-running old assessments stays reproducible.

Supabase row-level-security from day one: a user sees only their own case. Case captain role gets elevated read with every access logged.

## How WhatsApp fits into the dashboard view

The question you flagged — you can't render a WhatsApp interface inside the dashboard. The resolution: the WhatsApp agent and the dashboard chat are the same backend conversation, just rendered on different surfaces.

- The `conversation` + `message` tables are surface-agnostic.
- In the prototype, build an in-dashboard chat panel that writes to those tables. It uses the same three AI services and the same engine.
- When WhatsApp integrates later (Meta Cloud API → webhook → FastAPI endpoint), it writes into the same tables.
- The dashboard's chat panel becomes a mirror of the WhatsApp thread, not a separate conversation. The case captain can read along, take over mid-thread (ticket + takeover from Dave's pattern), and hand back.

For the prototype you skip real WhatsApp entirely. The in-dashboard chat is the demo surface. One sentence in the demo script: "this is the same agent the customer will get in WhatsApp."

## Security and privacy (prototype grade, not production)

- Supabase handles auth, encryption at rest, RLS.
- Documents in Supabase Storage behind signed URLs with short TTL.
- `.env` never checked in; `.env.example` is.
- AI calls go through a single wrapper function that strips named entities (name, SSN, Aadhaar, PAN) before sending prompts — reversibly, so explanations can reinject them client-side. This is a prototype-grade protection; it will be revisited in the production build.
- Private GitHub repo, two-factor on every account.
- No production customer data ever touches the prototype. Seed with synthetic cases.

## GitHub + rollback strategy

- `main` always deploys cleanly.
- Feature branches: `feat/knowledge-residency`, `feat/engine-cap-gains`, etc.
- PRs reviewed by yourself (solo mode) but written as if someone else will read them — this is practice for the pod.
- Tag every working demo state: `v0.1-demo-01`, `v0.1-demo-02`, `v0.2-cap-gains-ok`. Push tags to origin.
- Rollback = `git checkout <tag>` + `make dev` restarts cleanly. Local only for now; deploy rollback is a later concern.
- Supabase migrations in `infra/migrations/`, numbered forward-only. Migration revert scripts if destructive.
- Weekly backup of Supabase during active dev.

## Build phases — 8 week prototype arc

| Week | Milestone | Done means |
|---|---|---|
| 1 | Repo scaffold | Next.js hello-world + FastAPI hello-world + Supabase project + auth round-trip + first `v0.1-scaffold` tag |
| 2 | Knowledge layer v0 | 10–15 rules authored in YAML (residency, Art 4/13/15/20/23, capital gains, dividends, 401(k) distribution), all with test cases passing |
| 3 | Engine v0 | Residency determination + one capital-gains scenario computes end-to-end against the knowledge layer, derivation trail emitted |
| 4 | Explanation + conversation v0 | Claude generates plain-English explanations citing rule IDs; in-dashboard chat holds a 10-turn session that calls the engine |
| 5 | Document extraction v0 | Upload a W-2 or Form 16, see structured facts populated into the case |
| 6 | Dashboard UI v0 | Case view, documents panel, assessment view with derivation trail visible, chat panel |
| 7 | End-to-end demo polish | Three seeded demo cases (Arjun, Hina, Priyanka) walk through cleanly in 15 minutes |
| 8 | Internal walkthrough + Kiyos demo | Senior PM review, then Kiyos. Tag `v0.1-kiyos-demo`. |

## What you do NOT build in the prototype

- Real WhatsApp integration.
- Real payment or subscription flow.
- Real licensed-partner form generation.
- Production observability stack (console + `uvicorn` logs are enough).
- Comprehensive test coverage (engine + knowledge test cases are the floor; UI tests can wait).
- Complex RBAC (two roles: user and admin, that's it).
- Multi-case-per-user, household modelling, trust/estate.
- Real tax filing submission.

If you find yourself building any of the above, stop and justify.

## Verification — how you know the prototype is real

- **Three seeded cases run end-to-end**, with the same output every time (deterministic engine). Arjun (returning NRI full arc), Hina (401(k) decision during ROR), Priyanka (Oman consultant deemed resident).
- **Every assessment screen cites rule IDs**, clickable to the markdown explainer.
- **The chat agent refuses to answer a tax question without calling the engine**. If it ever hallucinates a number, the AI layer has leaked into the engine's job — fix the prompt.
- **Pull a tag from six weeks ago locally, restart, and get identical output** on the same seeded case. Rollback works.
- **Run `make test`** — knowledge layer YAML test cases pass, engine unit tests pass, API contract tests pass. Red is red.

## Files you will actually touch first

- `README.md` — a one-page "what this is and how to run it" for future-you and the first engineer who joins.
- `knowledge/india/2026-27/residency/rnor-9-of-10.yaml` — the first real rule. Author it by hand, work out the schema as you go.
- `engine/residency.py` — the first real engine function. Reads the YAML, computes, emits a derivation trail.
- `engine/tests/test_residency.py` — proves it works.
- `api/main.py` — FastAPI app with one endpoint: `POST /assess/residency`.
- `web/app/case/page.tsx` — the first dashboard screen.

Once those six files exist and talk to each other, everything else is incremental.

## The sources layer — primary statutes in-repo

Rather than URLs that rot, every rule cites a stable local document. The sources layer is small, public-domain, and committed to the repo.

### What to download (don't boil the ocean)

**India (`sources/india/`):**

- ITA Section 6 (residence) — the one that drives everything
- ITA Section 90, 91 (FTC, treaty override)
- ITA Section 115 series for capital gains, if touching them
- ITA Section 139 (returns + updated return)
- **India-US DTAA** — full treaty text, ~30 pages
- **Black Money Act 2015** — full text
- CBDT Circular 24/2022 (FTC positions) and other NRI-specific circulars you can locate
- Form 67, Schedule FA instructions

**US (`sources/us/`):**

- IRC §7701(b) — residency
- IRC §877A — expatriation
- IRC §871, §872, §894 — NRA taxation + treaty override
- IRC §1291, §1296 — PFIC
- IRC §402, §72(t) — 401(k) + early withdrawal
- **IRS Pub 519** (full) — US Tax Guide for Aliens
- **IRS Pub 54** (full) — Americans Abroad
- **IRS Pub 514** (full) — Foreign Tax Credit
- Form 8938, 8621, 1040-NR instructions
- Rev. Proc. 2020-17 (foreign retirement trust 3520 exemption)

Target: ~15–20 PDFs, under 500 MB. Downloadable in an afternoon.

### Processing

- Keep the PDF (primary, cite-able).
- Extract to markdown with `pdftotext -layout` as first pass; swap to `docling` if structure is poor.
- Commit both. Add `_manifest.yaml` per source directory with `{id, title, authority, as_of_date, url_when_fetched}`.
- No vector DB for the prototype. Claude's 200K context window loads the relevant markdown on demand. Introduce embeddings only when scale forces it.

### Copyright note

Indian statutes, DTAA, IRC, IRS publications — all public domain / government works, safe to commit to a private repo. Avoid commercial commentary (CCH, RIA, Thomson Reuters) — those are copyrighted.

## How to load this onto Cursor

Cursor reads files in the open project and auto-attaches `.cursor/rules/*.mdc` into its AI context. Set these up and the AI inside Cursor will follow your architecture without you re-explaining every session.

### Step 1 — Repo bootstrap (one `git init` and go)

Create `/Users/adarsh/Downloads/Kiyos/kiyos-platform/`. `git init`, create a private GitHub repo `kiyos-platform`, push an empty `main`. Open the directory in Cursor.

### Step 2 — Copy the plan and architecture into the repo

- `docs/PLAN.md` — copy this plan file verbatim. It's the single source of truth; the Cursor AI reads it when asked.
- `docs/ARCHITECTURE.md` — a two-paragraph summary of the four-layer separation, for anyone (human or AI) who opens the repo cold.
- `README.md` — one page, "what this is, how to run it."

### Step 3 — Author `.cursor/rules/*.mdc` — the architectural guardrails

These files make Cursor's AI follow your rules without being re-prompted. Modern Cursor supports scoped rules via frontmatter (`alwaysApply`, `globs`, `description`).

- `.cursor/rules/architecture.mdc` — `alwaysApply: true`. States the four-layer separation. Lists prohibitions: no LLM call in `engine/`, no tax computation in `api/services/*`, no inventing rules, no citing a source without a sources/ file.
- `.cursor/rules/knowledge-schema.mdc` — `globs: ["knowledge/**/*.yaml", "knowledge/**/*.md"]`. Describes the rule YAML schema, `sources:` citation format, mandatory `test_cases` block.
- `.cursor/rules/engine.mdc` — `globs: ["engine/**/*.py"]`. Deterministic only, Pydantic in/out, derivation trail required, no `anthropic`, `httpx`, `requests` imports.
- `.cursor/rules/ai-services.mdc` — `globs: ["api/services/{extract,explain,converse}.py"]`. Must cite rule IDs, must call engine for numbers, must log via the `AiCall` wrapper.
- `.cursor/rules/sources.mdc` — `globs: ["sources/**"]`. Describes the `_manifest.yaml` format, naming conventions (`IN-ITA-S6`, `US-IRC-7701B`).

Example `architecture.mdc` frontmatter:

```
---
description: Four-layer separation for the Kiyos prototype
alwaysApply: true
---

This codebase has four layers. Each layer may only call downward:
sources → knowledge → engine → ai.

PROHIBITED:
- importing `anthropic` from `engine/` or `knowledge/`
- computing a tax number anywhere except `engine/`
- inventing a tax rule or citing a source that is not in `sources/`
- generating a number in AI responses without calling the engine first

Every engine output must include a DerivationTrail of rule IDs applied.
Every AI response that cites a rule must use the rule's stable ID.
```

### Step 4 — The first Cursor prompt (Day 1 scaffold)

Open Cursor Composer in agent mode, with `docs/PLAN.md` and `.cursor/rules/architecture.mdc` attached. Prompt (literal):

> "Scaffold the repo per `docs/PLAN.md` section 'Repo layout'. Create a Next.js 14 App Router app in `web/` with TypeScript, Tailwind and shadcn/ui installed. Create a FastAPI app in `api/` with Poetry, Pydantic v2 and uvicorn. Create empty `engine/` as an importable Python package. Create `knowledge/`, `sources/`, `docs/`, `.cursor/rules/`, `infra/` with README stubs. Write a top-level `Makefile` with `dev`, `test`, `lint`, `migrate` targets (no `deploy` target yet — localhost only). Write `.env.example`, `.gitignore`, `README.md`. Do not install Vercel adapters. Do not install any tax rule content. Run `pnpm install` in `web/` and `poetry install` in `api/` and confirm both start."

Review the diff. Tag `v0.0-scaffold`. Push.

### Step 5 — Second Cursor session: wire Supabase + auth

Separate session, fresh context. Prompt:

> "Set up Supabase integration per `docs/PLAN.md`. Add Supabase JS client to `web/` with SSR helpers and a magic-link login flow at `/login`. Add Supabase Python client to `api/` using the service role key. Write the initial migration in `infra/migrations/0001_init.sql` with the tables listed in `docs/PLAN.md` section 'Data model'. Add RLS policies: user sees only their own case/document/fact/assessment. Don't seed any data yet."

Tag `v0.0-supabase`.

### Step 6 — Everything after is incremental

- Author the first YAML rule by hand (not with Cursor).
- Ask Cursor to scaffold the engine function around the rule.
- Add the first PDF to `sources/` by hand, with its manifest.
- Ask Cursor to wire the explanation service, then hand-tune the prompt.
- Ask Cursor to build the dashboard case view.

The pattern: hand-author the domain-sensitive files, let Cursor fill the scaffolding around them.

### When Cursor goes wrong

- If Cursor invents a rule or source citation, stop and point it at the architecture rule. If it does it twice, strengthen the `architecture.mdc` prohibitions with an explicit example.
- If Cursor writes a number inside an AI service, same drill.
- If a Cursor session gets lost in a big refactor, abandon the branch — `git checkout main`, start fresh. Cheaper than untangling.

