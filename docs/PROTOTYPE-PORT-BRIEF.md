# Kiyos: Porting the Best of the Prototype into the Platform

> **What this document is**: A self-contained implementation brief for bringing the best UX, interaction design, and product patterns from a standalone front-end prototype into the existing Kiyos platform. The platform is a working full-stack application (Next.js 14 + FastAPI + SQLite). The prototype is a separate Vite + React 19 app with no backend (all mock data in memory). This document describes what the prototype does well, where the platform is stronger, and exactly what to build to combine both.

---

## Table of Contents

1. [Current Platform Architecture (what you're working with)](#1-current-platform-architecture)
2. [What the Prototype Gets Right (and the platform lacks)](#2-what-the-prototype-gets-right)
3. [Workstream A: The Block System](#workstream-a-the-block-system)
4. [Workstream B: In-App Conversation](#workstream-b-in-app-conversation)
5. [Workstream C: Unified Request Queue for Customers](#workstream-c-unified-request-queue)
6. [Workstream D: Richer Customer Home](#workstream-d-richer-customer-home)
7. [Workstream E: Tax File Page](#workstream-e-tax-file-page)
8. [Workstream F: Expert Workspace Upgrades](#workstream-f-expert-workspace-upgrades)
9. [Workstream G: Design Token Refinements](#workstream-g-design-token-refinements)
10. [Implementation Order](#implementation-order)
11. [What NOT to Change](#what-not-to-change)

---

## 1. Current Platform Architecture

### Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), Lucide icons, Sonner toasts.
- **Backend**: FastAPI (Python), SQLAlchemy async on SQLite, Anthropic Claude for chat.
- **Two workspaces**: Customer portal (`/portal/*`) and Expert workspace (`/expert/*`), each with their own layout and theme.

### Key Frontend Patterns
- **Server Components** for data fetching; **Client Components** for interactive UI.
- `CustomerContext` provides `caseData`, `tier`, `firstName` to all portal pages.
- `ViewContext` stores "expert vs customer" toggle in localStorage.
- Mutations hit the FastAPI backend, then `router.refresh()` to revalidate server components.
- Chat polling: `ChatPanel` / `WhatsAppPhone` poll the conversation API every ~4 seconds.
- `TaskSheet` / `SideSheet` for in-place task completion (confirm a fact, upload a document).

### Key Backend Models
The backend provides these domain objects (defined in `web/src/lib/types.ts`):

- **CaseDetail**: The central record. Contains `facts[]`, `documents[]`, `assessments[]`, `members[]`, `topics[]`, `recommendations[]`, `action_items[]`, `notices[]`, `scenarios[]`, plus `conversation_id`, `plan`, `journey`, `stage`, `country_status`, `reviewers`.
- **Ticket**: Agent flagged a low-confidence answer for expert review. Has `question`, `draft_answer`, `confidence`, `cited_rules`, `status` (open/resolved), `sla_due_at`.
- **ProfileChange**: Proposed fact update from chat. Has `fact_key`, `proposed_value`, `previous_value`, `source`, `quote`, `affects`, `status` (proposed/confirmed/rejected).
- **DocumentRequest**: Expert asks customer for a document. Has `title`, `why`, `country`, `doc_type`, `status` (pending/received/reviewed/rejected), `due_date`.
- **ActionItem**: Something someone must do. Has `title`, `assignee` (customer/kiyos/advisor), `status`, `due_date`.
- **TaxTopic**: A tax question being worked. Has `title`, `india_position`, `us_position`, `conclusion`, `confidence`, `status` (open/in_progress/resolved), `next_action`.
- **Message**: A chat message. Has `role` (user/assistant/advisor/system), `content`, `confidence`, `cited_rules`, `category`, `action` (CTA), `options` (quick replies).
- **InitialScan**: Free assessment. Has `answers`, `rows[]` (risk areas), `confidence`, `household`, price range.
- **Residency** (from `lib/residency.ts`): Year-by-year India/US status with rule tests, stays, facts, pending changes. Computed by the rules engine.
- **Brief** (from `lib/residency.ts`): Expert's case brief. Has `review_status`, `discrepancies`, `gaps`, `suggested_requests`, `sign_off_blockers`, `evidence_rows`.
- **PictureItem** (from `lib/financial-picture.ts`): Derived from facts. Each item is an income source or holding, split by country, with label, amount, currency, source, category.

### Current Data Derivation
The platform already computes several things from raw facts:
- `pictureFromFacts(facts, members)` → `PictureItem[]` (income + holdings by country)
- `explainSplitYear(items, facts)` → adds "move year" context to salaries
- `positionOf(caseData, residency, code)` → per-country tax position
- `estimatesOf(facts)` → tax estimates from structured facts
- `byCategory(items, section, country)` → grouped amounts for charts

### Current Portal Navigation (premium tier)
Overview → Profile → Tax position → Year at a glance → Documents

### Current Expert Case Page Layout
- Breadcrumb header with perspective switch
- Main content (scrollable): customer info → waiting items → case picture → brief → topics → full record
- Right rail (340px, xl+): tabs for "Case activity" and "WhatsApp thread"

---

## 2. What the Prototype Gets Right

The prototype was built by a product designer to explore ideal interactions without backend constraints. It has several patterns that the platform should adopt:

### 2A. The Block System (the biggest win)
The prototype has a **universal vocabulary of UI blocks** — 20+ types — that are used everywhere: Home, Tax File, Income, Assessment, agent replies, expert case view. Pages don't build bespoke widget trees; they compose arrays of typed `Block` objects and hand them to one renderer (`BlockStack` → `BlockView`).

This matters because:
- **Visual consistency**: every surface speaks the same language.
- **Composability**: pages are thin — they compute `Block[]` from data, the renderer does the rest.
- **AI compatibility**: if the agent generates structured blocks, they render identically to page content.
- **Expert reuse**: the same blocks render in the customer and expert views, with `forExpert()` stripping edit affordances and adding cite-to-reply.

### 2B. In-App Chat with Dual-Channel Semantics
The prototype has a full in-app conversation (`ChatThread`) that is **the same thread as WhatsApp**. Messages carry their channel (`web` | `whatsapp`), and web messages echo to WhatsApp during the 24-hour window. This is important because:
- Premium customers spend time in the dashboard; forcing them to WhatsApp for every question is friction.
- The dashboard can embed rich UI in chat (proposal cards, request tags) that WhatsApp cannot.
- The expert always sees one thread, regardless of where the customer typed.

The current platform removes the chat tab entirely for premium customers ("WhatsApp from header"). This is a mistake for engaged customers who are already in their workspace.

### 2C. Unified Request Model for Customers
The prototype has **one `Request` type** that covers everything waiting on someone: questions for the expert, answers being verified, file changes needing approval, and things the expert needs from the customer. Each has a single state: `you` | `ananya` | `done`.

The platform has four separate backend types (Ticket, ProfileChange, DocumentRequest, ActionItem) with different lifecycle states. Customers shouldn't need to understand this taxonomy. They need one queue: "what's waiting on me" and "what's with my expert".

### 2D. Richer Home Page
The prototype's Home packs much more into one view:
- **Briefing** ("Since your last visit"): what Ananya did since the customer last logged in.
- **Needs you**: everything waiting on the customer (questions, documents, fact confirmations) in one list.
- **Tax position**: estimated tax by country, with effective rates, amounts paid, amounts left, and progress bars.
- **Income**: by country, by source, with amounts.
- **Ways to save**: estimated savings opportunities (with amounts!), each linked to a request or askable question.
- **Deadlines**: coming up, with days remaining.
- **Your file**: completeness percentage.
- **With Ananya**: what she's working on + new answers.
- **Residency**: status and countdown.

The platform's Overview has: wealth picture, country position, needs-you, case work, and engagement track. It's missing the tax position with rates, income breakdown, savings estimates, deadlines, file progress, and the "since last visit" briefing.

### 2E. Tax File as a First-Class Page
The prototype has a dedicated `/tax-file` page showing 9 sections of the household's financial profile, each with:
- Labelled facts with values, sources, and statuses (confirmed, likely, missing, conflict, review).
- `SourceRef` popovers showing the exact excerpt from a document or chat message.
- Proposed changes inline (agent proposed → customer confirms → expert approves high-impact).
- A "full file on one page" view for printing/PDF export.

The platform's Profile page is simpler: it shows proposed changes from WhatsApp and a confirm/reject flow, but doesn't present the full structured file.

### 2F. Expert Conversation-Centric Workflow
The prototype's expert case view keeps the **conversation visible on every tab**, not behind a tab in a right rail. The expert can:
- **Cite from fact**: click "Use in reply" on any field or document to drop it into the draft with its source.
- **Reply through Kiyos**: write a note → Kiyos drafts a customer-facing message → expert edits and approves.
- **Take over**: pause the agent and reply directly, then hand back.
- **Resolve requests inline**: the request appears above the composer with the right actions (verify, correct, answer, book call, approve, reject, remind).
- **NextUp**: after resolving, the panel offers the next item in the queue.

### 2G. Design Details
The prototype uses:
- **Tabular nums everywhere money appears** (`font-variant-numeric: tabular-nums`).
- **`Figure` component**: large numbers with raised smaller decimals (Mercury style).
- **`CountryChip`**: text "India" / "US" in a neutral chip, never flag colors (accessible, doesn't conflate nationality with tax jurisdiction).
- **`ProgressRing`**: for file completeness.
- **Sparkles icon = AI**: consistent across all surfaces.
- **`Eyebrow`**: mono uppercase labels on cards (Origin style).
- **Source popovers**: hover to see the exact document page and highlighted excerpt.
- **Print stylesheet**: for the full tax file.

---

## Workstream A: The Block System

### What to Build
A block rendering system in `web/src/components/blocks/` with these files:

1. **`types.ts`**: Block type definitions
2. **`block-view.tsx`**: Client component that renders one block by type
3. **`block-stack.tsx`**: Renders an array of blocks with staggered fade-in
4. **`block-frame.tsx`**: Universal card chrome (border, label, status, ask button, collapse, lock)
5. **`block-charts.tsx`**: Chart renderers (waterfall, radar, threshold, projection, horizon)

### Block Types to Implement (in priority order)

**Phase 1 — Core (covers Home, File, Expert)**:
- `group`: A card holding several blocks, optionally 2-column, with switchable views.
- `stats`: Key metrics with optional progress bars. Each `StatItem` has `label`, `value` or `usd`, `sub` text, optional `delta`, optional `progress` (0-100).
- `list`: Rows with title, detail, meta, value, tag, country, action. Supports tabs, max-height with scroll, empty state.
- `fields`: Key-value facts with plain label, optional technical `term`, `info` tooltip, value, source, status badge, proposed change, edit affordance.
- `summary`: A hero block with title, bullet points, and action buttons. Uses a soft AI gradient background.
- `callout`: Tone-coloured card (ai/risk/neutral) with title, body, optional tag and actions.
- `text`: Simple text body.
- `timeline`: Steps with `done`/`now`/`next` states.
- `actions`: A row of action buttons.

**Phase 2 — Charts (covers Tax Position, Income)**:
- `trend`: Line chart with series by country.
- `split`: Segmented bar showing country split.
- `bars`: Bar chart rows with optional country parts.
- `waterfall`: Start → plus/minus steps → total.
- `grouped`: Dual-country bars per row.
- `threshold`: Line against a threshold (e.g. residency day count vs. 182 days).
- `projection`: Actual (solid) + projected (dashed) area chart.
- `radar`: Spider chart.
- `horizon`: Goals on a time axis.

**Phase 3 — Interactive**:
- `table`: Rows and columns with typed cells.
- `choice`: Multiple choice with dispatch event.

### The `BlockAction` System
Every block can carry actions. An action is one of:
```typescript
type BlockAction =
  | { label: string; kind: "navigate"; to: string; primary?: boolean }
  | { label: string; kind: "ask"; prompt: string; primary?: boolean }  // opens chat with this prompt
  | { label: string; kind: "event"; event: string; value?: string; primary?: boolean }  // dispatches to context
```

The "ask" kind is important: it means any card can have a "Ask Kiyos about this" button that opens the chat pre-filled with a contextual question. Implement this with a `useActions()` hook that uses `router.push` for navigate, opens chat for ask, and dispatches to a context for events.

### The `SourceRef` System
Facts and values can carry a `SourceRef`:
```typescript
interface SourceRef {
  kind: "document" | "chat";
  title: string;       // "Form 16 (FY 2025-26)" or "WhatsApp"
  where: string;       // "Part B · page 2 · Gross salary" or "12 Nov, 9:14 pm"
  excerpt?: string;    // the text as it appears there
  highlight?: string;  // the part of the excerpt to bold
  to?: string;         // where "Open" goes (document viewer or chat)
}
```
Render it as a small "Source: ..." text that opens a hover popover showing the excerpt with highlight. This is critical for trust.

### Data Adapters
Create adapter functions in `web/src/lib/blocks/` that turn platform API responses into `Block[]`:

- `homeBlocks(caseData, residency, holdings, tickets, requests, changes)` → `{ main: Block[], side: Block[] }`
- `taxFileBlocks(caseData, residency, changes)` → `{ sections: { id, title, summary, blocks: Block[] }[] }`
- `incomeBlocks(caseData, holdings)` → `Block[]`
- `caseBlocks(caseData, residency, holdings)` → `Block[]` (for expert, with cite context)

Each adapter maps platform types to block types. For example, a `ProfileChange` with status "proposed" becomes a `fields` block row with a `proposalId` that renders an inline confirm/decline card.

---

## Workstream B: In-App Conversation

### What to Build
Add an in-app chat surface to the premium customer portal, alongside WhatsApp (not replacing it).

### Architecture

1. **`ChatThread` component** (`web/src/components/portal/chat-thread.tsx`): A client component that renders the full message history, grouped by day, with a composer at the bottom.

2. **`ChatPanel` component** (slide-over panel): A 460px panel that slides in from the right when the customer clicks "Ask Kiyos" from anywhere in the portal. It contains `ChatThread` in compact mode.

3. **Chat page** (`/portal/chat`): For premium, this should be a full-screen conversation (currently it's just an explainer + WhatsApp link). Replace it with `ChatThread` in full-bleed mode.

### Message Rendering Rules
- **Customer messages**: right-aligned, muted background.
- **Agent messages**: left-aligned, with a sparkles icon. Support `• ` bullet syntax and paragraph breaks (WhatsApp-safe text).
- **Advisor messages**: left-aligned, with an avatar. Show "via Kiyos" when `role === "advisor"` but the message was relay-sent.
- **System messages**: centered, smaller text, full-width rule.
- **Confidence indicator**: if `confidence` is below threshold and `routed` is true, show: "Unverified: your expert checks answers like this before you act on them."
- **Cited rules**: if `cited_rules` is present, show a small "Based on: {rule_ids}" line (links to `/portal/assessment`).
- **CTA buttons**: if `action` is present, render a button (e.g. "See plans", "Upload document").
- **Quick replies**: if `options` is present, render as tappable chips below the message.

### Composer
- Text input, Enter to send (Shift+Enter for newline).
- "Ask Kiyos" sparkles button when idle (with starter prompts from the current context).
- When the advisor has taken over, show a banner: "{advisor name} has joined the chat. Kiyos is paused."
- Free-plan footer showing question count.

### Channel Semantics
- Messages sent from the web are `POST /conversations/{id}/messages` — same endpoint as WhatsApp.
- The backend already handles routing (agent/advisor), confidence, and ticket creation.
- Display channel attribution: show a small icon (globe for web, phone for WhatsApp) on each message so the customer knows where it was sent from. This requires the backend to store channel metadata on messages (add a `channel` field to the Message model if not present).

### Integration Points
- **"Ask Kiyos" button**: Add to the portal header (always visible), and as `AskIconButton` on block headers where `askPrompt` is set.
- **Slide-over panel**: Triggered by clicking "Ask Kiyos" from any page. Shows the conversation with a close button and a "full view" link to `/portal/chat`.
- **Pre-filled prompts**: When `askPrompt` is provided (e.g. "Explain where my income comes from"), open the panel and immediately send that as a message.
- **Link from messages**: Request tags in chat link to the Requests page (see Workstream C).

---

## Workstream C: Unified Request Queue

### What to Build
A `/portal/requests` page and a "Needs you" component that present all waiting items as one unified queue.

### The Unified Request Model (frontend only)
Create a `UnifiedRequest` type in `web/src/lib/unified-requests.ts`:

```typescript
interface UnifiedRequest {
  id: string;                       // e.g. "ticket-5", "change-3", "doc-7", "item-12"
  kind: "question" | "check" | "change" | "needs" | "action";
  title: string;
  detail: string;
  status: string;                   // human-readable, e.g. "Being checked by your expert"
  state: "you" | "expert" | "done"; // the only three states the customer sees
  opened: string;                   // formatted date
  due: string | null;
  channel: "whatsapp" | "web" | null;
  country: "IN" | "US" | "BOTH" | null;
  unread: boolean;
  outcome: string | null;           // what happened when resolved
  // Action affordances
  cta: { label: string; to: string } | null;  // e.g. "Upload" → /portal/documents
  messageId: number | null;          // links back to the conversation message
  // For confirm/decline flows
  task: Task | null;                 // reuse existing TaskSheet system
}
```

### Mapping Rules
Create `buildUnifiedRequests(tickets, changes, requests, actionItems)`:

| Backend Type | → `kind` | → `state` mapping |
|---|---|---|
| `Ticket` (open) | `"check"` | `"expert"` (always — it's with the advisor) |
| `Ticket` (resolved) | `"check"` | `"done"` |
| `ProfileChange` (proposed) | `"change"` | `"you"` (customer must confirm) |
| `ProfileChange` (confirmed) | `"change"` | `"expert"` (expert must approve high-impact) |
| `ProfileChange` (rejected) | `"change"` | `"done"` |
| `DocumentRequest` (pending) | `"needs"` | `"you"` |
| `DocumentRequest` (rejected) | `"needs"` | `"you"` (re-upload) |
| `DocumentRequest` (received) | `"needs"` | `"expert"` (reviewing) |
| `DocumentRequest` (reviewed) | `"needs"` | `"done"` |
| `ActionItem` (customer, open) | `"action"` | `"you"` |
| `ActionItem` (advisor, open) | `"action"` | `"expert"` |
| `ActionItem` (done) | `"action"` | `"done"` |

### Page Design
The `/portal/requests` page shows:
- Header: "Requests" with description and an Open/Done segmented toggle.
- **Open view**: grouped as "Needs you" (state=you) and "With {expert name}" (state=expert).
- **Done view**: all resolved items.
- Each item is expandable: click to see the original message context, outcome, and actions (upload, confirm, reply on WhatsApp, follow up).
- Count badge on the nav: number of items with `state === "you"`.

### Navigation
Add "Requests" to the premium portal nav (`portal-nav.tsx`), between "Overview" and "Profile":
```
Overview → Requests → Profile → Tax position → Year at a glance → Documents
```
Use the `Inbox` icon. Show a badge count of `state === "you"` items.

---

## Workstream D: Richer Customer Home

### What to Build
Rebuild the Overview page to be denser and more actionable, using the block system from Workstream A.

### Layout
Two columns on xl+ (main: ~1fr, side: ~380px). On mobile, stacked.

### Main Column Blocks (top to bottom)

1. **Briefing** (`summary` block): "Since your last visit" — what the expert did. Points are built from recently resolved tickets, recently decided profile changes, and recently reviewed documents. Actions: a contextual "Ask Kiyos" prompt + "Ask something else".

2. **Needs You** (`list` block): Everything with `state === "you"` from the unified request system. Each row has title, status, action button (Upload / Confirm / Reply on WhatsApp). Links to the Requests page.

3. **Tax Position** (`group` block with `views: ["This year", "Last year"]`): Per-country stats: estimated tax liability, tax paid/withheld, amount left, effective rate. Derived from `estimatesOf(facts)`. With progress bars showing how much is paid. Falls back to "Pending" when no estimates exist.

4. **Income** (`group` block, 2 columns): Per-country income summary derived from `pictureFromFacts` filtered to `section === "income"`. Show salary, rental, dividends, interest, etc.

5. **Ways to Save** (`list` block): Savings opportunities derived from recommendations with status `proposed` or `accepted`. Show estimated amount per item, whether it's one-time or yearly, and link to the request or a "Ask Kiyos" prompt. Label the whole section "Unverified" until the expert confirms.

6. **Coming Up** (`list` block): Deadlines from `country_status` and `action_items` with due dates. Show days remaining, country chip.

### Side Column Blocks

1. **Your File** (`group` block): Completeness percentage. Count confirmed vs total facts. Link to `/portal/verify`.

2. **With {Expert}** (`list` block): Items with `state === "expert"` + recently resolved items marked unread. Link to Requests page.

3. **Your Expert** (`callout` block): Expert name, credentials, last update time, SLA. Action: "Reply on WhatsApp" or "Ask Kiyos".

4. **Residency** (`group` block): Status (RNOR, ROR, etc.), days in India, until when, what changes next. Derived from `residency` API response.

5. **Your Case** (`timeline` block): Key milestones from engagement track.

---

## Workstream E: Tax File Page

### What to Build
A new `/portal/file` page (or rename existing `/portal/verify`) that shows the full structured tax file.

### Architecture
- The page fetches `caseData`, `residency`, `profileChanges`, and `documentRequests`.
- An adapter function `taxFileBlocks(...)` groups facts into sections and converts to blocks.

### Sections
Define 9 sections based on fact key prefixes and categories:
1. **You and household** — members, roles, citizenship
2. **Residency and visas** — India/US status, dates, green card
3. **Income** — all income sources by country
4. **Accounts and assets** — holdings by country
5. **Tax elections and filings** — Form 10-EE, FBAR, prior returns
6. **Deductions and credits** — foreign tax credit, deductions
7. **Compliance** — Schedule FA, FBAR status, PFIC exposure
8. **Documents** — what's been uploaded and read
9. **Open questions** — topics being worked

### Each Section Renders As
A `group` block containing `fields` blocks. Each `FieldRow` has:
- `label`: plain language name
- `term`: technical term (e.g. "s.6(6)(b)") shown smaller
- `info`: plain-language explanation on hover (info icon)
- `value`: the current value
- `source`: `SourceRef` linking back to the document or chat
- `status`: `ok` | `check` | `missing` | `na`
- `proposalId`: if a `ProfileChange` is pending for this fact, show the proposed change inline with confirm/decline

### Section Status
Each section header shows a `Pill`:
- "Complete" (green) if all facts are `ok`
- "N to check" (amber) if some are `check` or `missing`
- "N changes proposed" (neutral) if profile changes are pending

### Full File View
Add a "View full file" link that renders all 9 sections on one scrollable page. Include a "Print or save as PDF" button with a print stylesheet that hides the nav, header, and chat panel.

### Expert View
When the same blocks are rendered in the expert case view, strip `editPrompt` and add `CiteContext` so the expert can click "Use in reply" on any field to add it to their draft.

---

## Workstream F: Expert Workspace Upgrades

### F1: Conversation Always Visible
**Current**: The conversation is in a tab in the right rail, sharing space with case activity.
**Target**: The conversation is **always visible** on the right side (440px on xl+), not behind a tab. Case activity moves into the main content area as a collapsible section.

Layout change in `app/expert/cases/[id]/page.tsx`:
```
┌─────────────────────────────────────┬──────────────────┐
│  Main content (scrollable)          │  Conversation    │
│  - Customer info                    │  (always visible)│
│  - Waiting items (tickets, docs)    │  - Messages      │
│  - Case picture (blocks)            │  - Request panel │
│  - Brief                            │  - Composer      │
│  - Topics                           │                  │
│  - Activity (collapsed)             │                  │
│  - Full record (collapsed)          │                  │
└─────────────────────────────────────┴──────────────────┘
```

### F2: Cite from Fact
Add a `CiteContext` React context that provides a `cite(text: string)` function. When the expert clicks "Use in reply" on a field, document, or source, it appends the fact (with its source attribution) to the conversation composer draft.

Implementation:
- Create `CiteProvider` wrapping the case page.
- In the block renderer, when `CiteContext` is present, show a "Use in reply" button on `fields` rows and document items.
- Clicking it calls `cite("Arjun's India salary: ₹38,40,000 (Form 16, page 2)")`.
- The composer receives this via context and appends it to the draft textarea.

### F3: Request Resolution in Conversation Panel
When the expert clicks a waiting item (ticket, document reading, profile change), it opens above the composer in the conversation panel:

- **Ticket**: Shows the question, draft answer, and confidence. Actions: "Verified" (send as-is), "Corrected" (edit and send), "Needs a call" (book a call slot).
- **Profile Change**: Shows from → to, why, whether customer confirmed. Actions: "Approve" (applies the change), "Reject" (with reason).
- **Document Reading**: Shows extracted fields and any mismatches. Actions: "Accept", "Reject" (with reason), "Ask for clarification".

After resolving, show a "Next up" link to the next overdue item in the queue.

### F4: Kiyos Relay Mode
Add a "Through Kiyos" / "Direct" / "Private note" segmented toggle to the expert composer:

- **Through Kiyos**: Expert writes a note. Show a preview of how Kiyos would phrase it for the customer (call `askCaptain` with a "rephrase for customer" prompt, or use a simple template). Expert can edit the preview before sending.
- **Direct**: Expert writes directly. The message appears as from the advisor. If used, the agent is paused until the expert hands back.
- **Private note**: Visible only to experts. Stored with `internal: true` or equivalent.

### F5: Queue NextUp
After the expert resolves an item (ticket, document, change), the conversation panel shows:
- "Done. {title} is resolved."
- "Next up: {next item title} · {customer name} · {due date}" with a button to navigate there.

Build this by maintaining a `lastDone` state in the expert workspace context.

---

## Workstream G: Design Token Refinements

### Tabular Numbers for Money
Add a utility class to the platform's `globals.css`:
```css
.font-num {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  font-weight: 500;
}
```
Apply it everywhere financial figures appear: stat tiles, bar labels, list row values, field values.

### Figure Component
Create a `Figure` component for hero numbers (large metric + raised smaller unit/decimal):
```tsx
function Figure({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  // Separate the integer/decimal parts if a decimal is present
  const [main, dec] = value.includes('.') ? value.split('.') : [value, null];
  return (
    <span className={cn("font-num text-[32px] leading-none font-semibold tracking-tight", className)}>
      {main}
      {dec && <span className="text-[20px] align-super">.{dec}</span>}
      {unit && <span className="ml-1 text-[14px] font-medium text-muted-foreground">{unit}</span>}
    </span>
  );
}
```

### CountryChip (Text, Not Flags)
The prototype uses text chips ("India", "US") in neutral grey instead of flag emojis. This is more accessible and doesn't conflate nationality with tax jurisdiction. Create:
```tsx
function CountryChip({ country, size = "sm" }: { country: "IN" | "US" | "BOTH"; size?: "xs" | "sm" }) {
  const label = country === "IN" ? "India" : country === "US" ? "US" : "India and US";
  return (
    <span className={cn(
      "inline-flex items-center rounded-md bg-muted px-1.5 font-medium text-muted-foreground",
      size === "xs" ? "text-[10.5px] py-0" : "text-[11.5px] py-0.5"
    )}>
      {label}
    </span>
  );
}
```
Use this alongside or instead of the current flag-based `COUNTRY` chip in the portal.

### AI Accent
Use a distinct violet accent for AI/Kiyos elements (sparkles, typing indicator, summary glow). Add tokens:
```css
:root {
  --ai: 263 100% 69%;        /* violet #7b61ff */
  --ai-foreground: 0 0% 100%;
  --ai-soft: 256 100% 96%;   /* very light violet */
}
```

### Eyebrow Labels
Card section labels should use a mono uppercase style for structure (like Origin/Mercury):
```tsx
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}
```

### Progress Bar
A thin progress bar for completeness and tax-paid-so-far:
```tsx
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
```

---

## Implementation Order

The workstreams have dependencies. Recommended order:

1. **G (Design tokens)** — 1 day. Small, foundational. No API changes. Do this first so everything that follows uses the right tokens.

2. **A (Block system)** — 3-4 days. The foundation for D, E, and F. Start with Phase 1 types only (group, stats, list, fields, summary, callout, text, timeline, actions). Skip charts initially.

3. **C (Unified Requests)** — 1-2 days. Frontend-only mapping layer. No API changes needed. Enables the Needs You component and the Requests page.

4. **D (Richer Home)** — 2-3 days. Depends on A and C. Rebuild Overview using block data adapters. This is the biggest user-facing improvement.

5. **E (Tax File)** — 2-3 days. Depends on A. Build section structure and fact-to-field mapping. High value for trust and transparency.

6. **B (In-App Chat)** — 2-3 days. Independent of blocks. Needs small backend change (channel field on messages). Medium priority but high user satisfaction.

7. **F (Expert upgrades)** — 3-4 days. Depends on A and B. The conversation-always-visible layout, cite-from-fact, and request resolution are the biggest expert efficiency gains.

**Total estimate: ~15-20 days of focused work.**

---

## What NOT to Change

These things in the current platform are correct and should not be replaced:

1. **The backend and API layer** — FastAPI, SQLAlchemy, the case graph, the rules engine, the residency service. All of it stays.
2. **The journey/funnel system** — intake → signup → free → payment_pending → paid. The prototype's free/paid toggle is a convenience; the platform's journey is the real product.
3. **The WhatsApp intake bot** — driven by `initial-scan.yaml`. This is good.
4. **The rules engine** — YAML rules + evaluator. The prototype has nothing like this.
5. **The Brief** — discrepancies, gaps, evidence matrix, sign-off blockers. Keep this.
6. **The TopicBoard** — tax questions grouped by status. Keep this.
7. **shadcn/ui primitives** — Button, Dialog, Sheet, Tabs, Table. Keep using these as the base layer.
8. **The dual theme** — portal (warm cream) vs workspace (cool gray). Good foundation.
9. **Server Components for initial data** — the platform's fetch-in-RSC pattern is correct.
10. **PerspectiveSwitch** — expert sees what customer sees. Keep this.
11. **Portfolio analytics** — cross-case charts for experts. Keep this.
12. **Document request/review flow** — the backend workflow. Keep this.
13. **Confidence-based ticket routing** — agent flags low-confidence → ticket → expert. Keep this.

---

## Summary of Net-New Backend Work Required

Most of this brief is frontend-only. The backend changes needed are minimal:

1. **Message channel field**: Add a `channel` column (varchar, nullable) to the `Message` table. Set it to `"whatsapp"` for messages from the WhatsApp webhook and `"web"` for messages from the portal. This enables channel attribution in the chat UI.

2. **Unread tracking**: Consider adding a `last_seen_at` timestamp per customer to enable "since your last visit" briefing. Alternatively, compute it client-side from the last message the customer sent.

3. **No other schema changes needed**. The unified request queue, the block system, the tax file page, and all the expert workflow upgrades are frontend-only.
