"use client";

/**
 * Case timeline: where the person was, which tax years apply, and what's due, on one
 * month axis. Built only from recorded stays, calculated residency years and real dates.
 *
 * Every mark is interactive: hover or focus shows what it is; with `onSelect`, a click
 * hands the item to the page (the customer workspace opens it in a side panel).
 */

import { cn } from "@/lib/utils";
import type { ResidencyYear } from "@/lib/residency";

export type Stay = { arrived: string; departed: string | null; source: string };
export type Deadline = { id?: string; date: string; label: string; kind: string };
export type GanttSelection =
  | { type: "deadline"; item: Deadline }
  | { type: "year"; country: "IN" | "US"; year: ResidencyYear }
  | { type: "stay"; stay: Stay }
  | { type: "return"; date: string };

const ms = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00").getTime();
const short = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const shortY = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const TONE: Record<string, string> = {
  NR: "bg-sky-200", NONRESIDENT: "bg-sky-200", RNOR: "bg-violet-300", DUAL: "bg-violet-300", ROR: "bg-emerald-300", RESIDENT: "bg-emerald-300",
};
const KIND: Record<string, string> = { filing: "bg-rose-500", document: "bg-amber-500", review: "bg-sky-600" };
/** Plain words for each status, so the bars don't need a glossary. */
const STATUS_WORD: Record<string, string> = {
  NR: "Non-resident", NONRESIDENT: "Non-resident", RNOR: "RNOR", ROR: "Resident", RESIDENT: "Resident", DUAL: "Part-year",
};
/** Legend wording: one line per colour, so RNOR and part-year are explained once. */
const LEGEND_WORD: Record<string, string> = {
  NR: "Non-resident", NONRESIDENT: "Non-resident", RNOR: "RNOR / part-year (between the two)", DUAL: "RNOR / part-year (between the two)", ROR: "Resident", RESIDENT: "Resident",
};
export const KIND_LABEL: Record<string, string> = { filing: "Return due", document: "Document due", review: "Expert step" };

/** A small label shown on hover or keyboard focus of its parent (`group`). */
function Tip({ title, sub, hint }: { title: string; sub?: string; hint?: boolean }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-left text-[11.5px] leading-snug text-background shadow-lg group-hover:block group-focus-visible:block"
    >
      <span className="block font-medium">{title}</span>
      {sub && <span className="block whitespace-pre-line opacity-75">{sub}</span>}
      {hint && <span className="mt-0.5 block opacity-60">Click for details</span>}
    </span>
  );
}

export function CaseGantt({
  stays,
  india,
  us,
  deadlines,
  returnDate,
  onSelect,
  listLimit = 6,
  range,
}: {
  stays: Stay[];
  india: ResidencyYear[];
  us: ResidencyYear[];
  deadlines: Deadline[];
  returnDate?: string | null;
  onSelect?: (s: GanttSelection) => void;
  /** How many upcoming dates to list under the chart (0 hides the list). */
  listLimit?: number;
  /** Show only this window (e.g. one tax year), in ms since epoch. */
  range?: { start: number; end: number };
}) {
  const now = new Date();
  const start = range?.start ?? new Date(now.getFullYear(), now.getMonth() - 14, 1).getTime();
  const end = range?.end ?? new Date(now.getFullYear(), now.getMonth() + 22, 1).getTime();
  const everyMonth = end - start < 18 * 31 * 864e5;
  const x = (t: number) => Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100));
  const months: { label: string; left: number; year: boolean }[] = [];
  for (let d = new Date(start); d.getTime() < end; d.setMonth(d.getMonth() + 1)) {
    const jan = d.getMonth() === 0;
    months.push({ label: jan ? String(d.getFullYear()) : everyMonth || d.getMonth() % 3 === 0 ? d.toLocaleDateString("en-GB", { month: "short" }) : "", left: x(d.getTime()), year: jan });
  }
  // Start of today, not the current millisecond, so the server and browser renders match.
  const todayLeft = `${x(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())}%`;
  const bar = (a: string, b: string | null) => {
    const l = x(ms(a));
    const r = x(b ? ms(b) : end);
    return { left: `${l}%`, width: `${Math.max(r - l, 0.6)}%` };
  };
  const clickable = !!onSelect;
  const pick = (s: GanttSelection) => onSelect?.(s);

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 sm:grid-cols-[150px_1fr]">
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12px] font-medium text-foreground/80">{label}</span>
        {sub && <span className="block truncate text-[10.5px] text-muted-foreground">{sub}</span>}
      </span>
      <div className="relative h-8 rounded bg-muted/40">
        {months.filter((m) => m.year).map((m) => (
          <span key={m.left} className="pointer-events-none absolute inset-y-0 w-px bg-foreground/10" style={{ left: `${m.left}%` }} />
        ))}
        {children}
        <span className="pointer-events-none absolute -inset-y-1 w-px bg-foreground/60" style={{ left: todayLeft }} />
      </div>
    </div>
  );

  const yearBar = (country: "IN" | "US", y: ResidencyYear, text: string) => (
    <button
      key={y.year}
      type="button"
      onClick={() => pick({ type: "year", country, year: y })}
      className={cn("group absolute inset-y-1 flex items-center rounded px-1.5 text-[10px] font-semibold text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40", TONE[y.status], clickable ? "cursor-pointer hover:brightness-95" : "cursor-default")}
      style={bar(y.start, y.end)}
    >
      <span className="truncate">{text}</span>
      <Tip title={`${y.year}: ${y.label}`} sub={`${y.days} days in ${country === "IN" ? "India" : "the US"}${y.projected ? " · includes planned dates" : ""}`} hint={clickable} />
    </button>
  );

  const groups: { left: number; items: Deadline[] }[] = [];
  for (const d of [...deadlines].sort((a, b) => a.date.localeCompare(b.date))) {
    const left = x(ms(d.date));
    const last = groups[groups.length - 1];
    if (last && left - last.left < 2.2) last.items.push(d);
    else groups.push({ left, items: [d] });
  }
  const tone = (st: string) => TONE[st];
  // One legend entry per colour present, in the order the statuses first appear.
  const legendTones: string[] = [];
  for (const y of [...india, ...us]) if (!legendTones.some((st) => tone(st) === tone(y.status))) legendTones.push(y.status);
  const upcoming = deadlines.filter((d) => ms(d.date) >= ms(now.toISOString())).slice(0, listLimit);

  return (
    <div className="overflow-x-auto overflow-y-visible pt-10 -mt-10">
      <div className="min-w-[640px] space-y-1.5">
        <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[150px_1fr]">
          <span />
          <div className="relative h-6">
            <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-foreground px-1 text-[9.5px] font-semibold leading-4 text-background" style={{ left: todayLeft }}>Today</span>
            {months.map((m, i) => (
              <span key={i} className={cn("absolute bottom-0 text-[10px]", m.year ? "font-semibold text-foreground" : "text-muted-foreground")} style={{ left: `${m.left}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <Row label="Time in India" sub="from the travel record">
          {stays.map((s) => (
            <button
              key={s.arrived}
              type="button"
              onClick={() => pick({ type: "stay", stay: s })}
              className={cn("group absolute inset-y-1 rounded bg-[#ff9933]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40", clickable ? "cursor-pointer" : "cursor-default")}
              style={bar(s.arrived, s.departed)}
            >
              <Tip title={`${short(s.arrived)} – ${s.departed ? short(s.departed) : "ongoing"}`} sub={`In India · ${s.source}`} hint={clickable} />
            </button>
          ))}
          {returnDate && (
            <button
              type="button"
              onClick={() => pick({ type: "return", date: returnDate })}
              className={cn("group absolute inset-y-0.5 rounded bg-[#ff9933]/45 ring-1 ring-inset ring-[#ff9933] focus-visible:outline-none", clickable ? "cursor-pointer" : "cursor-default")}
              style={bar(returnDate, null)}
            >
              <Tip title={`Back in India from ${shortY(returnDate)}`} sub="Planned return: counted as days in India" hint={clickable} />
            </button>
          )}
        </Row>
        <Row label="India tax year" sub="April to March">{india.map((y) => yearBar("IN", y, `${y.year.replace("FY ", "")} · ${STATUS_WORD[y.status] ?? y.status}`))}</Row>
        {us.length > 0 && (
          <Row label="US tax year" sub="January to December">
            {us.map((y) => yearBar("US", y, `${y.year} · ${STATUS_WORD[y.status] ?? y.status}`))}
          </Row>
        )}
        <Row label="Key dates" sub="what's due, and by whom">
          {groups.map((g) => {
            const d = g.items[0];
            const many = g.items.length > 1;
            return (
              <button
                key={(d.id ?? d.label) + d.date}
                type="button"
                onClick={() => pick({ type: "deadline", item: d })}
                aria-label={g.items.map((i) => `${KIND_LABEL[i.kind] ?? "Date"}: ${i.label}, ${shortY(i.date)}`).join("; ")}
                className={cn("group absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:outline-none", clickable ? "cursor-pointer" : "cursor-default")}
                style={{ left: `${g.left}%` }}
              >
                <i className={cn("block h-3.5 w-3.5 rotate-45 rounded-[2px] ring-2 ring-card transition-transform group-hover:scale-125 group-focus-visible:scale-125", KIND[d.kind] ?? "bg-foreground")} />
                {many && <span className="absolute -right-1.5 -top-1 rounded-full bg-foreground px-1 text-[9px] font-semibold leading-[14px] text-background">{g.items.length}</span>}
                <Tip
                  title={many ? `${g.items.length} dates` : d.label}
                  sub={g.items.map((i) => (many ? `${short(i.date)} · ${i.label}` : `${KIND_LABEL[i.kind] ?? "Date"} · ${shortY(i.date)}`)).join("\n")}
                  hint={clickable && !many}
                />
              </button>
            );
          })}
        </Row>

        <div className="space-y-1 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-[110px] font-medium text-foreground/70 sm:w-[150px]">Time in India</span>
            <span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-[#ff9933]/80" /> In India (recorded)</span>
            {returnDate && <span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-[#ff9933]/45 ring-1 ring-inset ring-[#ff9933]" /> In India (planned)</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-[110px] font-medium text-foreground/70 sm:w-[150px]">Tax status</span>
            {legendTones.map((st) => (
              <span key={st} className="flex items-center gap-1"><i className={cn("h-2 w-4 rounded", tone(st))} /> {LEGEND_WORD[st] ?? st}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-[110px] font-medium text-foreground/70 sm:w-[150px]">Dates</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-rose-500" /> Return due</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-amber-500" /> Document due</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-sky-600" /> Expert step</span>
          </div>
        </div>
        {listLimit > 0 && upcoming.length > 0 && (
          <ul className="grid gap-x-6 gap-y-0.5 pt-1 text-[12.5px] sm:grid-cols-2">
            {upcoming.map((d) => (
              <li key={(d.id ?? d.label) + d.date}>
                <button
                  type="button"
                  onClick={() => pick({ type: "deadline", item: d })}
                  className={cn("flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left", clickable && "hover:bg-muted")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <i className={cn("h-2 w-2 shrink-0 rotate-45", KIND[d.kind] ?? "bg-foreground")} />
                    <span className="truncate">{d.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{short(d.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
