import Link from "next/link";
import type { CaseDetail, DocumentRequest, ProfileChange } from "@/lib/types";
import { formatDate } from "@/lib/format";
import type { Residency } from "@/lib/residency";
import { COUNTRY_NAME, estimatesOf, positionOf, STATUS_SHORT, type Code, type CountryPositionData } from "@/lib/position";
import { profileLabel } from "./profile-labels";
import { MessageAlert } from "./inbox";
import { hasCaptain } from "@/lib/captain";
import type { Briefing, Saving } from "@/lib/residency";
import { cn } from "@/lib/utils";
import { SinceLastVisit, WayToSave } from "./home/from-expert";
import { NeedsNow, type ExpertItem, type NeedItem } from "./home/needs-now";
import { DueLine, PositionFigure, SetBy } from "./position-figure";
import { CountryCode, Segs, StepRail, TurnChip, type Step } from "./visual";

/**
 * Customer Overview, built from the customer's questions in order (canvas "Kiyos dashboards",
 * visual language sheet):
 *   1. Am I OK? One figure per country with a paid / left bar, and who set it.
 *   2. Is it moving? Each return as whose turn it is plus a step rail.
 *   3. What do I do? What needs you, each with what happens after, beside a way to save and
 *      what changed since the last visit.
 *   4. What's ahead? Today to the last return date on one line.
 * Shapes replace sentences; explanations open in the side panel. Only links (→) change page.
 * Kiyos never works out tax: every figure is the expert's own entry.
 */

const todayIso = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY);
const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });
const long = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function Overview({
  caseData,
  requests,
  changes,
  residency,
  briefing = null,
  savings = [],
}: {
  caseData: CaseDetail;
  requests: DocumentRequest[];
  changes: ProfileChange[];
  residency?: Residency | null;
  briefing?: Briefing | null;
  savings?: Saving[];
}) {
  const first = caseData.client_name.split(" ")[0];
  const lead = caseData.case_captain;
  const captained = hasCaptain(lead);
  const leadFirst = captained ? lead.split(" ")[0] : "Kiyos";
  const today = todayIso();

  const positions: Record<Code, CountryPositionData> = { IN: positionOf(caseData, residency, "IN"), US: positionOf(caseData, residency, "US") };
  const filingOf = (c: Code) => positions[c].filing?.split(" + ")[0] ?? null;
  const forCountry = (c: Code) => requests.filter((r) => r.country === c || r.country === "BOTH");
  const open = (r: DocumentRequest) => r.status === "pending" || r.status === "rejected";

  /* ---------------------------------------------------------------- needs you, with what happens after */
  const items: (NeedItem & { urgent: boolean })[] = [
    ...changes
      .filter((c) => c.status === "proposed")
      .map((c) => ({
        id: `change-${c.id}`,
        title: `Confirm ${lowerFirst(profileLabel(c.fact_key))}: ${formatValue(c.fact_key, c.proposed_value)}`,
        detail: `You told us on WhatsApp on ${short(c.created_at)}. Nothing changes until you confirm.`,
        due: null,
        cta: "Review change",
        task: { kind: "confirm" as const, change: c },
        after: ["You confirm", `${leadFirst} reviews`, "Your profile updates"],
        urgent: true,
      })),
    ...requests.filter(open).map((r) => {
      const c = r.country === "IN" || r.country === "US" ? r.country : null;
      const lastForCountry = c ? forCountry(c).filter(open).length === 1 : false;
      return {
        id: `req-${r.id}`,
        title: r.title,
        detail: r.status === "rejected" ? r.rejection_reason : null,
        due: r.due_date,
        country: r.country,
        rejected: r.status === "rejected",
        cta: r.status === "rejected" ? "Upload new copy" : "Upload",
        task: { kind: "upload" as const, request: r },
        after: [
          "You upload",
          `${leadFirst} checks`,
          c && lastForCountry ? `${c === "IN" ? "India" : "US"} documents complete` : c && filingOf(c) ? `Counts toward your ${filingOf(c)}` : "Added to your file",
        ],
        urgent: r.status === "rejected" || (!!r.due_date && r.due_date < today),
      };
    }),
    ...caseData.action_items
      .filter((i) => i.assignee === "customer" && i.status !== "done")
      // Skip items that only repeat a document request; an expert's question is never one.
      .filter((i) => i.notes === "clarification" || !requests.some((r) => i.title.toLowerCase().includes(r.title.toLowerCase())))
      .map((i) => ({
        id: `item-${i.id}`,
        title: i.title,
        detail: i.status === "blocked" ? "Waiting on something else first" : null,
        due: i.due_date,
        cta: "Reply",
        // Answered in the side panel, into the same WhatsApp conversation as Messages.
        task: { kind: "message" as const, key: `item-${i.id}`, send: "reply" as const, title: i.title, conversationId: caseData.conversation_id ?? null },
        after: ["You answer", `${leadFirst} reads it`, `Back with ${leadFirst}`],
        urgent: i.notes === "clarification",
      })),
  ];
  // Changes to confirm come first (they hold up the residency check), then by date.
  const isConfirm = (t: NeedItem) => t.task?.kind === "confirm";
  items.sort((a, b) => Number(isConfirm(b)) - Number(isConfirm(a)) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || Number(b.urgent) - Number(a.urgent));

  const withExpert: ExpertItem[] = caseData.action_items
    .filter((i) => i.assignee === "advisor" && i.status !== "done")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .map((i) => ({ id: i.id, title: i.title, due: i.due_date }));

  const thisWeek = items.filter((t) => t.due && daysBetween(today, t.due) <= 7).length;
  const headline =
    items.length === 0
      ? "Nothing needs you right now."
      : thisWeek > 0
        ? `${thisWeek} ${plural(thisWeek, "thing needs", "things need")} you this week.`
        : `${items.length} ${plural(items.length, "thing needs", "things need")} you.`;

  /* ---------------------------------------------------------------- who set the figures */
  const estimates = Object.values(estimatesOf(caseData.facts));
  // Only a name the record holds; the latest date across countries.
  const setBy = estimates.find((e) => e?.enteredBy)?.enteredBy ?? null;
  const setOn = estimates.map((e) => e?.enteredOn ?? "").sort().at(-1) || null;

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">
            {greeting()}, {first}
          </h1>
          <p className="mt-1.5 text-[15px]">
            <span className={cn("font-semibold", items.length ? "text-[#7A3F06]" : "text-foreground")}>{headline}</span>
            {captained && items.length > 0 && <span className="text-muted-foreground"> Everything else is with {leadFirst}.</span>}
          </p>
        </div>
        {estimates.length > 0 && <SetBy name={setBy} on={setOn} illustrative={estimates.some((e) => e?.illustrative)} />}
      </section>

      <MessageAlert />

      {/* 1. Am I OK? */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        {(["IN", "US"] as const).map((c) => (
          <PositionCard key={c} p={positions[c]} filing={filingOf(c)} lead={leadFirst} today={today} />
        ))}
      </div>

      {/* 2. Is it moving? */}
      <section aria-labelledby="h-returns" className="overflow-hidden rounded-[14px] border bg-card">
        <div className="flex items-baseline justify-between gap-4 px-[22px] pb-3 pt-4">
          <h2 id="h-returns" className="text-[16px] font-semibold text-foreground">
            Your returns
          </h2>
          <Link href="/portal/tax-position" className="text-[13px] font-medium text-primary hover:underline">
            Tax position →
          </Link>
        </div>
        {(["IN", "US"] as const).map((c) => {
          const p = positions[c];
          const reqs = forCountry(c);
          const pending = reqs.filter(open);
          const accepted = reqs.filter((r) => r.status === "reviewed").length;
          const yours = pending.length > 0;
          const steps: Step[] = [
            {
              state: p.reviewedBy && !p.reviewStale ? "done" : p.status ? "now" : "next",
              title: "Residency",
              sub: p.status ? `${STATUS_SHORT[p.status] ?? p.status}${!p.reviewedBy ? " · in review" : p.reviewStale ? " · rechecking" : ""}` : "Not settled yet",
            },
            {
              state: reqs.length === 0 ? "next" : accepted === reqs.length ? "done" : "now",
              yours,
              title: "Documents",
              sub:
                reqs.length === 0 ? (
                  "None asked yet"
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Segs done={accepted} total={reqs.length} pendingTone={yours ? "amber" : "none"} />
                    <span className="tabular-nums">
                      {accepted}/{reqs.length}
                    </span>
                  </span>
                ),
            },
            { state: p.stage && /filed|submitted/i.test(p.stage) ? "done" : "next", title: "Return due", sub: p.due ? long(p.due) : "Not set yet" },
          ];
          return (
            <div key={c} className="grid grid-cols-[minmax(0,1fr)] items-center gap-3 border-t px-[22px] py-4 md:grid-cols-[170px_240px_minmax(0,1fr)] md:gap-6">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  <CountryCode code={c} />
                  {filingOf(c) ?? COUNTRY_NAME[c]}
                </p>
                {p.stage && <p className="mt-1 text-[12px] text-muted-foreground">Stage: {p.stage}</p>}
              </div>
              <div className="flex flex-col items-start gap-1.5">
                {yours ? <TurnChip yours name={caseData.client_name} /> : <TurnChip yours={false} name={captained ? lead : "Kiyos"} />}
                <span className="text-[13px] text-muted-foreground">{yours ? `Waiting on: ${pending[0].title}` : "Nothing needed from you"}</span>
              </div>
              <StepRail label={`${COUNTRY_NAME[c]} return steps`} steps={steps} />
            </div>
          );
        })}
      </section>

      {/* 3. What do I do? */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <NeedsNow items={items} withExpert={captained ? withExpert : []} caseId={caseData.id} by={caseData.client_name} lead={captained ? lead : "Kiyos"} />
        {captained && (
          <aside className="flex min-w-0 flex-col gap-5">
            <WayToSave savings={savings} expert={lead} caseId={caseData.id} customer={caseData.client_name} />
            <SinceLastVisit briefing={briefing} expert={lead} />
          </aside>
        )}
      </div>

      {/* 4. What's ahead? */}
      <Ahead items={items} positions={positions} today={today} />
    </div>
  );
}

/* ================================================================ pieces */

/** One country's position: the expert's figure as the headline, one bar, a legend that carries the numbers, the due date. */
function PositionCard({ p, filing, lead, today }: { p: CountryPositionData; filing: string | null; lead: string; today: string }) {
  return (
    <article className="flex flex-col rounded-[14px] border bg-card px-[22px] pt-5">
      <p className="mb-3.5 flex flex-wrap items-center gap-2 text-[13.5px]">
        <CountryCode code={p.code} />
        <span className="font-semibold text-foreground">{COUNTRY_NAME[p.code]}</span>
        <span className="text-muted-foreground">{[p.year, filing].filter(Boolean).join(" · ")}</span>
      </p>
      {p.estimate ? (
        <PositionFigure p={p} />
      ) : (
        <>
          <p className="font-serif text-[22px] text-muted-foreground">Not set yet</p>
          <p className="mt-1 pb-4 text-[13px] text-muted-foreground">{lead} adds this figure once your documents are in.</p>
        </>
      )}
      {p.due && (
        <div className="mt-4 border-t py-3">
          <DueLine p={p} filing={filing} today={today} />
        </div>
      )}
    </article>
  );
}

/** Today to the last return date on one line: amber for what needs the customer, dark for return dates. */
function Ahead({ items, positions, today }: { items: NeedItem[]; positions: Record<Code, CountryPositionData>; today: string }) {
  const returns = (["IN", "US"] as const)
    .filter((c) => positions[c].due && positions[c].due! >= today)
    .map((c) => ({ date: positions[c].due!, label: `${c === "IN" ? "India" : "US"} return due` }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const mine = items.filter((t) => t.due).map((t) => t.due!);
  if (returns.length === 0 && mine.length === 0) return null;
  const end = [...returns.map((r) => r.date), ...mine, today].sort().at(-1)!;
  const span = Math.max(30, daysBetween(today, end));
  const x = (d: string) => Math.min(100, Math.max(0, (daysBetween(today, d) / span) * 100));

  // The customer's own dates read as one labelled group when they sit close together; every group is labelled.
  const mineSorted = [...mine].sort();
  const groups: string[][] = [];
  for (const d of mineSorted) {
    const g = groups[groups.length - 1];
    if (g && x(d) - x(g[0]) < 10) g.push(d);
    else groups.push([d]);
  }
  const groupLabel = (g: string[]) =>
    g
      .map((d) => (d < today ? "Overdue" : short(d)))
      .filter((v, i, all) => all.indexOf(v) === i)
      .join(" · ");

  const months: { x: number; label: string }[] = [];
  const cur = new Date(today + "T00:00:00Z");
  cur.setUTCDate(1);
  cur.setUTCMonth(cur.getUTCMonth() + 1);
  while (cur.toISOString().slice(0, 10) <= end) {
    const iso = cur.toISOString().slice(0, 10);
    months.push({ x: x(iso), label: cur.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) + (cur.getUTCMonth() === 0 ? ` ${String(cur.getUTCFullYear()).slice(2)}` : "") });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  const every = months.length > 9 ? 2 : 1;
  const place = (pos: number) => (pos > 80 ? { right: `${100 - pos}%`, textAlign: "right" as const } : { left: `${pos}%` });

  return (
    <section aria-labelledby="h-ahead" className="rounded-[14px] border bg-card px-[22px] py-[18px]">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="h-ahead" className="text-[16px] font-semibold text-foreground">
          What’s ahead
        </h2>
        <Link href="/portal/year" className="text-[13px] font-medium text-primary hover:underline">
          Year at a glance →
        </Link>
      </div>
      <ul className="sr-only">
        {mineSorted.map((d, i) => (
          <li key={`m-${i}`}>Something for you, {long(d)}</li>
        ))}
        {returns.map((r) => (
          <li key={r.label}>
            {r.label}, {long(r.date)}
          </li>
        ))}
      </ul>
      <div aria-hidden className="overflow-x-auto">
        <div className="relative mx-2 h-[100px] min-w-[600px]">
          <span className="absolute left-0 right-0 top-[46px] h-0.5 bg-border" />
          <span className="absolute bottom-[18px] left-0 top-[30px] border-l-2 border-primary" />
          <span className="absolute left-1.5 top-2 text-[11.5px] font-semibold text-primary">Today</span>
          {months
            .filter((_, i) => i % every === 0)
            .map((m) => (
              <span key={m.label + m.x} className="absolute top-6 text-[11px] text-muted-foreground" style={{ left: `${m.x}%` }}>
                {m.label}
              </span>
            ))}
          {mineSorted.map((d, i) => (
            <span key={`d-${i}`} className="absolute top-10 h-3 w-3 rotate-45 bg-[#C9822B] outline outline-2 outline-white" style={{ left: `calc(${x(d)}% + ${i * 3}px)` }} />
          ))}
          {groups.map((g, gi) => (
            <span key={g[0]} className="absolute top-[62px] whitespace-nowrap pl-2 text-[11.5px] font-semibold leading-tight text-[#7A3F06]" style={place(x(g[0]))}>
              {groupLabel(g)}
              <br />
              <span className="font-normal">{g.length > 1 ? `your ${g.length} asks` : gi === 0 ? "your next ask" : "your ask"}</span>
            </span>
          ))}
          {returns.map((r) => (
            <span key={r.label}>
              <span className="absolute top-10 h-3 w-3 -translate-x-1/2 rotate-45 bg-foreground" style={{ left: `${x(r.date)}%` }} />
              <span className="absolute top-[62px] whitespace-nowrap text-[11.5px] leading-tight text-foreground" style={place(x(r.date))}>
                {long(r.date)}
                <br />
                <span className="text-muted-foreground">{r.label}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function formatValue(key: string, value: string) {
  return /date|return/.test(key) ? formatDate(value, { day: "numeric", month: "long", year: "numeric" }) ?? value : value;
}

function lowerFirst(s: string) {
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
