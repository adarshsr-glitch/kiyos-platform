# Review 02 — Customer dashboard: council strategy and enhancement plan (16 Nov 2026)

## Context

You asked the standing council for a full UX/IA review of the customer dashboard (Overview, Documents,
Profile, Tax position), ending in a strategy and roadmap. Approved as a strategy on 16 Nov 2026; each CD item still needs approval before it is built.

**What was inspected:**
- The live local portal as Arjun (paid, case 1) at 1440px and 375px.
- Every portal route and component, via a code-mapping pass over `web/src/app/portal/*` and
  `web/src/components/portal/*`.
- The production marketing site (`kiyos-webapp-olive.vercel.app`) and your `/check` screenshot.

The production customer dashboard sits behind sign-in, so it could not be opened. Its content
matches the local portal exactly: the same four tabs, the same expert ("Vikram Desai"), RNOR,
ITR-2 and 31 Jul 2027, and the same Re-upload/Confirm/Upload actions. **The local portal is
treated as the reference.**

Scope follows your constraints:
- Customer side only. The expert workspace is untouched.
- The existing build is a reference, not a blueprint.
- No cosmetic-only changes.

---

## A. Executive summary

**Current state.** Four pages, each well made on its own, that don't form one journey:
- **Overview** gives most of its space to static facts: the expert card, and two country cards about
  240px tall each. Actions are pushed below the fold on mobile, and their "why" is cut to
  "Lets us…".
- **Actions don't complete where they appear.** "Upload" navigates to Documents, where the
  customer must find the row and press Upload again. "Confirm" navigates to Profile.
- **Tax position doesn't show the tax position.** The country status (RNOR, Dual-status) appears
  only on Overview.
- **Profile mixes inputs and outputs.** It holds the derived 10-year residency strip, and its
  inline edit overwrites tax-relevant facts directly.

**Most significant problems:**

1. **The dashboard is designed as a desktop home page, but the PRD and the 13 Nov meeting make
   WhatsApp the front door.** Most visits will start from a WhatsApp deep link on a phone, aimed at
   one task. Those landings are the weakest part today.
2. **Visual weight runs opposite to importance.** Facts are large; tasks are small.
3. **Duplication without hierarchy.** Document due dates appear in "Next steps" and again in "Key
   dates". The cap of six dates pushes the most important deadline, the India return due
   31 Jul 2027, off the list entirely.
4. **Trust claims the system can't back.** "Reviewed and verified", "encrypted workspace" and
   "every access is logged". Review 01 found that files are plaintext and there is no access log.
5. **Inconsistent tax time frames.** Overview says "RNOR · FY 2026-27", while Tax position says
   "RNOR for AY 2026-27". In Indian usage AY 2026-27 is FY 2025-26, so the two screens describe
   different years.

**Key conclusions:**
- Make the dashboard **task-first and mobile-first**.
- **Every action completes where it appears**, on Overview or from a deep link.
- **Overview answers three questions, in order:** What needs me? Where do I stand? What is Kiyos
  doing, and when will I hear?
- **Detail lives in exactly one place:**
  - Tax position holds outputs.
  - Profile ("Your details") holds inputs.
  - Documents holds requests and the vault.
- **Customer-facing labels show review state, not model confidence.**

**Expected improvement:**
- A customer arriving from WhatsApp completes an upload in one tap after landing, down from three
  plus a page change.
- The first mobile screen shows what's needed and the next deadline.
- No screen claims a review or security control that doesn't exist.

---

## B. Consolidated panel discussion

The personas, as named in the brief:
- **FE:** Frontend architect
- **IA:** Dashboard and information-architecture specialist
- **UX:** Senior UI/UX expert
- **Tax:** Tax and financial domain expert
- **CF:** Co-founder and product strategy

### Evidence (observed, not opinion)

| # | Observation | Where |
|---|---|---|
| E1 | Overview order: greeting → expert card (full width, no action) → India and US cards → next steps + key dates (side column only at ≥1280px) → "Kiyos is on it" → profile card. Mobile page is 2,233px (~2.75 screens). The first mobile screen shows greeting, expert and the India card only. | `overview.tsx`; live |
| E2 | On mobile, each next-step "why" is truncated to one line (`line-clamp-1`). | live, 375px |
| E3 | Next-step rows are links. Upload goes to `/portal/documents?request=ID`, which only highlights the row; Confirm goes to `/portal/verify?change=ID`. Neither completes the action in place. | `overview.tsx` L52-91 |
| E4 | Key dates merges filing, request and topic dates; future only, cap 6. For Arjun, 4 of 6 entries duplicate next steps, and ITR-2 due 31 Jul 2027 is dropped. | `overview.tsx` L120-132; live |
| E5 | "Kiyos is on it" lists an already-answered question and shows "Next update 12 Nov" in red: a missed promise visible to the customer, with no explanation. | live |
| E6 | Profile is at `/portal/verify` and Tax position at `/portal/assessment`; `/portal/profile` returns 404. These URLs are what WhatsApp deep links would carry. | nav hrefs |
| E7 | Tax position has no country status. It shows topics with two status vocabularies (Likely / Expert review / Confirmed, and In progress / Not started / Settled). One topic's owner is the customer ("Arjun"), yet it isn't in his next steps. | `tax-position.tsx`; live |
| E8 | Overview names the lead expert only. Tax position names the India and US reviewers. Country cards say "Reviewed and verified" on a single `reviewed_by`. | `overview.tsx` L331; `tax-position.tsx` |
| E9 | Profile holds a derived 10-year residency strip and a days-in-India chart. Its inline pencil edit saves directly (`verifyProfile`) rather than creating a proposed change. | `profile.tsx` L101-107, L242-307 |
| E10 | Documents claims files are encrypted and every access is logged. Review 01: plaintext on disk, no access log. | `document-requests.tsx`; Review 01 |
| E11 | The Chat tab (mobile) is a static "conversations happen on WhatsApp" page with no WhatsApp link. The WhatsApp side panel is not rendered anywhere. | `chat/page.tsx`; `whatsapp-phone.tsx` unused |
| E12 | The plan the customer bought (inclusions, quarterly call, receipt, NDA) is reachable only by typing `/portal/upgrade`. | nav |
| E13 | Two-column layouts begin at `xl` (1280px). Header nav at `lg` (1024px). Tablets and small laptops get a stacked phone layout. | breakpoints |
| E14 | No `loading.tsx` or `error.tsx` in the portal. An API error shows Next's default error page. shadcn `ui/*` primitives go unused; buttons and pills are hand-rolled; WhatsApp hex colours sit outside the tokens. | code |
| E15 | `Notice` data exists on the case but is never shown to the customer. | `types.ts` |
| E16 | Production `/check` shows "Reviewed by licensed CAs" and "Confidence: High" on an instant automated result. The landing page shows Essential $99 / Concierge $249, unlike PRD ₹29,500 / ₹47,200, and unqualified claims ("$2,000 average savings", "95% within 2 hours"). | production site |

### Independent evaluations (condensed)

**FE.**
- *Works:*
  - Server-rendered pages on one `getCase` model.
  - A small shared kit (`kit.tsx`).
  - Upload with type and size checks.
- *Problems:*
  - Every page re-fetches `getCase` that the layout already fetched.
  - No loading or error boundaries.
  - Breakpoints chosen for 1440px only (E13).
  - Actions are links, so completion state can't be shown in context (E3).
  - Hand-rolled primitives drift from `ui/*`.
- *Reconsider:* the action pattern. One shared ActionSheet would serve Overview, Documents and
  deep links.

**IA.**
- *Works:* the merged next-steps list (profile changes + document requests + customer action
  items) is the right core object.
- *Problems:*
  - Information has no single home: due dates in two places; reviewer data in two forms.
  - Country status lives on the wrong page.
  - Profile carries outputs (E4, E7, E8, E9).
- *Missing:*
  - Plan and scope (E12).
  - Notices (E15).
  - Document-reminder timing, a customer-chosen setting decided in PRD §8.

**UX.**
- *Works:* plain language, a "why" on every request, sensible empty states on most sections.
- *Problems:*
  - The first mobile screen contains no action (E1).
  - Truncated reasons (E2).
  - Two navigations to do one thing (E3).
  - A dead Chat tab (E11).
  - 26px serif type on two-word facts makes them look like headlines.
  - Status shown in colour pills with three overlapping vocabularies.
- *Test:* would a first-time customer know what to do? On desktop, yes, after scrolling. On
  mobile, not from the first screen.

**Tax.**
- *Works:*
  - Every request explains the tax reason.
  - Figures come from documents with source and date.
  - Sensitive identifiers are masked.
- *Problems:*
  - The FY/AY inconsistency (A5) changes meaning. Validate which year Arjun's RNOR refers to.
  - "Reviewed and verified" without a jurisdiction and reviewer (E8).
  - Tax-relevant facts editable without expert recheck (E9).
  - Customer-facing confidence labels ("Likely") on recommendations like "Roll 401(k) to a
    traditional IRA before departure" read as advice. Whether that advice is correct for Arjun is
    for Sidhant to validate. The council does not endorse it.
  - The India return due date is missing from Key dates (E4).
- *Must not be lost in any simplification:* per-country status, return form and due date; who
  reviewed what; and the input → output link (facts → position).

**CF.**
- *Works:* the named expert and "replies within one business day" are the paid differentiator, and
  they are on the first screen.
- *Problems:*
  - The page sells reassurance before usefulness.
  - Customers arriving from WhatsApp hit the weakest flows.
  - Unverifiable claims (E10, E16) are the biggest brand risk in a trust category.
- *Challenge to the brief:*
  - The 13 Nov meeting deferred a "sophisticated customer dashboard" from Phase One.
  - So this redesign must make the dashboard simpler and more focused, not bigger.
  - Whatever ships in Phase One must be the pages WhatsApp links land on.

### Debates and resolutions

1. **Where do actions live? (IA vs UX vs Tax)**
   - **IA** proposed replacing Documents with a unified "To do" tab.
   - **Tax** objected: Documents is also the evidence vault (received, reviewed, rejected). The P1
     reconciliation pack needs an evidence index, so folding it into a task list loses the archive.
   - **UX** sided with Tax on the tab, but insisted tasks complete in place.
   - **Resolved:**
     - "Needs you" on Overview is the single task list.
     - Each task opens a sheet: a bottom sheet on mobile, a side sheet on desktop. The upload or
       confirmation happens inside it.
     - Documents stays as requests + vault.
     - A unified To-do tab was **rejected**.

2. **Country cards: compress or keep? (UX vs Tax vs CF)**
   - **UX** wanted to collapse them into one status sentence.
   - **Tax:** that loses per-jurisdiction return form and due date, which customers act on.
   - **IA:** the full detail belongs on Tax position; Overview needs a summary.
   - **Resolved:**
     - Overview gets a compact "Your position" block, one row per country: status · year · return ·
       due · stage.
     - The full country panels move to the top of Tax position.
     - Both use one data source (`country_status`).

3. **Expert card: shrink or keep? (UX vs CF)**
   - **UX:** a full-width card with no action wastes the most valuable screen space.
   - **CF:** the named expert is why customers pay. Don't bury them.
   - **Resolved:** a compact expert chip that is actionable.
     - **Mobile:** one line under the greeting ("Vikram Desai · your lead expert · replies in 1
       business day"). Tapping it opens a team sheet with India and US reviewers, "Message on
       WhatsApp" and "Book your quarterly call".
     - **Desktop:** the top of the side panel.
     - Hiding the expert on mobile was **rejected**.

4. **Key dates timeline (UX vs IA vs FE)**
   - **UX** proposed a horizontal desktop timeline.
   - **IA:** six or fewer dates, mostly duplicates. A timeline adds width without information.
   - **FE:** horizontal timelines don't transform to mobile.
   - **Resolved:**
     - "Upcoming deadlines" lists **statutory and filing dates only**. Document due dates stay on
       their task rows.
     - Filing deadlines are never dropped by a cap.
     - Vertical list; mobile shows the next 3 with "See all".
     - The horizontal timeline was **rejected** until the filing workflow (P1) produces real
       milestones.

5. **"Kiyos is on it" (CF vs Tax vs FE)**
   - **CF:** this is the "silence is a defect" principle and must stay.
   - **Tax:** an answered question listed as in progress, and a red past date, teach customers our
     dates mean nothing (E5).
   - **FE:** an overdue state needs SLA data, which Review 01 R-07 is adding.
   - **Resolved:** rename it "With Kiyos".
     - Answered items leave the list. A "Recently answered" link goes to Tax position.
     - An overdue next update reads "Update overdue — {lead} has been alerted". This copy may only
       ship once R-07 alerts really fire. Until then, show no red.

6. **Confidence vs review state (IA vs Tax)**
   - **IA** wanted confidence chips on Overview for transparency.
   - **Tax:** confidence is internal routing (Review 01 R-05). Customers need to know whether a
     human reviewed it.
   - **Resolved:** customer-facing labels use one vocabulary on every page:
     - Needs you
     - Being worked on
     - Reviewed by {name}, {qualification}, {date}
     - Not yet reviewed

     Confidence chips are removed from the customer side.

7. **Profile edits (UX vs Tax)**
   - **UX** likes the inline pencil.
   - **Tax:** a changed move date can change residency. It must be a proposal the expert rechecks,
     which the system already supports for WhatsApp changes (`/profile-changes`).
   - **Resolved:**
     - Editing a tax-relevant fact creates a proposed change, shown as "Waiting for {lead} to
       check".
     - Non-tax details (for example a display name) may save directly.
     - Which facts count as tax-relevant needs Sidhant's sign-off (OQ-5).

8. **Residency history placement (IA vs Tax)**
   - **IA:** the 10-year strip is an output and should move to Tax position.
   - **Tax:** agreed, but days in India per year are inputs the customer supplies.
   - **Resolved:**
     - Day counts and move dates stay in Your details.
     - The derived residency history moves to Tax position under India.

9. **Mobile vs desktop priority (UX vs CF vs FE)**
   - **UX** wanted desktop and mobile designed equally.
   - **CF:** arrivals are from WhatsApp, so mainly phone.
   - **FE:** design mobile first; desktop adds a side panel at ≥1024px rather than a different
     page.
   - **Resolved:** mobile-first for every page. Desktop = the same order plus a context side
     panel.

10. **Chat tab (CF vs UX)**
    - **Resolved:** remove the Chat tab.
    - Add a persistent "Message Kiyos on WhatsApp" action: in the header on desktop and in the
      expert sheet on mobile.
    - A conversation-history view comes later (P3), once the real channel exists.

11. **First-visit and returning experience (CF vs FE)**
    - **CF** wanted "Since your last visit: 2 documents accepted, 1 answer reviewed".
    - **FE:** there is no last-visit store. That's new data.
    - **Resolved:**
      - A first-visit variant ships now: the expert intro sheet opens once, plus a header
        sentence: "Here's what we need first, and when you'll hear from us."
      - The "since last visit" digest is P3.

### Unresolved (need validation): see OQ-1 to OQ-7 in section I.

---

## C. Revised information architecture

**Primary navigation** (4 items):

| Item | Purpose | Notes |
|---|---|---|
| **Home** | What needs me, where I stand, what Kiyos is doing, upcoming deadlines | Replaces "Overview" |
| **Documents** | Requested documents + received vault | Unchanged role; tasks also completable from Home |
| **Tax position** | Outputs: country status, reviewed conclusions, your tax questions, residency history | Gains the country panels |
| **Your details** | Inputs: household, move and travel, income, accounts and assets, identity, change history | Renamed from "Profile"; loses derived residency |

- **Secondary navigation** (avatar menu):
  - **Plan and scope:** what's included, filing units, quarterly call, receipt, NDA.
  - **Reminder settings:** document-reminder timing (PRD §8 decision).
  - **Sign out.**
- **Removed:** the Chat tab, and the standalone profile-freshness card (folded into Home tasks and
  the Your details header).
- **Routes:** `/portal/home`, `/portal/documents`, `/portal/tax-position`, `/portal/details`,
  `/portal/plan`.
  - Old `/portal/dashboard`, `/portal/verify` and `/portal/assessment` redirect to the new routes.
    Deep links already sent must keep working.
  - Free and onboarding routes (`welcome`, `signin`, free `assessment` risk map, `upgrade`) are out
    of scope and unchanged.

**Overview vs. section rule:** Home shows **summaries and tasks only**. Every fact on Home is a
one-line summary that links to its single home. No block on Home appears in full anywhere else,
and vice versa.

---

## D. Customer journeys

1. **First visit after payment** (from the WhatsApp "your workspace is ready" link):
   - Home opens with the expert intro sheet, once: lead expert, India and US reviewers, the
     response promise, and what happens next.
   - Then "Needs you" shows the first 1–3 requests.
   - *Removed:* the old greeting → cards → scroll path.

2. **Deep link to a document** ("Where do I send my Schwab 1099?"):
   - `/portal/documents?request=ID` opens the upload sheet for that item directly.
   - The sheet shows what, why, accepted formats and what happens next.
   - Pick file → uploaded → the sheet confirms: "Received. {lead} will check it by {date}. Nothing
     else needed now."
   - *Before:* landing → find row → Upload (3 steps). *After:* one tap to the picker.

3. **Confirm a change from WhatsApp:**
   - `?change=ID` opens a confirm sheet: on file → you told us → what it affects → Confirm / That's
     not right.
   - Then: "{lead} will recheck your day count by {date}."

4. **Returning visit:** Home leads with "Needs you" (or "Nothing needs you right now"), then the
   position summary, With Kiyos and deadlines.

5. **Understand my position:** Home summary row → Tax position.
   - Country panel: status, one plain sentence of meaning, return, due, reviewer per jurisdiction.
   - Then reviewed conclusions, then open questions.

6. **Review my details:** pending changes first, then groups; tax-relevant edits become proposals.

7. **Track filing and deadlines:**
   - Home shows upcoming deadlines (filing dates always present).
   - Tax position country panels show return and stage.
   - A full filing timeline waits for the P1 filing workflow.

---

## E. Home (Overview) redesign

**Mobile order** (desktop main column uses the same order):

1. **Header:** "Good afternoon, Arjun". Below it, a status line: "2 things need you · next deadline
   20 Nov". Then the compact expert chip (Debate 3). The plan label moves to the avatar menu.
2. **Needs you (primary).** Action rows sorted by urgency, then due date. Each row shows:
   - **What:** the title.
   - **Why:** full text, not truncated. Wraps to 2 lines on mobile; long ones show more on tap.
   - **When:** due date in absolute and relative form.
   - **The action**, which opens a sheet.

   After completion the row shows its outcome for that session, then moves to With Kiyos. Show up
   to 5 rows; past that, "See all". Empty state: "Nothing needs you right now. We'll message you
   on WhatsApp when something does."
3. **Your position:** one block, two rows (India, US): status · year · return · due · stage. The
   whole block links to Tax position. No serif display type for values.
4. **With Kiyos:** owner initials, what, next update. Only open items (Debate 5).
5. **Upcoming deadlines:** statutory and filing dates only, never capped out. Next 3 on mobile.

**Desktop (≥1024px):**
- **Main column** (≈2/3): items 1–4.
- **Side panel** (≈1/3, sticky): expert panel with team and actions, upcoming deadlines, and
  "Message on WhatsApp".

**Removed from Home:**
- The full-width expert card.
- Two large country cards.
- The profile freshness card.
- Duplicated document dates.

---

## F. Section redesign

**Documents**
- *Purpose:* give Kiyos what it needs; see what it has.
- *Primary:* "Needed" sorted by due date. A rejected item shows its reason first. Each row: title,
  why, country, due, action.
- *Secondary:* "Received", showing status (Checking → Accepted / Needs a new copy) with who checked
  it and when; then other files; then "Upload something else".
- *Interactions:*
  - The shared upload sheet: drag-and-drop on desktop, camera or file picker on mobile.
  - Deep link `?request=` opens the sheet directly.
- *Copy:* claim only what's true. Replace "encrypted… every access logged" with true statements
  until R-08 lands.
- *Mobile:* single list; Received collapses under a count. *Desktop:* Needed in the main column,
  Received in the side panel.

**Tax position**
- *Purpose:* where I stand in each country, and why.
- *Top:* India and US panels (moved from Home). Each has:
  - status, with one plain-language line of meaning;
  - tax year in a single FY/AY convention (OQ-2);
  - return form and due date;
  - reviewer name, qualification and date, or "Not yet reviewed".
- *Then:*
  - **Reviewed conclusions:** signed-off answers to the customer's questions, each with the
    reviewer per jurisdiction.
  - **Open questions:** topics being worked on, with owner and next update.
  - **Residency history:** derived; moved here from Profile.
- *Removed:*
  - Customer-facing confidence chips.
  - The double status vocabulary.
  - The customer listed as a topic owner. If the customer owes an action, it belongs in Needs you.
- *Cross-border line:* only from reviewed content. No auto-generated treaty statements (unlike
  production `/check`, E16).
- *Mobile:* panels stack; topic rows expand in place; owner and status visible, not hidden.
  *Desktop:* panels side by side.

**Your details (Profile)**
- *Purpose:* the facts Kiyos uses, with where each came from.
- *Top (only when present):* pending changes.
- *Groups:*
  - You and household
  - Move and travel: dates and days in India per year, as inputs
  - Work and income
  - Accounts and assets: the existing financial picture
  - Identity: masked
- *Each fact:* value · source · date.
- *Edits:* tax-relevant edits create a proposal (Debate 7).
- *"Everything's correct":* kept, with a line saying what confirming does.
- *Change history:* collapsed.
- *Mobile:* groups as collapsible sections, with the first two open. *Desktop:* two columns.

**Plan and scope** (avatar menu; the existing `CurrentPlan` reused)
- What was bought.
- Inclusions and exclusions.
- Filing units.
- Quarterly call (with a "Book" action).
- Receipt.
- NDA and consent dates.

---

## G. Responsive specification

| Breakpoint | Navigation | Layout |
|---|---|---|
| <768px | Bottom tab bar, 4 tabs; avatar menu in header | Single column, mobile order |
| 768–1023px | Top nav (4 items) + avatar menu | Single column, max ≈720px, wider rows |
| ≥1024px | Top nav | Main (≈2/3) + sticky side panel (≈1/3), content max ≈1200px |

Component transformations:

| Component | Mobile | Desktop |
|---|---|---|
| Task sheet | Bottom sheet | Right side sheet |
| Expert | One-line chip → team sheet | Side-panel card with actions |
| Your position | Stacked rows | Two columns within one block |
| Deadlines | Next 3 + "See all" | Full list in side panel |
| Received documents | Collapsed under a count | Side panel |
| Topic detail | In-place expand, India and US stacked | In-place expand, India and US side by side |
| Residency history | Compact list | Strip |
| Details groups | Collapsible | Two columns, open |

**Rules for both:**
- Touch targets ≥44px.
- Nothing essential hidden by `hidden sm:block` (fixes the hidden owner column).
- No horizontal scroll.

---

## H. Design system and interaction guidelines

- **Typography:**
  - Serif (Playfair) for the page title only.
  - Everything else in Inter, with tabular figures for amounts and dates.
  - Scale: 28 / 20 / 16 / 14 / 12. No text below 12px. The current 10–11.5px meta text fails
    legibility.
- **Spacing:**
  - 4px base.
  - Card padding 16px on mobile, 20px on desktop.
  - Row min-height 56px.
  - Section gap 24px.
- **Density:** one section = one job. Lists over cards for repeated items. Cards only for distinct
  blocks.
- **Buttons:**
  - One primary action per region.
  - Row actions as secondary buttons with verb labels: "Upload 1099-B", not "Upload →".
  - Consolidate on `components/ui/button` variants.
- **Status:**
  - One `Status` component with the vocabulary from Debate 6.
  - Always text plus icon, never colour alone.
  - Four tones: needs you, in progress, done or reviewed, problem.
- **Upload component:**
  - States: what and why · picker or drag-drop · progress · success (what happens next) · error
    (reason and retry).
  - Shows accepted formats.
  - Duplicate detection message.
- **Forms:**
  - Proposals instead of overwrites for tax facts.
  - Inline validation.
  - Never collect identifiers in WhatsApp-linked flows beyond the masked identity section.
- **Empty states:** each section says what will appear and when. Add the missing ones (With Kiyos,
  Household).
- **Loading:** section-level skeletons via `loading.tsx` per route, using `ui/skeleton`.
- **Error:** section-level failure with retry. A route `error.tsx`, never Next's default page.
- **Feedback:** keep toasts for transient confirmation. Persistent outcomes show on the row or in
  the sheet.
- **Accessibility:**
  - Contrast on muted text.
  - Focus rings.
  - Sheets trap focus and close on Escape.
  - Dates as absolute + relative.
  - Statuses announced (aria).
- **Tokens:**
  - Move the WhatsApp hex colours into tokens.
  - Map `rounded-2xl` / `rounded-full` usage onto `--radius`.
  - Keep the brand serif for page titles only. Drop the production `/check` habit of oversized
    cards for small data.

---

## I. Prioritisation

| ID | Problem | Solution | Impact | Depends on | Pri | Size |
|---|---|---|---|---|---|---|
| CD-01 | Unverifiable claims (E8, E10) | Per-jurisdiction "Reviewed by…" or "Not yet reviewed"; true security copy | Trust; legal exposure | R-06 data fields | **P0** | S |
| CD-02 | Actions don't complete in place (E3) | Shared task sheet: upload and confirm from Home and deep links | Core task completion | — | **P0** | M |
| CD-03 | Mobile first screen has no action; reasons truncated (E1, E2) | New Home order; full "why" | Mobile usability | CD-02 | **P0** | M |
| CD-04 | Deadlines duplicate tasks and drop the ITR date (E4) | Deadlines = filing and statutory only, never capped out | Correct deadlines | — | **P0** | S |
| CD-05 | FY/AY inconsistency | One convention everywhere | Tax accuracy | OQ-2 | **P0** | S |
| CD-06 | Profile edits overwrite tax facts (E9) | Edits → proposals via `/profile-changes` | Tax accuracy, audit | OQ-5 | **P0** | M |
| CD-07 | Dead Chat tab (E11) | Remove; WhatsApp action in header and expert sheet | Navigation | WhatsApp number | **P0** | S |
| CD-08 | Country status on the wrong page; duplicated reviewer info (E7, E8) | Position summary on Home; full panels on Tax position | IA coherence | CD-01 | P1 | M |
| CD-09 | Two status vocabularies; confidence shown to customers (E7) | One status vocabulary; remove confidence chips | Clarity, advice boundary | — | P1 | M |
| CD-10 | Residency output in Profile (E9) | Move to Tax position; rename Profile to Your details | IA | CD-08 | P1 | S |
| CD-11 | Plan not reachable (E12) | Avatar menu → Plan and scope (reuse `CurrentPlan`) | Scope clarity (PRD §10) | — | P1 | S |
| CD-12 | Breakpoints wrong for 768–1279px (E13) | Top nav ≥768; two-column ≥1024 | Tablet and laptop | — | P1 | S |
| CD-13 | No loading or error states (E14) | `loading.tsx` / `error.tsx` + section skeletons | Robustness | — | P1 | S |
| CD-14 | Route names don't match labels (E6) | New routes + redirects | Deep-link clarity | — | P1 | S |
| CD-15 | "Kiyos is on it" shows answered and stale items (E5) | "With Kiyos": open only; overdue copy after R-07 | Honest status | R-07 | P1 | S |
| CD-16 | Expert card large and inert | Compact chip + team sheet + side panel | Space; actionable trust | CD-03 | P1 | S |
| CD-17 | Hand-rolled primitives, token drift (E14) | Status, Button, Sheet, Skeleton on `ui/*`; tokens | Consistency | — | P2 | M |
| CD-18 | Type scale and legibility | Serif for titles only; ≥12px | Readability | CD-17 | P2 | S |
| CD-19 | Missing empty states; accessibility gaps | Per guidelines in H | Polish, accessibility | CD-17 | P2 | S |
| CD-20 | Reminder timing not settable | Reminder setting in the avatar menu | PRD §8 decision | OQ-4; backend field | P2 | M |
| CD-21 | Notices invisible (E15) | Notice banner on Home when present | Urgency | P1 notice module | P3 | M |
| CD-22 | No progress digest | "Since your last visit" | Engagement | Last-visit store | P3 | M |
| CD-23 | No conversation history | WhatsApp thread view | Continuity | Real channel live | P3 | L |
| CD-24 | No filing timeline | Pre-file, approve, filed, receipt | Filing journey | Filing workflow (P1 PRD) | P3 | L |

**Rejected in this review:**
- A unified To-do tab replacing Documents.
- A horizontal desktop timeline.
- Charts on Home.
- Confidence chips for customers.
- Hiding the expert on mobile.
- A guided tour on first visit.

### Open questions

| ID | Question | Owner |
|---|---|---|
| OQ-1 | The 13 Nov meeting deferred a "sophisticated customer dashboard". Confirm Phase One ships P0 only (the pages WhatsApp links land on), with P1 after. | Founders |
| OQ-2 | Arjun's RNOR: FY 2026-27 or AY 2026-27? Which convention do we display (suggest FY, with AY in brackets beside the ITR)? | Sidhant |
| OQ-3 | Production shows Essential $99 / Concierge $249; the PRD says Advisory ₹29,500 / Full service ₹47,200. Which plan names and prices appear in Plan and scope? | Founders |
| OQ-4 | Where does the customer set document-reminder timing: WhatsApp, the dashboard, or both? | Founders |
| OQ-5 | Which facts are tax-relevant (edit = proposal) vs. freely editable? | Sidhant |
| OQ-6 | Reviewer qualifications to show per jurisdiction (CA / CPA / EA), and whether named reviewers are real people for the demo. | Founders |
| OQ-7 | Out of scope but urgent: production `/check` and the landing page carry unverified claims (E16). Route to founders and Hena's claims review (PRD §2). | Founders |

---

## J. Implementation roadmap

| Phase | Work | Output | Depends on | Est. |
|---|---|---|---|---|
| 1. Decisions | OQ-1, OQ-2, OQ-5 (blocking P0); OQ-3, OQ-4, OQ-6 | Answers logged | Founders, Sidhant | 2–3 days |
| 2. IA sign-off | Section C nav, routes and single-home rule | Approved IA | Phase 1 | — |
| 3. Wireframes | Mobile first: Home, upload sheet, confirm sheet, Tax position, Your details; then desktop side panel | Low-fi frames | Phase 2 | 2–3 days |
| 4. Design | Desktop + mobile for 4 pages + avatar menu, all states | Hi-fi | Phase 3 | 3–4 days |
| 5. Components | `Status`, `ActionRow`, `TaskSheet` (upload/confirm), `PositionSummary`, `ExpertChip` + `TeamSheet`, `DeadlineList`, section skeletons, built on `components/ui/*` | Shared kit | Phase 4 (P0 parts can start after 3) | 3 days |
| 6a. FE — P0 | CD-01 to CD-07 | Task-first mobile Home; honest labels | Phase 5 | ~1 week |
| 6b. FE — P1 | CD-08 to CD-16 | Coherent IA, routes, states | 6a | ~1 week |
| 6c. FE — P2 | CD-17 to CD-20 | Design-system consistency | 6b | ~3–4 days |
| 7. Validate | Viewports 375 / 768 / 1024 / 1440; the journeys in D; council follow-up review | Verified | each FE phase | ongoing |

**Files the implementation would touch** (later, after approval):
- `web/src/app/portal/*` (routes, `loading.tsx`, `error.tsx`, redirects)
- `web/src/components/portal/overview.tsx`, `document-requests.tsx`, `profile.tsx`,
  `tax-position.tsx`, `portal-nav.tsx`, `kit.tsx`
- `web/src/app/portal/portal-shell.tsx`
- `web/src/app/globals.css` (customer tokens only; the `.workspace` scope stays untouched)

**Code to reuse:**
- `listDocumentRequests`, `uploadDocument`, `listProfileChanges`, `decideProfileChange`
  (`web/src/lib/api.ts`)
- `CurrentPlan` (`plan-checkout.tsx`)
- the `?request=` and `?change=` highlight logic
- `components/ui/*` (dialog/sheet, button, skeleton)
- the todo merge in `overview.tsx` L52-91

**Regression risks:**
- `kit.tsx` and `portal-shell.tsx` are shared with the free and onboarding pages (risk map, plan
  checkout, sign-in), which must not change.
- Old routes must redirect, because WhatsApp messages carry them.
- The `ViewToggle` and expert routes share `globals.css`. Re-check the expert home after any token
  change.

### Decision and recommendation log

Recorded in [`../decision-log.md`](../decision-log.md) under CD-01 to CD-24 and OQ-1 to OQ-7.

### Wireframes (16 Nov 2026)

Phase 3 started, mobile first, on Arjun's seeded data: [Kiyos customer dashboard wireframes](https://claude.ai/artifact/EpjgHK1HizrtsJrfXJdEYa) (private until shared).
- **Mobile:** Home, upload sheet (from a WhatsApp link), upload received, confirm a change.
- **Desktop:** Home with a side panel.

Added the same day: mobile Documents, Tax position, Your details, and Plan and scope (avatar menu).
- Tax position shows only sign-offs the data records. The US side and the Pune rental answer read
  "Not yet reviewed", and unreviewed conclusions are not shown at all.

Then desktop versions of all four. Same content and order as mobile; the extra width goes to:
- Side panels: what Kiyos has (Documents), the residency strip (Tax position), and records and
  settings (Plan and scope).
- India and US side by side (Tax position).
- Two open columns (Your details).

Then eight mobile states:
- Home: first visit (team intro sheet), nothing needs you, loading, and one section failed.
- Uploads: upload in progress, and upload failed (file too large; other errors described in a note).
- Empty pages: Documents with nothing needed, and Tax position not yet worked out.

Not yet drawn: the tablet layout (768–1023px).
