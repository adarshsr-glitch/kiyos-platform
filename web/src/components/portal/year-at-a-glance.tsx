/**
 * Year at a glance answers "when": the timeline (trips, residency per country, dated steps;
 * each opens the side panel) and every event month by month, each row opening the panel.
 * Tax figures live on Tax position, not here (one full home per fact, Review 05). Everything is
 * read from the same records as Profile, Tax position and Documents; nothing is kept here.
 */

import type { CaseDetail, DocumentRequest, Ticket } from "@/lib/types";
import type { Residency, ResidencyYear } from "@/lib/residency";
import Link from "next/link";
import { Plane } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionOf } from "@/lib/position";
import { hasCaptain } from "@/lib/captain";
import { cn } from "@/lib/utils";
import { YearStrip } from "./year-strip";
import { EventTiles, type YearEvent } from "./month-list";
import { CountryCode } from "./visual";

type Event = YearEvent;

export function YearAtAGlance({ caseData, requests, tickets, residency, year }: { caseData: CaseDetail; requests: DocumentRequest[]; tickets: Ticket[]; residency: Residency | null; year?: number }) {
  const lead = hasCaptain(caseData.case_captain) ? caseData.case_captain : "Kiyos";
  const first = lead.split(" ")[0];
  const positions = { IN: positionOf(caseData, residency, "IN"), US: positionOf(caseData, residency, "US") };
  const fact = (k: string) => caseData.facts.find((f) => f.key === k)?.value ?? null;
  const day = (s: string) => s.slice(0, 10);

  const events: Event[] = [];
  for (const s of residency?.stays ?? []) {
    events.push({ date: s.arrived, kind: "travel", title: "Arrived in India", sub: s.source, country: "IN" });
    if (s.departed) events.push({ date: s.departed, kind: "travel", title: "Left India", sub: s.source, country: "IN" });
  }
  const moved = fact("india_return_date");
  if (moved) events.push({ date: moved, kind: "move", title: "Moved to India", sub: fact("us_employer") && fact("india_employer") ? `${fact("us_employer")} until then, ${fact("india_employer")} after` : "Residency in both countries changes from here", country: "BOTH" });
  for (const d of caseData.documents) {
    if (!d.created_at) continue;
    events.push({ date: day(d.created_at), kind: "document", title: `Sent ${d.filename}`, sub: d.status === "reviewed" ? `Reviewed by ${first}` : d.status === "rejected" ? "A new copy was needed" : `Read by Kiyos · ${first} is checking it` });
  }
  for (const r of requests) {
    if (r.due_date && (r.status === "pending" || r.status === "rejected")) events.push({ date: r.due_date, kind: "due", title: `${r.title} due`, sub: r.why, country: r.country, open: true });
  }
  for (const i of caseData.action_items.filter((i) => i.assignee === "customer" && i.status !== "done" && i.due_date)) {
    events.push({ date: i.due_date!, kind: "due", title: i.title, sub: i.notes === "clarification" ? `${first} asked this on WhatsApp` : i.notes, open: true });
  }
  for (const t of tickets) {
    events.push({ date: day(t.created_at), kind: "question", title: "You asked a question", sub: `“${t.question}”` });
    if (t.resolved_at) events.push({ date: day(t.resolved_at), kind: "expert", title: `${t.resolved_by ?? first} answered`, sub: t.resolution });
  }
  for (const a of caseData.assessments.filter((a) => a.status === "signed_off")) events.push({ date: day(a.updated_at), kind: "expert", title: "Signed off", sub: a.headline });
  for (const i of caseData.action_items.filter((i) => i.assignee !== "customer" && i.status !== "done" && i.due_date)) events.push({ date: i.due_date!, kind: "expert", title: i.title, sub: `${first}'s step`, open: true });
  for (const t of caseData.topics.filter((t) => t.status !== "resolved" && t.due_date)) events.push({ date: t.due_date!, kind: "expert", title: t.title, sub: t.next_action, open: true });
  for (const c of ["IN", "US"] as const) {
    const p = positions[c];
    if (p.due) events.push({ date: p.due, kind: "filing", title: `${c === "IN" ? "India" : "US"} return due${p.filing ? ` · ${p.filing}` : ""}`, sub: p.stage, country: c });
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisYear = new Date().getFullYear();
  // One year at a time: January to the following July covers the US calendar year, the India
  // financial year that starts in it, and both returns' due dates for them.
  const Y = year ?? thisYear;
  const from = `${Y}-01-01`;
  const to = `${Y + 1}-08-01`;
  const range = { start: Date.parse(`${from}T00:00:00Z`), end: Date.parse(`${to}T00:00:00Z`) };
  const dated = events.filter((e) => e.date);
  const firstYear = Math.max(thisYear - 5, Math.min(thisYear, ...dated.map((e) => Number(e.date.slice(0, 4)))));
  const years = Array.from({ length: thisYear + 1 - firstYear + 1 }, (_, i) => firstYear + i);
  const sorted = dated.filter((e) => e.date >= from && e.date < to).sort((a, b) => a.date.localeCompare(b.date));
  const months = new Map<string, Event[]>();
  for (const e of sorted) {
    const k = e.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), e]);
  }
  // Several documents sent in one month read as one row; the panel lists them.
  for (const [k, list] of Array.from(months.entries())) {
    const docs = list.filter((e) => e.kind === "document");
    if (docs.length < 2) continue;
    const reviewed = docs.filter((e) => e.sub?.startsWith("Reviewed")).length;
    const grouped: Event = {
      date: docs[docs.length - 1].date,
      kind: "document",
      title: `Sent ${docs.length} documents`,
      sub: `${reviewed} of ${docs.length} reviewed by ${first}`,
      names: docs.map((e) => e.title.replace(/^Sent /, "")),
    };
    months.set(k, [...list.filter((e) => e.kind !== "document"), grouped].sort((a, b) => a.date.localeCompare(b.date)));
  }
  const grouped = Array.from(months.values()).flat();
  // Anything still open stays in Coming up, however late; only finished or passed events fold away.
  const upcoming = grouped.filter((e) => e.open || e.date > today);
  const past = grouped.filter((e) => !e.open && e.date <= today).reverse();
  const movedInRange = moved && moved >= from && moved < to ? moved : null;

  // Days in each country for the years that start in the chosen one (from the rules engine).
  const inYear = residency?.india.find((y) => y.start.startsWith(`${Y}-`)) ?? null;
  const usYear = residency?.us.find((y) => y.year === String(Y)) ?? null;

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">Year at a glance</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {movedInRange
              ? movedInRange <= today
                ? `Your move on ${formatDate(movedInRange, { day: "numeric", month: "short", year: "numeric" })} split this tax year in two.`
                : `You move to India on ${formatDate(movedInRange, { day: "numeric", month: "short", year: "numeric" })}. Here is what changes.`
              : `${Y}: ${past.length} done, ${upcoming.length} coming.`}
          </p>
        </div>
        <nav aria-label="Choose a year" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/portal/year?y=${y}`}
              aria-current={y === Y ? "page" : undefined}
              className={cn("rounded-full px-3.5 py-1.5 text-[13px] tabular-nums", y === Y ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {y}
            </Link>
          ))}
        </nav>
      </section>

      {residency && (residency.stays.length > 0 || residency.facts.length > 0) ? (
        <section aria-labelledby="h-timeline" className="rounded-[14px] border bg-card px-5 pb-4 pt-4 sm:px-[22px]">
          <div className="mb-7 flex items-baseline justify-between gap-4">
            <h2 id="h-timeline" className="text-[16px] font-semibold text-foreground">
              {movedInRange ? "Your move, and what it changed" : "Where you were, and your status"}
            </h2>
            <Link href="/portal/tax-position" className="text-[13px] font-medium text-primary hover:underline">
              Tax position →
            </Link>
          </div>
          <YearStrip residency={residency} events={sorted} range={range} today={today} expert={first} />
        </section>
      ) : (
        <p className="rounded-[14px] border bg-card px-6 py-5 text-[14px] text-muted-foreground">Your trips and residency appear here once your travel dates or passport pages are in.</p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-labelledby="h-dates" className="rounded-[14px] border bg-card px-[22px] pb-3 pt-4">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h2 id="h-dates" className="text-[16px] font-semibold text-foreground">
              Coming up
            </h2>
            <span className="text-[12.5px] text-muted-foreground">
              {upcoming.length} {upcoming.length === 1 ? "date" : "dates"}
            </span>
          </div>
          <EventTiles upcoming={upcoming} past={past} today={today} customer={caseData.client_name} expert={lead} />
        </section>

        {(inYear || usYear) && (
          <section aria-labelledby="h-days" className="rounded-[14px] border bg-card px-[22px] py-[18px]">
            <h2 id="h-days" className="text-[16px] font-semibold text-foreground">
              Days in each country
            </h2>
            {inYear && <DaysBar code="IN" year={inYear} move={moved} />}
            {usYear && <DaysBar code="US" year={usYear} move={moved} divided={!!inYear} />}
            <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Plane className="h-3.5 w-3.5" aria-hidden />
              From your travel record{inYear?.projected || usYear?.projected ? "; days after today are planned" : ""}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * One country's days in the year, as a large number and a bar across the year. The filled part
 * sits where the days fall: after the move for India, before it for the US. Counted by the rules
 * engine from the travel record; nothing is worked out here.
 */
function DaysBar({ code, year, move, divided }: { code: "IN" | "US"; year: ResidencyYear; move: string | null; divided?: boolean }) {
  const start = Date.parse(year.start + "T00:00:00Z");
  const end = Date.parse(year.end + "T00:00:00Z") + 86_400_000;
  const len = (end - start) / 86_400_000;
  const share = Math.min(1, year.days / len);
  const m = move ? Date.parse(move + "T00:00:00Z") : null;
  const splitAtMove = m !== null && m > start && m < end;
  // India days follow the move; US days come before it. Otherwise the bar fills from the start.
  const offset = splitAtMove && code === "IN" ? Math.max(0, 1 - share) : 0;
  const note = splitAtMove ? (code === "IN" ? `from ${formatDate(move, { day: "numeric", month: "short" })}` : `to ${formatDate(new Date(m! - 86_400_000).toISOString().slice(0, 10), { day: "numeric", month: "short" })}`) : null;
  return (
    <div className={cn("mt-4", divided && "border-t pt-4")}>
      <p className="flex items-center gap-2 text-[13px]">
        <CountryCode code={code} />
        {year.year}
        <span className="text-muted-foreground">· {code === "IN" ? "Apr–Mar" : "Jan–Dec"}</span>
      </p>
      <p className="my-2 flex items-baseline gap-2">
        <span className="font-serif text-[34px] leading-none text-foreground">{year.days}</span>
        <span className="text-[13px] text-muted-foreground">days{note ? `, ${note}` : ""}</span>
      </p>
      <div role="img" aria-label={`${year.days} of ${Math.round(len)} days in ${code === "IN" ? "India" : "the US"}`} className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <span style={{ width: `${offset * 100}%` }} />
        <span className={code === "IN" ? "bg-[#5E8F73]" : "bg-[#6F8BAD]"} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}
