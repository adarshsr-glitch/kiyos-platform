# Kiyos prototype: screen-recording script and scope map

Prepared 20 Nov 2026 against *Kiyos: Scope and Estimation for Phase 1* (17 Nov 2026); updated the
same day after the scope gaps were built (see `docs/plans/2026-11-20-scope-gaps.md`).
Two parts: **(1)** the script, step by step, with where each screen lives; **(2)** a map of every
scoped item to where it is in the prototype.

---

## Before you press record

- **Window at least 1280 px wide.** The expert's WhatsApp thread (take over / hand back, delivery
  ticks, "What Kiyos uses to reply") sits in a right-hand rail that only appears from 1280 px.
- Both servers running (`make up`). Open `http://localhost:3000/`.
- **Switching:**
  - **Customer ↔ expert, same case:** the pill top right ("Kavita's view / Sidhant's view").
  - **Which customer:** the name menu top left of the customer workspace.
- **Journey cards on `localhost:3000/` reset that persona.** Only Act 1 uses one. Rehearse it once.
- **WhatsApp links are secure links that expire:** 15 minutes for workspace links, 24 hours for
  payment links. A link tapped later opens "This link has expired" with **Send me a new link**,
  which is worth showing once (Act 1.7).
- **Agent quality starts at 8 of 10** only while no fix is applied. If you rehearsed 4.8, press **Undo** on both fixes first.

**Running order (about 22–25 min).** Act 1: a new customer, WhatsApp to payment (Arjun Mehta, fresh).
Act 2: a paid customer's workspace (Arjun Rao). Act 3: customer and expert on the same case, live
(Kavita Reddy and Sidhant). Act 4: the expert's tools.

---

## Act 1 · New customer: WhatsApp to a paid plan (≈7 min)

Persona: **Arjun Mehta**, new user. Start: `localhost:3000/` → card **Journey 1 · Arjun Mehta**.

| # | Do this | Where | Say / point at | Scope |
|---|---|---|---|---|
| 1.1 | Read the first messages | `/portal/whatsapp` | Welcome, AI disclosure, "Free, and not personal tax advice". Banner: "Never share ID numbers or documents here." | Agent 1a, 1b, 5 |
| 1.2 | Answer with the reply buttons | same | Need-first questions, "Not sure" always allowed; answers saved to his record | Agent 2a |
| 1.3 | Risk map message → **Yes, save it** → type a name | same | 7 areas by country, still unknown, confidence, price | Agent 2a, 2b |
| 1.4 | Tap the **Kiyos-initial-assessment.pdf** attachment | same → document view | The assessment as a PDF: answers, findings by country, unknowns, price. **Open PDF / Download** | Agent 2b |
| 1.5 | Type **What is RNOR?** | same | Answer with "Source: Income-tax Act, section 6(6)(a) · tax year 2026-27"; counter "4 of 5 left" | Agent 3a, 6b, 6c, 8 |
| 1.6 | Type **Should I sell my flat in Pune before I become resident?** | same | Classified personal: not answered, nudged to plans | Agent 3a, 3b, 4a |
| 1.7 | Under **Open my risk map**: "Secure link · works for 15 minutes". Tap it | `/m/<token>` → `/portal/assessment` | Signed in from WhatsApp with **no code**: the magic link. (If it has expired: "This link has expired" → **Send me a new link**, and a fresh one arrives in WhatsApp) | Customer 5b, 5c |
| 1.8 | Assessment page; **Download PDF** | `/portal/assessment` | Findings in India / both / US lanes, each "Based on your answer …"; known vs unknown | Agent 2b |
| 1.9 | **Compare plans** → Full service → confirm scope and terms → **Pay ₹47,200** | `/portal/plans` | Four linear steps; Pay creates a **secure payment link** (also sent on WhatsApp) | Agent 4a · Customer 1a |
| 1.10 | The payment page | `/pay/<token>` | Pre-filled: name, masked WhatsApp number, plan, cover, scope confirmed, total incl. GST, method; "link valid for 23 h 59 min" | Customer 1a, 1b, 1e |
| 1.11 | **Pay** → **Payment received** → **Open my workspace** | same → `/portal/overview` | Confirmation and receipt on WhatsApp, case captain assigned, document requests listed with reasons. Reopening the same link shows it's paid | Customer 1b, 1d, 1e |

*Payment failure:* switch customer to **Rahul Gupta** → `/portal/plans` shows "Your payment of ₹… didn't go through…
Your choice is kept" and resumes at the payment step.
*Invalid link:* any made-up `/pay/abc` shows "We don't recognise this link".
*Web sign-up instead of WhatsApp:* `/signup`: name, WhatsApp number, email, terms. A number that already
has an account (try Kavita's, +91 99001 77342) is refused with "Sign in with this number instead".
A new number creates the account and Kiyos messages them on WhatsApp to start the check.
*Code sign-in:* `/portal/signin`: WhatsApp number, 6-digit code (any 6 digits).

---

## Act 2 · Paid customer's workspace (≈5 min)

Persona: **Arjun Rao** (top-left menu). Captain: Vikram Desai. Figures with a dotted underline open their source:
one click opens the document; totals list what they're made of, and a click on any line opens its document.

| # | Do this | Where | Say / point at | Scope |
|---|---|---|---|---|
| 2.1 | Overview → **Your year** | `/portal/overview` | One card per country that reads top to bottom: residency (RNOR / Dual-status) → income this year as a ring by source → tax this year from Vikram (left to pay or refund, paid vs liability) → the return and its due date. "Moved to India on 12 Jul" sits above | Customer 3d |
| 2.2 | Click **₹75 L** salary → a payslip | popover → document | Each payslip; one more click opens the salary slip with the gross highlighted | Customer 3d · Agent 8 |
| 2.3 | **What Vikram needs from you** (top of Overview), **Ways to save**, **Since your last visit** | same page | Each to-do says what kind it is and when ("Send a document · due today", "Reply to Vikram"), with one button; the bell in the top bar carries the same count | Expert 1 |
| 2.4 | **Profile** | `/portal/profile` | The file in nine sections with a status each (Complete / to check / needed). Open **1 You and your household**: the pencil edits what he told us (employer, PAN, Nisha's visa); anything from a document shows a lock and says which ("From your Form W-2. Send a newer one to change it"). Each edit is logged and Vikram gets a task to check it. Open **6 Accounts and assets**: each asset says what income it produces ("Flat in Pune · produces rental income ₹3.6 L a year"). Open **2 Where you're resident**: days per year, open to the trips and the passport stamp | Customer 4 · Agent 6c |
| 2.5 | **Tax position** → **Money behind the position** | `/portal/assessment` | Income only, each source with where it comes from ("from Flat in Pune") | Agent 6b |
| 2.6 | **Year at a glance** → pick **2024**, then back to **2026** | `/portal/year?y=` | One year at a time: residency and income per country, the return, a one-year timeline, the month list | Customer 3c |
| 2.7 | **Documents** → click any card | `/portal/documents` | "Scanned · clean"; the whole card opens what Kiyos read → **View the document** | Customer 2c, 3a–3d |
| 2.8 | **Messages** | `/portal/messages` | The WhatsApp thread inside the dashboard (same conversation; replies reach the phone too) and the questions with Vikram beside it. **See it on your phone** opens the phone view | Agent (dashboard), 9b |

## Act 3 · Customer and expert on the same case, live (≈7 min)

Persona: **Kavita Reddy** (paid, captain **Sidhant Srivastava**). Switch with the pill top right.

| # | Do this | Where | Other side | Scope |
|---|---|---|---|---|
| 3.1 | As Kavita: Overview, Profile | `/portal/overview`, `/portal/profile` | Built from her WhatsApp answers and documents; tax "Not yet" | Customer 3d, 4 |
| 3.2 | As Kavita: **Documents** → upload one still needed | `/portal/documents` | Upload steps: **Uploaded → Scanned · clean → Reading N pages → Checked against your details**; fields with confidence | Customer 2a–2c, 3a–3d |
| 3.3 | **Sidhant's view** | `/expert/cases/8` | Case header, then tabs, **Today** first: the case picture (status per country, the case timeline, income this year), then **To review**: Kavita's questions and documents as one stack of cards, one open at a time, with a strip to jump between them | Expert 1, 3b, 3d |
| 3.4 | **Accept** a document | same | The next card comes up. Kavita: moves to Accepted, "reviewed"; briefing "Accepted …" | Expert 3d |
| 3.5 | **Tax figures and ways to save** → enter an India estimate; add a way to save | same | Kavita's **Your tax this year** fills in, marked as Sidhant's | (expert-only figures) |
| 3.6 | As Kavita: **Ask Sidhant about this** (Ways to save) or a question on **Messages** | Overview / `/portal/messages` | Ticket in **Kavita's questions**, with Kiyos's draft when her record supports one | Agent 9b · Expert 1 |
| 3.7 | As Sidhant: edit the draft → **Send answer** | `/expert/cases/8` | Kavita's WhatsApp shows the answer; briefing "Corrected …" or "Answered …" | Expert 1 |
| 3.8 | Right rail → **WhatsApp thread** | rail (≥1280 px) | Every message with author and time; **✓✓ Read / Delivered** on what was sent; "Routed to advisor · NN% confidence" | Expert 4a, 4c · Agent 9a, 10a |
| 3.9 | Open **What Kiyos uses to reply** | top of the thread | Case state from tools, last 20 messages word for word, a summary of older ones | Agent 10b, 10c |
| 3.10 | **Take over** → **As you** → send a question → **Hand back**; or **Via Kiyos** (note for Kiyos to relay) | rail | The agent pauses until handback | Expert 2, 4b |
| 3.10a | **Kavita's view** without opening WhatsApp | `/portal/overview` | Red count on the bell and on **Messages**; Overview opens with "Sidhant sent you a message" and **Reply** | Customer alerts |
| 3.10b | **Reply** → answer in Messages | `/portal/messages` | Opening Messages marks it read (the badge clears); her reply goes to the same WhatsApp thread | Agent (dashboard) |
| 3.10c | **Sidhant's view** | `/expert` → `/expert/cases/8` | The bell in the expert rail shows "Kavita Reddy replied" with her words; the case opens with "Kavita replied to your message" and **Open thread** | Expert alerts |
| 3.11 | **Case activity** tab | rail | Every step with who and when | Expert 5 |

---

## Act 4 · The expert's tools (≈5 min)

| # | Do this | Where | Say / point at | Scope |
|---|---|---|---|---|
| 4.1 | **Sign in** (bottom of the side rail) → `sidhant@kiyos.example` → any 6 digits | `/expert/signin` | Work email + one-time code; the rail shows "Sidhant Srivastava · CA · signed in". New experts: **Create an account** (`/expert/signup`, Kiyos work email only) | Expert 6 |
| 4.2 | Expert home | `/expert` | **Coming up, week by week**: one bar per week (filings, reviews, documents due), any number of customers; click a week to list its dates. Document pipeline, India status mix, what needs an expert, recent activity by customer, customers with "Replied" when one has answered | Expert 1, 3a |
| 4.3 | **Cases** → **My customers / Everyone** → Arjun Mehta | `/expert/cases`, `/expert/cases/39` | Signed in, the list opens on your own customers. On his case: the case picture, then **To review** with his overdue question first (red dot) | Expert 1, 3a–3c |
| 4.4 | **Tickets** tab (red count) | same page | The open question with Kiyos's draft and confidence, answer and resolve; answered ones below | Expert 1 · Agent 9a |
| 4.5 | **Documents**, **Cross-border profile**, **Financial life**, **Tax & compliance**, **Audit** tabs | same page | The full record, one tab each; Audit shows AI calls and every action with who and when | Agent 8 · Expert 3b, 3d, 5 |
| 4.6 | **Rules** → **Sample spreadsheet** → **Import rules** → choose it | `/expert/rules` | Every row checked: 3 valid, 1 rejected (wrong country prefix, bad tax year). **Import 3 valid rules as a new version** → "Version 1 · pending validation". Importing the same file again is refused | Agent 6a |
| 4.7 | **Agent quality** → **Run the evaluation** | `/expert/quality` | Each of the 10 questions runs against the live agent in turn. **8 of 10 pass**: the Hinglish question ("Mera RSU India mein taxable hai?") is treated as general, and "What is R.N.O.R.?" is handed off. Each failure shows a suggested fix with why | Agent 7c |
| 4.8 | **Apply fix and check again** on each | same | The agent changes (stored, listed under "Fixes applied to the agent"), the question is checked again and passes: 9, then 10 of 10. **Undo** puts it back for the next recording | Agent 7c |

---

## Scope map

✅ shown · ◐ partly / simulated · ✗ not in the prototype (by decision)

### Kiyos agent: WhatsApp and dashboard

| Scope item | | Where |
|---|---|---|
| 1a Prompt, tone, AI disclosure, citation format, refusal wording | ✅ | `/portal/whatsapp`; `api/services/converse.py` |
| 1b Welcome message | ✅ | first messages; `api/services/intake.py` |
| 2a Profile questions saved to the record | ✅ | WhatsApp intake → record (`api/continuity.py`) |
| 2b Assessment PDF after the questions | ✅ | PDF attachment in WhatsApp; Download PDF on `/portal/assessment` |
| 3a 5 free questions with a generic/personal classifier | ✅ | `/portal/whatsapp`; `classify_free_question` |
| 3b Personal questions nudged to plans | ✅ | same |
| 4a Link to the plan page | ✅ | "Compare the two plans" (secure link) → `/portal/plans` |
| 5a Upload link to the secure dashboard | ✅ | "Upload documents" (secure link) → `/portal/documents` |
| 6a Versioned rules, Excel import with validation, lookup by category | ✅ | `/expert/rules` (import → version, pending validation); `api/rules_import.py` |
| 6b Agent calls tools, never computes tax | ✅ | `converse.py`; residency from `engine/rules.py`; tax figures only from experts |
| 6c Rule and version on every answer | ✅ | "Source: … tax year …"; audit trail |
| 7a–b Answers from documents and rules, grounded | ◐ | case facts + rules; ungrounded drafts dropped; retrieval ranking not shown |
| 7c Evaluation set | ✅ | `/expert/quality`; `api/evaluation.py` |
| 8 Citations in the audit trail | ✅ | answer sources; source icons; Audit tab |
| 9a Automatic handoff with confidence and ticket | ✅ | "Routed to advisor · NN% confidence" |
| 9b Handoff on request | ✅ | "Ask {expert} about this", call requests |
| 10a Messages with author and time, takeover/handback | ✅ | WhatsApp thread on both sides |
| 10b Context: case state, last 20 messages, summary of older | ✅ | "What Kiyos uses to reply"; `api/memory.py` (also used by the agent) |
| 10c Background summarisation, per customer | ◐ | summary rebuilt as the chat grows; no retry queue in the prototype |
| 11 WhatsApp BSP / Meta | ◐ | simulated phone |

### Customer dashboard

| Scope item | | Where |
|---|---|---|
| 1a Payment magic link (token, expiry) pre-filled | ✅ | `/pay/<token>` (24 h); sent on WhatsApp |
| 1b Gateway order and payment | ◐ | simulated "Razorpay" on the pay page |
| 1c Webhooks | ✗ | not visible; activation shown |
| 1d Activation + WhatsApp confirmation; retry on failure | ✅ | activation on pay; Rahul Gupta's retry |
| 1e Pay page states: success, failure, expired, invalid, confirmation | ✅ | `/pay/<token>`, `/link?status=…`; failure via Rahul. Pending/cancelled not separate |
| 2a Upload with checks | ◐ | sample files stand in |
| 2b–c Malware scan and status | ✅ (simulated) | "Scanned · clean" in upload and on each document |
| 3a–3d Classification, extraction, status, saved with source page, duplicates skipped | ✅ (simulated extraction) | Documents; source icons; 409 on duplicates |
| 4 Profile built from conversations | ✅ | Profile |
| 5a WhatsApp OTP sign-in | ✅ | `/portal/signin` |
| 5b Magic-link sign-in | ✅ | `/m/<token>` (15 min); expired → new link on WhatsApp |
| 5c Sign-up through WhatsApp | ✅ | first message → profile |
| 5d Sign-up on the web with validation and duplicates | ✅ | `/signup` |

### Expert dashboard

| Scope item | | Where |
|---|---|---|
| 1 Tickets and open items | ✅ | `/expert`; case "Waiting on you" |
| 2 Agent pause; reply through the agent or directly | ✅ | Take over / Hand back; Via Kiyos / As you |
| 3a–3d Customer list, profile, context, documents with a viewer | ✅ | `/expert`, `/expert/cases`, `/expert/cases/[id]` |
| 4a WhatsApp-style window | ✅ | right rail |
| 4b 24-hour window and template | ✗ | dropped (happy path; product owner, 20 Nov) |
| 4c Delivery statuses | ✅ | sent / delivered / read ticks |
| 5 Audit trail | ✅ | Audit tab; Case activity |
| 6 Expert sign-in and sign-up | ✅ | `/expert/signin`, `/expert/signup` |
