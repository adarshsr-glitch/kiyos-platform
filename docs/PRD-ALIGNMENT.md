# Prototype vs PRD v1 — alignment audit (11 Nov 2026)

What the customer-facing prototype did, measured against the PRD, and what changed.
Section numbers refer to *Kiyos productised service — PRD v1*.

## Gaps found

| # | PRD rule | What the prototype did | Severity |
|---|---|---|---|
| 1 | §5 stage 1–2, §7 P0 "Bot onboarding" / "Free assessment": onboarding is **bot-led in WhatsApp**, need- or life-event-first, with "not sure" paths and consent | A five-step **web form** (`/portal/onboarding`) asking for name, DOB, nationality, income amounts | High — wrong channel, form-first, captures data before value |
| 2 | §5 stage 2, Decision 10 Nov: risk map rows show **the customer input that produced them**; plus unknowns, confidence, indicative price band | "Initial report" listed generic warnings; no input column, no missing facts, no price band | High |
| 3 | Decision 10 Nov: the five-minute assessment **does not count** toward the free cap | Assessment was not in chat at all, so the rule could not hold | Medium |
| 4 | Decision 10 Nov: **3 generic questions in total**; no other cap | Added an invented 10-message cap on all free chat | High — invented business rule |
| 5 | Decision 10 Nov: after the third question, "explains the free limit and **offers the two paid offerings**" | Generic "see plans" link | Medium |
| 6 | §5 stage 3, §8: free users get generic education only; workspace, documents and a named expert start **after payment** | Free users saw a full dashboard with the paid case's documents, 16 pre-filled facts, a case captain and "Confirm your details" | High — leaks paid scope and implies a case that doesn't exist yet |
| 7 | §10, Scenario "Plan selection before invoice", "Scope recap at conversion": explicit individual/couple pick, inclusions, exclusions, GST, currency, rails, written scope confirmed | Two pricing cards and a single "Upgrade" button that flipped local state | High |
| 8 | §5 stage 5: workspace owns payment confirmation, signed NDA, consent; lead expert introduced; reviewers' names shown (§9) | None of these existed | Medium |
| 9 | §6 Workspace "Overview": **country statuses, key dates, upcoming filings, profile freshness, highest-priority actions**; §2 "Silence is a defect": owner, blocker and next update always visible | Greeting, generic task list, document list, financial table | High |
| 10 | §8 deep links: "Where do I send my Schwab 1099?" → link **to that upload task**; per-item upload links with why each is needed | One generic checklist (W-2, Form 16, passport…) unrelated to the case; no per-item links, no "why" | High |
| 11 | §8 deep links / §6 fact design: "I moved back on August 12" → **proposed residency change** + authenticated confirmation; keep history | "My details" was a raw form of database keys ("Us salary 2026 h1", "Rsu unvested count") that overwrote values | High |
| 12 | §6 "Ask Kiyos: the same conversation… available on WhatsApp"; WhatsApp is the primary channel, workspace monthly | Chat dominated the page as a floor-to-ceiling panel with its own scripted greeting | Medium |

## What changed

- **WhatsApp intake bot** (`api/services/intake.py`): need-first questions with "Not sure" on every
  step, no form knowledge required, consent before saving. Produces the initial risk map in chat,
  then links to it in the workspace. Not counted toward the free-question cap.
- **Initial risk map** (`knowledge/assessment/initial-scan.yaml`): each row = area, country, what it
  likely means, **your answer behind it**, confidence; plus missing facts and the indicative band from
  the §10 prices. The scan rules are a **draft for Hena/Sidhant review** — labelled as such in the file.
- **Free Q&A**: 3 generic questions in total, personal questions pivot from the first question with
  what the paid review would cover; after the third, the two offerings with prices. Invented message
  cap removed.
- **Free workspace** is just the saved risk map and plans — no documents, facts or case captain.
- **Plans → activation**: individual/couple choice, inclusions/exclusions, GST-inclusive INR with USD
  reference, provisional-price label, scope recap confirmation, then payment (Razorpay/UPI, mocked),
  NDA and consent; lead expert and India/US reviewers introduced.
- **Paid overview**: India and US status, upcoming filings and key dates, what needs the customer,
  what Kiyos is doing (owner + next update), profile freshness.
- **Document requests**: case-specific, each with why it is needed, status and its own deep link.
- **Profile**: plain-language facts with source and date; changes proposed on WhatsApp wait for
  confirmation in the workspace and keep history.
- **Layout**: the workspace takes the screen; a compact WhatsApp phone on the right shows the
  message that brought the customer to the page they are on.

## Still open (not built)

- Real authentication, payments, NDA e-signature, email fallback for the pricing matrix.
- Expert approval of the assessment/checklist before release (P1 QA console).
- Session-window/template handling, follow-up cadence and escalation timers.
- The free-scan rule table needs expert review before any real customer sees it.
