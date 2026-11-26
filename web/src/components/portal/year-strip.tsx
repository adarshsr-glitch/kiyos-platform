"use client";

/**
 * Year at a glance, the timeline. It answers one question: how did the move change things this
 * year, and what's coming? Three rows, each read in words on the bar itself, so there is no
 * colour code or legend to learn:
 *   Where you lived     Living in the US  |  Living in India (split at the move)
 *   India tax status    Non-resident · FY 2025-26  |  RNOR · FY 2026-27
 *   US tax status       US resident  |  US non-resident (a dual-status year splits at the move)
 * and the dates that matter (what's due from you, the returns) on one line underneath.
 * Where you lived is tinted by country; statuses are outlined, and a year not assessed yet is
 * dashed. One line marks today. Dates are diamonds: amber when they need the customer, dark for
 * returns, red when late. Every part opens the side panel with what it means and where it comes
 * from. Statuses are calculated by the rules engine from the travel record; nothing here is
 * worked out on screen.
 */

import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { Residency, ResidencyYear } from "@/lib/residency";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/side-sheet";
import type { YearEvent } from "./month-list";

const SHORT: Record<ResidencyYear["status"], string> = { NR: "Non-resident", RNOR: "RNOR", ROR: "Resident", RESIDENT: "US resident", DUAL: "Dual-status", NONRESIDENT: "US non-resident" };
const DAY = 86400000;
// Calendar maths in UTC so the server and the browser agree on every month and day.
const t = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
const d = (s: string) => formatDate(s, { day: "numeric", month: "short", year: "numeric" });

type Seg = { key: string; from: number; to: number; label: string; short: string; detail: Detail; country?: "IN" | "US"; later?: boolean };
type Detail = { eyebrow: string; title: string; lines: string[]; tests?: ResidencyYear["tests"] };

export function YearStrip({ residency, events, range, today, expert }: { residency: Residency; events: YearEvent[]; range: { start: number; end: number }; today: string; expert: string }) {
  const [open, setOpen] = useState<Detail | null>(null);
  const span = range.end - range.start;
  const pct = (ms: number) => `${(Math.min(Math.max(ms - range.start, 0), span) / span) * 100}%`;
  const width = (a: number, b: number) => `${((Math.min(b, range.end) - Math.max(a, range.start)) / span) * 100}%`;
  const now = t(today);
  const move = residency.facts.find((f) => f.key === "india_return_date")?.value ?? null;
  const moveT = move ? t(move) : null;
  const reviewed = (c: "IN" | "US") => residency.reviewed[c];

  /* where you lived */
  const lived: Seg[] = moveT
    ? [
        { key: "us", country: "US", from: range.start, to: moveT, label: "Living in the US", short: "US", detail: { eyebrow: "Where you lived", title: "Living in the US", lines: [`Until ${d(move!)}, when you moved to India.`, "From your profile (your return date)."] } },
        { key: "in", country: "IN", from: moveT, to: range.end, label: "Living in India", short: "India", detail: { eyebrow: "Where you lived", title: "Living in India", lines: [`From ${d(move!)}.`, "From your profile (your return date). Days after today are planned, and count once they happen."] } },
      ]
    : residency.stays
        .filter((s) => s.country === "IN")
        .map((s): Seg => ({ key: `stay-${s.id}`, country: "IN", from: t(s.arrived), to: s.departed ? t(s.departed) + DAY : range.end, label: "In India", short: "India", detail: { eyebrow: "Where you were", title: "In India", lines: [`${d(s.arrived)} to ${s.departed ? d(s.departed) : "now"}.`, `From ${s.source}.`] } }));

  /* tax status per country, from the rules engine */
  const statusSegs = (c: "IN" | "US"): Seg[] =>
    (c === "IN" ? residency.india : residency.us)
      .filter((y) => t(y.end) + DAY > range.start && t(y.start) < range.end)
      .flatMap((y): Seg[] => {
        const base = (label: string, from: number, to: number, extra: string[] = []): Seg => ({
          key: `${c}-${y.year}-${label}`,
          from,
          to,
          label: c === "IN" ? `${SHORT[y.status]} · ${y.year}` : label,
          short: c === "IN" ? SHORT[y.status] : label.replace("US ", ""),
          detail: {
            eyebrow: `${c === "IN" ? "India" : "US"} tax status · ${y.year}`,
            title: c === "IN" ? `${y.label} (${SHORT[y.status]})` : label,
            lines: [
              ...extra,
              `${y.days} day${y.days === 1 ? "" : "s"} in ${c === "IN" ? "India" : "the US"} in ${y.year}${y.projected ? ", including planned days" : ""}.`,
              reviewed(c) ? `Reviewed by ${reviewed(c)!.by}${reviewed(c)!.on ? ` on ${d(reviewed(c)!.on!)}` : ""}.` : `Calculated from your travel record; ${expert} reviews it.`,
            ],
            tests: y.tests,
          },
        });
        // A dual-status US year splits at the move: resident before, non-resident after.
        if (c === "US" && y.status === "DUAL" && moveT && moveT > t(y.start) && moveT < t(y.end)) {
          return [
            base("US resident", t(y.start), moveT, [`Resident for US tax until ${d(move!)}. ${y.year} is a dual-status year.`]),
            base("US non-resident", moveT, t(y.end) + DAY, [`Non-resident for US tax from ${d(move!)}. ${y.year} is a dual-status year.`]),
          ];
        }
        return [base(SHORT[y.status], t(y.start), t(y.end) + DAY, [y.label + "."])];
      })
      .concat(notYet(c));

  /* after the last calculated year: dashed, so the end of the strip is never mistaken for a status */
  function notYet(c: "IN" | "US"): Seg[] {
    const ys = c === "IN" ? residency.india : residency.us;
    const last = ys.length ? t(ys[ys.length - 1].end) + DAY : range.start;
    if (last >= range.end) return [];
    return [
      {
        key: `${c}-later`,
        from: last,
        to: range.end,
        label: "Not assessed yet",
        short: "Later",
        later: true,
        detail: { eyebrow: `${c === "IN" ? "India" : "US"} tax status`, title: "Not assessed yet", lines: [`Your ${c === "IN" ? "India" : "US"} status for this period is worked out once the year begins and your travel dates are in.`, `${expert} reviews it.`] },
      },
    ];
  }

  /* the dates that matter: what's due from you, and the returns */
  const marks = events
    .filter((e) => e.kind === "due" || e.kind === "filing")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ ...e, lane: i % 2 }));

  const months = Array.from({ length: Math.round(span / (30.44 * DAY)) }, (_, i) => {
    const m = new Date(range.start);
    m.setUTCMonth(m.getUTCMonth() + i);
    return m;
  });

  // A plain function, not a component: the rows must stay mounted when the panel opens and closes,
  // so focus can return to the part that was selected.
  const lane = (title: string, sub: string, segs: Seg[]) => (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
      <div>
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <p className="text-[11.5px] text-muted-foreground">{sub}</p>
      </div>
      <div className="relative h-8">
        {segs.map((s) => {
          const isNow = now >= s.from && now < s.to;
          const w = ((Math.min(s.to, range.end) - Math.max(s.from, range.start)) / span) * 100;
          if (w <= 0) return null;
          return (
            <button
              key={s.key}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(s.detail)}
              style={{ left: pct(s.from), width: width(s.from, s.to) }}
              className={cn(
                "absolute inset-y-0.5 overflow-hidden rounded-[5px] border px-2 text-left text-[12.5px] leading-[26px] transition-[filter] hover:brightness-95",
                s.country === "US" && "border-transparent bg-[#DCE4EE] text-[#1F3550]",
                s.country === "IN" && "border-transparent bg-[#DDEBE2] text-[#0F3D25]",
                !s.country && !s.later && "border-[#D9D5CA] bg-card text-foreground",
                s.later && "border-dashed border-[#B9B4A6] bg-transparent text-muted-foreground",
                isNow && !s.later && "font-medium"
              )}
            >
              <span className="block truncate">{w < 14 ? s.short : s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[720px] space-y-2.5">
          {/* months */}
          <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
            <span />
            <div className="relative h-5 text-[11.5px] text-muted-foreground">
              {months.map((m, i) => (
                // A month label right under "Today" would be covered by it, so it steps aside.
                <span key={i} className={cn("absolute", Math.abs(m.getTime() - now) < span * 0.035 && "invisible")} style={{ left: pct(m.getTime()) }}>
                  {m.getUTCMonth() === 0 ? <b className="font-semibold text-foreground">{m.getUTCFullYear()}</b> : m.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}
                </span>
              ))}
            </div>
          </div>

          <div className="relative space-y-2.5">
            {/* today, across every row */}
            {now >= range.start && now < range.end && (
              <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10 grid w-full grid-cols-[150px_minmax(0,1fr)] gap-3">
                <span />
                <div className="relative">
                  <span className="absolute -bottom-[84px] top-0 w-0.5 bg-primary" style={{ left: pct(now) }} />
                  <span className="absolute -top-5 -translate-x-1/2 rounded bg-primary px-1.5 text-[11px] font-medium text-primary-foreground" style={{ left: pct(now) }}>
                    Today
                  </span>
                </div>
              </div>
            )}
            {lived.length > 0 && lane("Where you lived", "from your profile", lived)}
            {lane("India tax status", "April to March", statusSegs("IN"))}
            {lane("US tax status", "January to December", statusSegs("US"))}
          </div>

          {/* the dates that matter */}
          {marks.length > 0 && (
            <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 pt-1">
              <div>
                <p className="text-[13px] font-medium text-foreground">Dates</p>
                <p className="text-[11.5px] text-muted-foreground">yours in amber, returns in black</p>
              </div>
              <div className="relative h-[76px] border-t">
                {marks.map((m, i) => {
                  const late = m.date < today && m.kind === "due";
                  // Near the right edge the label reads leftwards from its diamond, so it is never cut off.
                  const atEnd = (t(m.date) - range.start) / span > 0.82;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setOpen({ eyebrow: m.kind === "filing" ? "Return" : "Due from you", title: m.title, lines: [d(m.date) ?? m.date, ...(m.sub ? [m.sub] : [])] })}
                      style={atEnd ? { right: `calc(100% - ${pct(t(m.date))})`, top: m.lane ? 38 : 4 } : { left: pct(t(m.date)), top: m.lane ? 38 : 4 }}
                      className={cn("absolute flex max-w-[190px] items-start gap-1.5 hover:underline", atEnd ? "translate-x-[5px] flex-row-reverse text-right" : "-translate-x-[5px] text-left")}
                    >
                      <span className={cn("mt-[3px] h-2.5 w-2.5 shrink-0 rotate-45", late ? "bg-rose-600" : m.kind === "filing" ? "bg-foreground" : "bg-[#C9822B]")} />
                      <span className="text-[12px] leading-tight">
                        <span className={cn("block font-semibold tabular-nums", late ? "text-rose-700" : m.kind === "filing" ? "text-foreground" : "text-[#7A3F06]")}>{formatDate(m.date, { day: "numeric", month: "short" })}</span>
                        <span className="line-clamp-2 text-foreground">{m.kind === "filing" ? m.title.split(" · ")[0] : m.title.replace(/ due$/, "")}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">Select any part for what it means.</p>

      <SideSheet open={!!open} onClose={() => setOpen(null)} eyebrow={open?.eyebrow} title={open?.title ?? ""}>
        {open && (
          <div className="space-y-3 text-[14px]">
            {open.lines.map((l, i) => (
              <p key={i} className={cn("leading-relaxed", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                {l}
              </p>
            ))}
            {open.tests && open.tests.length > 0 && (
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">How it was worked out</p>
                <ul className="divide-y rounded-lg border text-[13px]">
                  {open.tests.map((r) => (
                    <li key={r.rule_id} className="px-3.5 py-2.5">
                      <p className="text-foreground">{r.summary}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {r.passed ? "Applies" : "Doesn't apply"} · section {r.section} · rule {r.rule_id}
                        {r.rule_status === "pending_validation" ? " · rule awaiting the tax team's validation" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SideSheet>
    </>
  );
}
