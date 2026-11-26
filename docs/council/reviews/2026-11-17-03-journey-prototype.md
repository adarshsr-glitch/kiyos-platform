# Review 03: Journey prototype restructure (17 Nov 2026)

The council's contributions are simulated by one AI model, not independent agents. The approved plan, with the audit, journey maps and IA, is summarised here. The debates are also shown in the prototype at `/council`.

## Why

The old prototype was a set of screens that toggles held together:
- An Expert/Customer toggle and a demo-customer switcher did the navigating.
- WhatsApp was never shown.
- Several steps were dead ends: welcome, chat, and intake → sign-up.
- Every click wrote to the shared database, so demos drifted between runs.

## What was built

| Area | Location |
|---|---|
| Journey landing page | `/` (`web/src/prototype/housing.tsx`) |
| Journey player | `/j/[journey]/[step]` (`player.tsx`, `store.tsx`, `registry.tsx`) |
| Scripted WhatsApp | `whatsapp.tsx`: typing indicator, timed replies, quick replies, link cards; the thread persists across steps |
| Customer journeys | `customer/arjun.tsx`, `customer/preeti.tsx` |
| Expert journeys | `expert/screens.tsx` (separate shell and navigation) |
| Demo personas | `fixtures.ts`: all illustrative, with hedged tax wording |
| Council panel | `/council` (`council.tsx`) |
| Expert workspace (free roam) | moved from `/` to `/expert` |

Reuse: the shared visual language (`components/portal/kit.tsx`, colour tokens, WhatsApp styling) is reused.

Not reused: the portal components that change data (task sheet, checkout, profile). They call the live API, which would break JX-01. The journeys have local equivalents. If the journey screens become the real product, those components need a data adapter.

## Validation (17 Nov 2026)

**How it was checked:**
- Each journey was run from its card to the end screen in the in-app browser at 1440px, following only the highlighted steps.
- Key screens were checked again at 375px.
- API log: zero POST requests during all journey runs (GETs only, from the free-roam checks).
- Console: no errors.
- `tsc --noEmit` and ESLint are clean on the new code.
- Free-roam routes all return 200: `/expert`, `/expert/cases`, `/expert/cases/1`, `/expert/rules`, `/portal/dashboard`.

### J1 · Arjun (new user, free): 7 steps, pass

| Step | Check | Result |
|---|---|---|
| WhatsApp | 5 replies; typing indicator and pauses; 5 facts captured in the side panel; link card | Pass |
| Sign up | Phone number carried over from WhatsApp; OTP; verify | Pass |
| Onboarding | Opens on "Here's what we already have" (5 chat facts, not asked again); household; 6 money ranges; time in India | Pass |
| Processing | 5 named steps quoting his own inputs ("9+ years abroad, moving Apr 2027…") | Pass |
| Assessment | Indicative label; 5 findings; footprint marked "You told us"; finding sheet with what / why / to-do / based on | Pass |
| Ask | Same thread continues (19 messages); general answer uses 1 free question; personal question declined and routed to plans | Pass |
| Plans | Scope pre-filled from his answers (India + US, spouse) → end screen | Pass |

### J2 · Preeti (paid, existing): 7 steps, pass

| Step | Check | Result |
|---|---|---|
| WhatsApp | Opens on last week's history; answers from her records; the date change becomes a proposed change; link card | Pass |
| Magic link | Sign-in screen with cautious security note; no onboarding | Pass |
| Home | 3 tasks in Needs you; confirm and upload happen in sheets; With Kiyos updates | Pass |
| Tax position | Reviewer per country; "Rechecking" shown after the confirm; reviewed answers; earlier questions | Pass |
| Documents | Vault with who checked each item and when; the new upload shows "Checking" | Pass |
| Plan | Book quarterly call → slot chosen | Pass |
| WhatsApp | Thread knows about the upload and the booking; personal question deferred to the expert → end | Pass |

### J3 · Expert, new customer: 4 steps, pass
- SSO sign-in → queue with Kavita first.
- Her case shows scan and onboarding answers side by side, plus 3 gaps.
- Request documents: reasons shown and the WhatsApp message previewed; onboarding progress updates.
- Draft assessment held as indicative → end.

### J4 · Expert, existing customer: 4 steps, pass
- Queue → portfolio (Preeti first) → history and pending compliance.
- Take over the chat → reply as Vikram → resolve the ticket (chat goes back to the AI) → add a follow-up, previewed in her Needs you → end.

### J5 · Expert, assessment review: 3 steps, pass
- The review shows the source document behind each fact.
- Flagged discrepancy: 142 stated vs about 211 from the passport stamps; the stamps open in a sheet.
- Save observation → ask Rohan → status "Awaiting customer" → sign-off blocked with the reason → end.

### Not covered / known limits
- The journeys are demo-only. The real app still has the old toggles; they're now reachable only through the landing page footer.
- Expert actions in J3–J5 don't exist in the real app (JX-Q1).
- Domain content in the personas is pending validation (JX-Q2). Preeti's tax years were corrected during testing to match a July 2027 move.
- Not tested in Safari or Firefox, or at tablet width.
