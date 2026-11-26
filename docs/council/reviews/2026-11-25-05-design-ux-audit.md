# Review 05: design and UX audit (25 Nov 2026)

**Panel (internal):** principal product designer, UX researcher, UI and visual designer, interaction designer, design systems architect, dashboard and data-visualisation specialist, accessibility specialist, front-end engineering architect.

**Method:**
- The code was read in full, with three read-only explorers.
- Every screen on both sides was opened in the browser at 1024px and at 375px.
- Each page's length, font sizes, keyboard focus ring and contrast were measured.
- The surprising findings were re-checked in the code.

**Frameworks applied:** Nielsen's heuristics, Gestalt, the Laws of UX, information architecture, Atomic Design, WCAG 2.2 and Jobs to be Done.

**Standing rules respected:**
- no calculated tax;
- no controls that are only for show;
- "Profile" keeps its name;
- the council never appears in the UI.

No item rejected in Review 02 is reopened.

**Outcome:**
- The product owner approved Stage 1 (UX-01 to UX-06, UX-10, UX-11, and the fallback half of UX-12) on 25 Nov 2026.
- Stage 1 was built the same day.
- Stage 2 (UX-07, UX-08, UX-09, UX-12, UX-13, the one-line case summary, and progress on the remaining save buttons) was approved and built on 25 Nov 2026.
- The product owner's answers: the role is called "Expert" (UQ-1); the portal URLs are renamed with redirects (UQ-2); the merged case tab is "Profile" (UQ-3).
- UX-09 needed one additive API change: `GET /cases` now returns `open_tickets_count` and `awaiting_signoff_count`, so the numbers on the expert's Home match the filtered Cases list they open.
- After Stage 2 the product owner found the customer Overview still verbose, and figures opening in different ways (up, down, or straight to a document). The cause was four hidden rules in the source component. Approved and built the same day: UX-21 (the one-panel rule) and UX-22 (the three-section Overview). The figures behind the Overview are unchanged, and tax figures are still the expert's own entries.
- The product owner then found the three-section Overview too sparse for a landing page, missed the income donut, and saw the pages being changed one at a time. UX-23 replaced it the same day: one structure for the whole customer workspace, with the Overview as a hub that previews every page, shared building blocks, and the one-panel rule on all six pages.
- Stages 3 and 4 are awaiting approval.

Item numbers below (#1–#20) correspond to UX-01 to UX-20 in the decision log.

## 1. How the application is built (verified)

**Stack:**
- Next.js app router, Tailwind, and shadcn-style primitives in `web/src/components/ui/` (14 of them).
- Radix for tabs and dialogs; sonner for toasts; lucide icons.
- A FastAPI backend that this audit does not touch.

**Two products in one app:**

| | Customer workspace `/portal/*` | Expert workspace `/expert/*` |
|---|---|---|
| Shell | `app/portal/portal-shell.tsx` | `app/expert/layout.tsx` |
| Look | Warm cream, Inter Tight headings, serif "KIYOS" wordmark (`.portal` scope) | Cool grey, Inter, sans "K Kiyos Experts" mark (`.workspace` scope, `globals.css:40`) |
| Navigation | Side panel at `lg` and up; bottom tab bar below `lg` | Side panel at `md` and up; horizontal strip below `md` |
| Pages | Overview, Profile, Tax position, Year at a glance, Documents, Messages, plus sign-up, WhatsApp, plans and checkout | Home, Cases, case page (10 tabs plus a right rail), Rules, Agent quality, sign-in |

**Shared code:**
- `SideSheet` (`components/side-sheet.tsx`, 13 users).
- `lib/format.ts`.
- A few cross-imports: the portal's `country-position` and `income-picture` are used on the expert side, and the expert's `CaptainQuestions` is used in the portal.

**Measured page lengths at 1280×800** (one screen = 800px):

| Page | Screens tall | Distinct text sizes |
|---|---|---|
| Expert case page | 4.0 | 19 (95 text runs under 12px) |
| Expert Home | 2.7 | |
| Year at a glance | 2.2 | 65 text runs under 12px |
| Overview | 1.8 | |

---

## 2. What already works and should stay

- **The core loop is clear on both sides.** "What Vikram needs from you" on the customer Overview and "Up next for you" on the expert's case page are good, action-first summaries: Jobs to be Done, recognition over recall.
- **Empty states are written in plain, specific language,** e.g. Documents' "Nothing waiting". They're just built inline in each place.
- **Expert-entered figures are clearly attributed** ("from Vikram Desai"). This matches the trust model.
- **Two tones for two audiences is right.** Calm and spacious for customers, denser for experts. Stripe does the same, with a calm Checkout and a dense Dashboard. Keep it, but make the two sides share one set of building blocks (see Stage 3).
- **The new single Expert | Customer switch** in the side panel.

---

## 3. Findings by specialist (condensed)

**Principal product designer**
- Page headers differ on every page:
  - Rules opens with a marketing-style hero: a "KNOWLEDGE LAYER" eyebrow, then "Human-authored tax rules, cited to the statute."
  - Agent quality's title is "Evaluation set", which doesn't match its nav label.
  - Cases shows its title twice ("Cases · 19 total", then "Cases").
  - The case breadcrumb starts "Command centre", but the nav says "Home".
- The expert case page puts the same information on screen several times:
  - residency in 5 places;
  - open questions answerable in 3 places on one page;
  - action items in both "Up next" and the Action items tab.

**UX researcher**
- **Ten case tabs wrap onto two rows** at 1024px and four rows on a phone. "Today" and "Overview" are both summaries. Breaks Hick's law and recognition over recall.
- **The four-line case summary paragraph** pushes the work below the fold.
- **The portal's nav labels, page titles and URLs don't match:**
  - Profile is `/portal/verify` and its title is the customer's name;
  - Tax position is `/portal/assessment` and its title is "Where you stand";
  - Overview is `/portal/dashboard`.
- **One role, five names:** "Case captain", "Lead expert", "advisor", "expert", and "Unassigned's to-dos" when there is no captain.

**Interaction designer**
- **Failed actions can leave controls stuck:**
  - The Agent quality buttons stay disabled after a network error (`eval-runner.tsx:43-66`).
  - Withdrawing a way to save swallows its error (`expert-entries.tsx:207`).
  - Several saves show no "saving…" state.
- **The case tab isn't kept in the URL.** "Answer" in the reply alert scrolls to an anchor that only exists on Today.
- **Cases rows look clickable** (pointer cursor) but only the name is a link.

**UI and visual designer**
- **28 distinct font sizes,** 898 of them one-off pixel values such as 12.5px and 13.5px. 198 uses are under 12px.
- **Cards come in four corner radii and two border methods.**
- **Buttons come in three shapes:** fully round, `lg` and `md`.
- **The serif leaks** into side panels and some non-portal pages. For example, the big figure in the Tax position breakdown panel renders in Playfair.

**Design systems architect**
- **The primitives are mostly bypassed:** 137 raw buttons against 6 uses of `ui/button`; 77 hand-rolled cards against 25 uses of `Card`.
- **There are four ways to open an overlay:** `ui/dialog`, `SideSheet`, raw Radix in `TaskSheet`, and ad-hoc ones.
- **The same thing is defined several times:**
  - status colours with no shared map;
  - residency colours, three times, with one that conflicts (`residency-timeline.tsx` uses blue/green/amber where the others use sky/violet/emerald);
  - review-status labels, four copies with different wording;
  - initials, date and "time ago" helpers, 3 to 7 copies each.
- **The sidebar colour tokens aren't mapped in `tailwind.config.ts`,** so `bg-sidebar` produces no CSS.
- **Eight components are never imported,** plus `case-brief`, which is always rendered with `null`.

**Dashboard and data visualisation specialist**
- **Expert Home repeats itself.** The four number tiles repeat the "Needs an expert" counts, and three of those rows open the unfiltered case list, so the number doesn't lead to the items.
- **Residency colours change meaning between charts** (see above).

**Accessibility specialist (WCAG 2.2)**
- **Keyboard focus is nearly invisible.**
  - The customer focus ring is 30–40% green on cream, which measures **1.7–2.1:1** against the 3:1 that 1.4.11 asks for.
  - The expert side has no ring at all.
  - Ten inputs remove the outline and only shift the border colour by 1px.
- **`SideSheet` has no focus trap, no initial focus and no accessible name,** so Tab walks behind the open panel (2.4.3, 4.1.2).
- **Every page's browser title is "Kiyos"** (2.4.2).
- **There's no "skip to content" link** (2.4.1).
- **198 uses of text under 12px.**

**Front-end engineering architect**
- Most fixes are local, with no API or backend changes.
- The highest-leverage single change is moving `SideSheet` onto Radix Dialog, which is already a dependency, while keeping its props. That fixes focus, the accessible name and the serif leak for all 13 users at once.
- The type-scale and status-colour work is wide and mechanical, so it should be done one area at a time, with screenshots to catch visual drift.

---

## 4. Most important problems (ranked)

| # | Pri | Screen / component | Problem → why it matters | Principle | Recommendation | Size |
|---|---|---|---|---|---|---|
| 1 | P0 | Expert case page below 1280px | The right rail is `xl` only (`[id]/page.tsx:196`) and the "Open thread" button is `xl:block` (`expert-inbox.tsx:119`). **The WhatsApp thread can't be reached at all** on a 1024–1279px window, which a laptop with split panes can easily be. | Flexibility; visibility of system status | Below xl, a "Thread" button in the case header opens the existing `CaseRail` in a `SideSheet` | S |
| 2 | P0 | Focus ring on both sides | Keyboard users can't see where they are. Fails WCAG 1.4.11 and 2.4.7. | Accessibility | One `:focus-visible` ring at full primary with an offset, in both scopes; restore focus on the 10 bare inputs | S |
| 3 | P0 | `SideSheet` (13 panels) | No focus trap or accessible name. The serif also leaks into it. | WCAG 2.4.3, 4.1.2; consistency | Rebuild on Radix Dialog with the same API; carry the `.portal`/`.workspace` scope into the panel | M |
| 4 | P0 | Cases page | The text promises "Filter by stage", but there's no stage filter (`cases-table.tsx:34`); "19 total" doesn't match the rows shown; rows look clickable but aren't | Match the system to reality; consistency | Make the copy and count honest; make the whole row open the case | S |
| 5 | P0 | Error handling | Stuck buttons (Agent quality); a swallowed error (withdrawing a way to save); no `error.tsx` or `loading.tsx` anywhere in the portal (CD-13) | Error recovery; system status | try/finally with toasts; portal `loading.tsx` using the existing `Skeleton`, and `error.tsx` | S–M |
| 6 | P0 | Expert phone bar (my change today) | The new Expert \| Customer switch is clipped off the right edge at 375px | Consistency | Pin it outside the scrolling strip | S |
| 7 | P1 | Case page tabs | 10 tabs on 2–4 rows; two summary tabs; the tab isn't in the URL | Hick's law; IA | 8 tabs on one row (see wireframe); the tab in `?tab=`; deep links work | M |
| 8 | P1 | Page headers (both sides) | A different pattern on every page; titles don't match the nav | Consistency; Jakob's law | One page-header pattern: breadcrumb bar, then a title that matches the nav, one line of description, actions on the right. Reuse the portal's `kit.tsx` `PageHeader` | M |
| 9 | P1 | Expert Home | Tiles duplicate the queue; queue rows lead to an unfiltered list | Signal over noise | Merge the counts into the queue; rows open Cases filtered by that queue (a real filter via URL parameters, the data already exists) | M |
| 10 | P1 | Browser titles | "Kiyos" on every page | WCAG 2.4.2 | A title per page, e.g. "Arjun Rao · Cases · Kiyos" | S |
| 11 | P1 | Messages on phones | No tab bar and no side padding | Navigation; consistency | Keep the tab bar visible; use the shell's padding | S |
| 12 | P1 | Role naming | Five names for one role | Consistency; plain language | One term everywhere (**your decision**, see open questions); fix the "Unassigned's to-dos" fallback | S |
| 13 | P1 | Portal URLs | URLs don't match the labels (CD-14) | Match with the real world | Rename routes and redirect the old ones (**your decision**) | S |
| 14 | P2 | Type scale | 28 sizes; 198 under 12px (CD-18) | Visual hierarchy; readability | A 7-step scale as Tailwind tokens: 12 / 13 / 14 / 16 / 18 / 22 / 30. Map the one-off sizes to it one area at a time | L |
| 15 | P2 | Status and residency colours | Defined three or four times; one set conflicts | Consistency; colour by meaning | One `lib/status.ts` map, and semantic `--success` / `--warning` / `--danger` / `--info` tokens | M |
| 16 | P2 | Primitives | 137 raw buttons, 77 hand-rolled cards, 50 eyebrow labels, 4 overlay types (CD-17) | Atomic design | Extend `ui/button` and `ui/card`; add `SectionHeader`, `StatusPill`, `EmptyState`; move helpers into `lib/format` | L |
| 17 | P2 | Dead code | 8 unused components plus `case-brief` | Maintainability | Delete the git-tracked ones (recoverable); ask before removing anything untracked | S |
| 18 | P2 | Sidebar tokens | `bg-sidebar` produces no CSS | Tokens | Map `sidebar.*` in the Tailwind config | S |
| 19 | P3 | Cases table at 1024px | The tax year wraps ("2026-" / "27"); the Updated column is clipped; each name is repeated in its subtitle | Readability | Hide low-value columns below `lg`; `nowrap` on the year; drop the repeated name | S |
| 20 | P3 | Polish | Dates mix en-GB, en-IN and en-US; no skip link; the loading skeleton's rail is the wrong width | Consistency; WCAG 2.4.1 | One date locale; a skip link; fix the skeleton | S |

**Wireframe for #7, case tabs on one row:**

```
Today | Tickets 2 | Action items 4 | Tax questions | Recommendations | Documents | Client file | Audit
```

"Client file" combines Overview, Cross-border profile and Financial life as sections with jump links. No data or behaviour changes. **Trade-off:** experts who know the old tab names need a moment to adjust, and the counts on the tab labels help with that.

**Wireframe for #8, one page header everywhere:**

```
┌ breadcrumb bar ─────────────────────────────────────────────┐
│ Cases › Arjun Rao                          [page actions]   │
├─────────────────────────────────────────────────────────────┤
│ Arjun Rao   [In review]                                     │
│ One-line summary · household          [Read full summary ▾] │
│ India RNOR · US Dual-status · Next filing 15 Apr · Vikram    │
└─────────────────────────────────────────────────────────────┘
```

**Benchmarks used, and why each pattern fits:**
- **Linear:** one row of view tabs, state kept in the URL, side panels that trap focus.
- **Stripe Dashboard:** a page-header pattern (title, description, actions), and one status-badge map.
- **Intercom:** the conversation sits beside the record and becomes a panel on narrow screens.
- **Vercel:** a fixed type scale.
- **Ramp:** number tiles only when they lead to the filtered list.

I'm borrowing the reasoning behind these patterns, not their look.

---

## 5. Roadmap

- **Stage 1, quick wins and P0** (this approval): items 1–6 and 10, plus 11 and the fallback half of 12.
- **Stage 2, UX and information architecture:**
  - 7 (case tabs), 8 (page headers), 9 (Home and filtered Cases), 12 (naming), 13 (routes);
  - fold the case summary to one line;
  - make the 4 remaining save buttons show progress.
- **Stage 3, design system:** 14 (type scale), 15 (status colours), 16 (primitives), 17 (dead code), 18 (tokens). One area per pass, each with screenshots.
- **Stage 4, refinements:**
  - 19 and 20;
  - customer tab bar labels at 375px;
  - chart legends and colours after 15;
  - a final WCAG sweep.

---

## 6. Stage 1: the changes I'll make if you approve

No API, backend, data or tax-logic changes.

| Change | Files |
|---|---|
| 1. A visible focus ring on both sides. One `:focus-visible` rule at full primary, 2px with a 2px offset (well above 3:1). Replace the bare `outline-none` on inputs with the same ring. | `app/globals.css`; the inputs in `sign-up-form.tsx`, `case/expert-auth.tsx`, `case/question-queue.tsx`, `portal/sign-in.tsx`, `chat-panel.tsx`, `portal/task-sheet.tsx` |
| 2. `SideSheet` on Radix Dialog. Same props (`open`, `onClose`, `wide`, `eyebrow`, `title`): a focus trap, initial focus, an accessible name, Escape and backdrop close, scroll lock. The phone bottom sheet stays. It picks up the page's `.portal` or `.workspace` scope, so the serif leak goes away. The 13 callers don't change. | `components/side-sheet.tsx` |
| 3. The WhatsApp thread below 1280px. A "Thread" button in the case page header (hidden at `xl`) opens the existing `CaseRail` in a `SideSheet`. "Open thread" in the reply alert works at every width by opening that panel. | `app/expert/cases/[id]/page.tsx`, a small client wrapper beside `case/case-rail.tsx`, `case/expert-inbox.tsx` |
| 4. Make the Cases page honest. The description no longer promises filters; the count matches the rows shown; the whole row opens the case (keyboard accessible). | `app/expert/cases/page.tsx`, `cases-table.tsx` |
| 5. Error handling. Agent quality run, apply and undo use try/finally and show a toast on failure, and Undo gets a busy state. Withdrawing a way to save shows its error and a busy state. Portal `loading.tsx` uses the existing `Skeleton`; portal `error.tsx` offers "Try again". | `app/expert/quality/eval-runner.tsx`, `case/expert-entries.tsx`, new `app/portal/loading.tsx` and `app/portal/error.tsx` |
| 6. The phone bar switch. Move the compact Expert \| Customer switch outside the scrolling strip so it's always fully visible. | `app/expert/layout.tsx` |
| 7. Page titles. Use Next `metadata` / `generateMetadata` per page, e.g. "Home · Kiyos experts", "Arjun Rao · Cases", "Documents · Kiyos". | the page files under `app/expert` and `app/portal`; client pages get a small layout or a title set where needed |
| 8. Messages on phones. Keep the tab bar; add side padding. | `components/portal/portal-nav.tsx`, `app/portal/portal-shell.tsx` |
| 9. The no-captain fallback. Use the existing `hasCaptain` / "Kiyos team" fallback in `ActionItems` and `TicketList`, so "Unassigned's to-dos" can't appear. | `case/case-tabs.tsx`, `ticket-list.tsx`, or their caller in `case-workspace.tsx` |

**Also on approval:**
- Save this audit as the council's Review 05 minutes, `docs/council/reviews/2026-11-25-05-design-ux-audit.md`.
- Add its IDs (UX-01 to UX-20) to `docs/council/decision-log.md`, with CD-13/14/17/18/19 marked as folded in.

The council stays internal, as always.

---

## 7. Open questions, for Stage 2 (they don't block Stage 1)

1. **One name for the expert role.** "Case captain" is what customers see today. "Your expert" is what the demo narration says.
2. **Portal URLs** to match the labels (CD-14). For example `/portal/profile` and `/portal/tax-position`, with the old URLs redirecting.
3. **The case-tab grouping** in wireframe #7. Is "Client file" the right name for the combined tab?

---
