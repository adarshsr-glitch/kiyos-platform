# Review 06 — Expert workspace (Home, Work, Cases, case page)

**Date:** 26 Nov 2026
**Scope:** the expert side only. Home, Work, Cases and the case page. The customer side is not in scope.
**Trigger:** on 26 Nov the product owner rejected three Home builds in a row, all made without a council pass:

1. a ranked list;
2. a board of tiles, a week grid and customer columns;
3. a grouped queue with a dot calendar.

The verdict, in their words, was "a list of things listed out individually one after the other", with no emphasised action, no landing-page feel and a calendar that can't scale. They said it looks like "Claude design" with no quality control. They added that Work, Cases and the case page have the same problem.

Read before this review: `decision-log.md`, especially:
- S-01: Phase One has a light expert dashboard.
- JX-11: product integrity.
- JX-13: residency rules are pending validation.
- JX-15 and JX-17: the expert brief and the visual workspace.
- UX-09: counts merged into the queue.

---

## Baseline (inspected 26 Nov, live data, signed out = all 11 paid customers)

| Screen | What it is today | Finding |
|---|---|---|
| Home `/expert` | A greeting, then a queue grouped by customer, then a 14-day dot calendar, a customer-mix bar, Done today, Customers owe you and Ready to file | Implemented and functional. Every item is a row of the same shape, whatever it is. |
| Work `/expert/work` | The full ranked list in four tiers | Implemented and functional. It is a list, nothing more. |
| Cases `/expert/cases` | A table of 11 rows with count chips | Implemented and functional. |
| Case page `/expert/cases/4` | Header and 8 tabs. "Up next" is rows with Mark done / Review. "Waiting on Rohit" is rows. The rail holds activity. | Implemented and functional. |

**What the data already holds, and Home never shows:**
- **Draft answers.** Every open question (ticket) has one, with a confidence and cited rules.
  - Ticket 4 (Arjun Mehta, "why RNOR?") has a grounded draft citing `IN-RES-RNOR-729DAYS`. That rule is still `pending_validation` (JX-13).
  - Tickets 6 and 7 (Arjun Rao, "$57,000") are ungrounded. The draft says Kiyos has no grounded answer.
- **Documents read field by field.** Preeti has 4 documents with 6 fields each. Arjun's payslips have 7 fields.
- **Mismatches.** Rohan told us 142 days in India, his passport shows 211, and the 182-day test result flips.
- **Sign-off readiness.** `can_sign_off` and blockers per assessment. Sign-off is refused by the API while a clarification is open.

**Actions that exist and can be used in place:**
- `resolveTicket`: answer a question.
- `reviewDocument`: accept, or ask for a new copy.
- `reviewAssessment`: sign off.
- `setItemStatus`: mark a to-do done.
- `remindCustomer`: send a reminder.

**Cost:** Home makes 1 + 2 + 4×N API calls. That is 46 for 11 customers and about 800 for 200.

**Root cause, agreed by all five:** the problem isn't the styling. Kiyos is AI-first and the agent has already done part of the work: drafted answers, read documents, found mismatches. The expert workspace throws that away and presents every record as a raw to-do in an identical row. Different kinds of work deserve different shapes. The expert's job here is to review and approve what Kiyos prepared, and the interface never says so.

---

## Individual assessments

**Design**
- Working: the data model is rich and honest (due dates, received dates, reasons).
- Not working:
  - one row shape for five kinds of work;
  - no hero and no single primary action;
  - expanding a row has no visual separation;
  - charts that encode counts as dots;
  - grey initials;
  - borders on everything;
  - every block has the same weight.
- Top three:
  1. Give each kind of work its own shape: a question shows its draft, a document shows its fields and the check result, a mismatch shows both numbers, a sign-off shows the headline and its blockers.
  2. Make Home a landing page: one branded hero with a brief composed from records and one primary action. Below it, the prepared work as rich cards, then aggregates as charts that count instead of drawing a mark per item.
  3. Turn Work into a triage workspace: a split view where the item renders on the right with its context and actions, and finishing one moves to the next.

**Architect**
- Working: every action the redesign needs already has an endpoint.
- Not working: the N×4 fan-out on Home and Work.
- Top three:
  1. `GET /experts/desk?expert=`: the queue, counts, heatmap buckets and runway, computed server-side. It's additive and read-only.
  2. The split view fetches one item's detail on demand (ticket, reading and extraction, assessment). The endpoints exist.
  3. No new write paths. Update the screen at once, then refresh. Roll back on error.

**Tax**
- Working:
  - sign-off is blocked while a clarification is open;
  - mismatches show both sources.
- Risks:
  - "prepared" must never read as "decided";
  - a draft that cites a pending-validation rule must say so;
  - accepting a document without seeing it is unsafe.
- Top three:
  1. Nothing is sent, accepted or signed off without an explicit press, with the full text or document in view.
  2. Every draft shows the rule it relies on and its status (active or pending validation). Ungrounded drafts say "Kiyos couldn't draft this".
  3. No sign-off from Home. Sign-off happens in the triage view, with the assessment, the rules and the blockers visible (C-05).

**Strategy**
- S-01 says Phase One has a *light* expert dashboard. "Light" means few features, not low quality.
- The founders' story is "Kiyos prepares, the expert approves". It is the differentiator against a CA's spreadsheet, and Home must show it.
- Top three:
  1. Lead with the prepared work and how much of it is ready to approve.
  2. Allow two charts only, each tied to a decision. The workload heatmap answers "can I take on more next week?". The filing runway answers "which deadline is at risk?". No money charts, no scatter plots, no funnels for their own sake (X-02 spirit).
  3. Sequence Home and Work triage first. Cases and the case page come after.

**PM**
- The expert's daily loop:
  1. Arrive and read what changed (the brief).
  2. Clear the work Kiyos prepared: approve or adjust.
  3. Deal with what's overdue.
  4. Check the coming weeks' load.
  5. Glance at the book.
- Each screen maps to steps in that loop: Home covers 1, 4 and 5 and launches 2 and 3. Work covers 2 and 3.
- Top three:
  1. Adopt the loop as the organising model.
  2. Write acceptance criteria per block (below).
  3. Approve a concept before any code. This is the quality gate that was missing on 26 Nov.

---

## Discussion and debate

**1. One-click actions on Home cards.**
- Design wanted "Approve & send", "Accept" and "Sign off" right on the cards. Speed is the point.
- Tax objected:
  - A document accepted from a card is accepted unseen.
  - A sign-off from a card skips the assessment.
  - A draft can be approved only if its full text and cited rule are on screen.
- Architect noted that all three endpoints are cheap to call from anywhere, so the limit is policy, not technology.
- **Resolved:**
  - Question cards may approve and send, but only after the full draft is expanded in the card, with the rule shown.
  - Documents and sign-offs open in triage.
- Design accepted: the card still saves a step, because triage opens at that item.

**2. A written brief.**
- Strategy was wary that an AI-written narrative would state something false (JX-11).
- Design wanted the brief to feel human.
- **Resolved:** the brief is composed from records by fixed sentences, for example "Arjun Rao sent payslips; Kiyos read 7 details". Each sentence links to its record, and no model writes it. Rejected: model-written prose on Home.

**3. The calendar.**
- The dot calendar was dropped by everyone, because it encodes one mark per item and stops working at about five per day.
- Design proposed a heatmap: 4 weeks × 7 days, a number in each cell, shade by load, an overdue cell, and filing deadlines marked on their week.
- Strategy asked what decision it serves. Answer: capacity ("can I take the three new customers next week?") and spotting crunch days.
- PM: clicking a cell opens Work filtered to that day.
- **Agreed.**

**4. A customer board on Home.**
- It was built and rejected on 26 Nov: unbounded, and it duplicates Cases.
- Strategy: the book view belongs to Cases. Home gets only the runway, which counts customers per stage per filing date.
- **Rejected for Home.**

**5. Endpoint timing.**
- PM wanted the concept first.
- Architect: Home at 200 customers will not load without the aggregate.
- **Resolved:** the endpoint ships in the same build as the new Home. It's small.

**6. "Done today" as a panel.**
- Strategy said cut it.
- Design: the expert needs to see progress. It becomes a counter in the hero ("3 cleared today"), not a panel.
- **Agreed.**

**7. A visual language that isn't generic.**
- Design named the tells: identical cards, a border on everything, grey avatars, 13px text throughout, no surface contrast, no motion.
- Agreed direction:
  - a brand surface for the hero (deep green, with a subtle gradient);
  - Inter Tight display numerals, as on the customer side;
  - a tinted icon tile per kind of work;
  - card variants by kind;
  - an 8px spacing grid and one radius scale;
  - motion when something expands or advances.
- Architect: put these in tokens, not one-off classes (UX-16 and UX-18).

---

## A. Overall assessment

The expert side works and is honest about its data. It fails as a product because it shows the agent's output as raw rows. The fix is a new model, "Kiyos prepares, the expert approves", expressed through four things:
- a landing page with a brief;
- type-specific cards for prepared work;
- two charts that scale by counting;
- a triage workspace.

## C. Agreed recommendations

| ID | Recommendation | Why | Priority |
|---|---|---|---|
| EX-01 | Organise the expert side around the daily loop: brief → prepared → overdue → coming weeks → book | One model for every screen | P0 |
| EX-02 | Home hero: brand surface, greeting, a brief composed from records (what changed since yesterday, each line linked), three headline numbers (overdue · ready to approve · due this week), question reply-time status (C-04), "cleared today", and one primary action, "Start triage" | Landing feel; one action | P0 |
| EX-03 | "Prepared by Kiyos" on Home: cards by kind (draft answer, document read, mismatch found, ready to sign off), capped at 6 with "+n". Honest states: ungrounded drafts say so; pending-validation rules are labelled. Questions can be approved and sent after the full draft is expanded; documents and sign-offs open in triage | Shows the differentiator; saves steps safely | P0 |
| EX-04 | Workload heatmap: next 4 weeks × 7 days, a count in each cell, shaded; customer-owed items as a second mark; an overdue cell; filing dates on their week; a click opens Work filtered | Scales to any volume; answers capacity | P0 |
| EX-05 | Filing runway: per coming filing date, one bar of customers by stage (documents outstanding / in review / ready to sign off / signed off) with days remaining | Season risk at a glance; scales | P1 |
| EX-06 | Work becomes Triage: a compact list on the left grouped by tier; the item rendered by kind on the right with context and actions; moves to the next item when one is done; keys j/k and Enter | Work happens in place | P0 |
| EX-07 | `GET /experts/desk`: queue, counts, heatmap buckets and runway, computed server-side; Home and Work make one call | Today's N×4 fan-out won't scale | P0 (ships with EX-02) |
| EX-08 | Expert visual language as tokens: hero surface, display numerals, tinted icon tiles by kind, card variants, spacing and radius scale, motion | Removes the generic look | P1 |
| EX-09 | Cases: a pipeline strip above the table (customers by stage, click to filter) and saved views (Mine, Overdue, Ready to sign off) | Book view lives here, not on Home | P2 |
| EX-10 | Case page: "Up next" items open in the same renderers as triage | One way to do a piece of work | P2 |

## Rejected

| Idea | Why |
|---|---|
| Customer board (kanban) on Home | Unbounded; duplicates Cases |
| Dot calendar; day-column week board | One mark per item doesn't scale |
| Scatter "risk matrix", funnels, money charts on Home | Novelty; no decision attached (X-02 spirit) |
| One-click document accept or sign-off from Home | Unseen acceptance; C-05 |
| Model-written brief | JX-11: facts must come from records |
| Time estimates per item | No data; would be invented |

## D. Open questions

| ID | Question | Owner |
|---|---|---|
| EQ-1 | Does an approved answer go out on WhatsApp at once, or wait for the 9–6 IST window? | Founders |
| EQ-2 | Does a lead expert see the whole team's prepared work and load (team view)? | Founders |
| EQ-3 | "Since yesterday" or "since your last visit" for the brief? A last visit needs a per-expert visit store, which doesn't exist (only per-case "expert seen") | Product owner |
| EQ-4 | May a question draft that cites a pending-validation rule be approved and sent, or must the expert rewrite it? | Sidhant (Tax) |

## E. Individual takeaways

- **Design:** shape by kind; one hero, one action; count, don't draw.
- **Architect:** one aggregate call; no new writes; fetch item details on demand.
- **Tax:** prepared isn't decided; show the rule and its status; nothing unseen.
- **Strategy:** lead with "Kiyos prepared this"; two charts, both tied to decisions; Home and triage first.
- **PM:** the loop is the spec; a concept gate before code; acceptance criteria per block.

## F. Product direction

The expert side becomes a reviewing workspace: Kiyos does the reading, drafting and checking, and the expert approves, corrects and signs. Home is where the day starts; Work is where it gets done.

## G. Immediate action plan

| # | Task | Outcome | Depends on | MVP |
|---|---|---|---|---|
| 1 | High-fidelity concept of Home and Work triage, on real data | Product owner approves or redirects | — | Yes |
| 2 | EX-07 desk endpoint | One call per page | 1 | Yes |
| 3 | EX-02, EX-03, EX-04 Home | New Home | 1, 2 | Yes |
| 4 | EX-06 triage | New Work | 1, 2 | Yes |
| 5 | EX-05 runway, EX-08 tokens | Polish and season view | 3 | Yes |
| 6 | EX-09, EX-10 | Cases and case page aligned | 4 | Later |

**Acceptance criteria (Home):**
- One primary action above the fold at 1440×900.
- Every number on Home links to the filtered records behind it.
- No block grows with the number of customers. Each one counts, or shows at most 6 with "+n".
- Every sentence of the brief links to its record.
- Nothing is sent, accepted or signed off without the full content on screen.
- Light and phone widths work, with no sideways scroll.
- One API call for the page data.

**Acceptance criteria (Triage):**
- The item renders by kind.
- When an action succeeds, the next item opens.
- Keys j/k move between items, Enter opens or acts, Esc goes back to the list.
- The list keeps its place and the filter is kept in the URL.
- The empty state says the queue is clear.

## H. Decision log changes

- EX-01 to EX-10: added, **awaiting approval**.
- Superseded by EX-01 to EX-04:
  - The 26 Nov Home builds (grouped queue, dot calendar, customer mix, panels), kept in the code until EX-03 lands.
  - UX-09 ("counts merged into the queue").
- JX-17's "portfolio Gantt, document pipeline, residency mix on Today" was already gone from Home. It stays retired.
