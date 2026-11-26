# Closing the Phase 1 scope gaps in the prototype

Status: built and verified 20 Nov 2026 (items 1–11). Source: *Kiyos: Scope and Estimation for Phase 1* (17 Nov 2026)
and the coverage map in `docs/demo/2026-11-20-recording-script.md`.

Everything is a happy-path prototype: real screens and real state changes, simulated providers
(WhatsApp, Razorpay, S3/GuardDuty, OCR). Nothing calculates tax.

## Decided

- **24-hour WhatsApp window and template fallback: dropped.** The prototype follows the happy path,
  where the customer is always inside the window. (Product owner, 20 Nov.)
- **Payment webhooks:** not visible on screen; the activation they would trigger is already shown.

## What gets built, in order

| # | Gap (scope ref) | In the prototype |
|---|---|---|
| 1 | Free questions: 5, not 3 (Agent 3a) | Limit and wording to 5 |
| 2 | Malware scan status (Customer 2b–c) | Upload steps gain "Scanned · clean"; each document shows "Scan: clean" |
| 3 | Delivery statuses (Expert 4c) | Sent → delivered → read ticks on messages in the expert thread and on the customer's phone |
| 4 | Assessment PDF after the questions (Agent 2b) | The risk map as a PDF attachment in WhatsApp, openable and downloadable; also from the assessment page |
| 5 | Payment magic link with token and expiry (Customer 1a, 1d, 1e) | WhatsApp sends a pay link (`/pay/<token>`, 24 h): page pre-filled with the customer and plan; states for paid, expired and invalid links; confirmation page; WhatsApp confirmation on success |
| 6 | Magic-link sign-in (Customer 5b) | WhatsApp links like "Open secure upload" carry a token (`/m/<token>`, 15 min) that opens the workspace without a code; expired link → sign-in with code |
| 7 | Web sign-up (Customer 5d) | `/portal/signup`: name, WhatsApp number, country; validation; duplicate number → "sign in instead" |
| 8 | Expert sign-in and sign-up (Expert 6) | `/expert/signin` with work email and code, `/expert/signup`; signed-in expert shown in the side rail |
| 9 | Agent memory (Agent 10b–c) | On the expert thread: "What Kiyos uses to reply": case state, last 20 messages, and a summary of older ones, refreshed in the background |
| 10 | Rule import from Excel with validation (Agent 6a) | `/expert/rules` → "Import rules": upload a spreadsheet, row-by-row validation, import as a new rule version |
| 11 | Evaluation set (Agent 7c) | `/expert/quality`: fixed questions run against the agent, checked for a cited rule and grounding |

## Beyond the scope (built already, worth adding to the scope)

Sources on every figure with the document page; income per country by source; "since your last
visit"; Year at a glance; expert-entered tax figures and ways to save from a fixed list of legal options;
case brief prepared by Kiyos; residency calculated per year from trips.
