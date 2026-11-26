/**
 * The expert's portfolio at a glance, built to hold hundreds of customers: what's due in
 * the next five months as a count per week (one bar per week, split by kind), with the
 * dates in the chosen week listed below it; where documents are in the pipeline; and the
 * India residency mix. All from case records; nothing is per-customer in the chart itself.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { DonutMiniChart } from "@/components/mini-chart";
import { cn } from "@/lib/utils";

export type Portfolio = {
  deadlines: { case_id: number; client: string; date: string; label: string; kind: string }[];
  pipeline: Record<string, number>;
  residency_mix: Record<string, number>;
  documented_money?: unknown;
  customers: number;
};

const KINDS = [
  { key: "filing", label: "Filing", color: "#e11d48" },
  { key: "review", label: "Your review", color: "#0284c7" },
  { key: "document", label: "Document due", color: "#f59e0b" },
] as const;
const PIPE: Record<string, string> = { Requested: "#f59e0b", Received: "#60a5fa", Read: "#6366f1", Accepted: "#0F5132", "Needs new copy": "#e11d48" };
const MIX: Record<string, string> = { NR: "#7dd3fc", RNOR: "#a78bfa", ROR: "#6ee7b7", Other: "#d4d4d8" };
const WEEKS = 22;
const DAY = 864e5;
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Panel({ title, sub, children, className, right }: { title: string; sub?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {sub && <p className="text-[11.5px] text-muted-foreground">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PortfolioCharts({ data }: { data: Portfolio }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday of this week
  const weeks = Array.from({ length: WEEKS }, (_, w) => {
    const from = new Date(start.getTime() + w * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const items = data.deadlines.filter((d) => {
      const t = new Date(d.date + "T00:00:00").getTime();
      return t >= from.getTime() && t < to.getTime();
    });
    return { from, items, counts: KINDS.map((k) => items.filter((d) => d.kind === k.key).length) };
  });
  const max = Math.max(1, ...weeks.map((w) => w.items.length));
  const firstBusy = Math.max(0, weeks.findIndex((w) => w.items.length > 0));
  const [sel, setSel] = useState(firstBusy);
  const week = weeks[sel];
  const customers = new Set(data.deadlines.map((d) => d.case_id)).size;
  const pipeTotal = Object.values(data.pipeline).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel
        title="Coming up, week by week"
        sub={`${data.deadlines.length} dates across ${customers} customers in the next five months · pick a week to see them`}
        className="xl:col-span-2"
        right={
          <div className="flex shrink-0 gap-3 text-[11px] text-muted-foreground">
            {KINDS.map((k) => (
              <span key={k.key} className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{ background: k.color }} /> {k.label}</span>
            ))}
          </div>
        }
      >
        <div className="flex h-[96px] items-end gap-[3px]" role="tablist" aria-label="Weeks">
          {weeks.map((w, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === sel}
              aria-label={`Week of ${short(w.from)}: ${w.items.length} dates`}
              title={`Week of ${short(w.from)} · ${w.items.length} date${w.items.length === 1 ? "" : "s"}`}
              onClick={() => setSel(n)}
              className={cn("group flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm px-[1px]", n === sel ? "bg-muted" : "hover:bg-muted/60")}
            >
              <span className="flex w-full flex-col-reverse gap-[2px]" style={{ height: `${(w.items.length / max) * 100}%` }}>
                {w.counts.map((c, k) =>
                  c ? <i key={k} className="block w-full rounded-[2px]" style={{ flexGrow: c, background: KINDS[k].color, opacity: n === sel ? 1 : 0.75 }} /> : null
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px] text-[10px] text-muted-foreground">
          {weeks.map((w, n) => (
            <span key={n} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">{w.from.getDate() <= 7 ? w.from.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
          ))}
        </div>

        <div className="mt-4 border-t pt-3">
          <p className="text-[12px] font-medium text-foreground">
            Week of {short(week.from)} <span className="font-normal text-muted-foreground">· {week.items.length || "no"} date{week.items.length === 1 ? "" : "s"}</span>
          </p>
          {week.items.length > 0 && (
            <ul className="mt-2 divide-y">
              {week.items.slice(0, 6).map((d, k) => (
                <li key={k}>
                  <Link href={`/expert/cases/${d.case_id}`} className="flex items-center gap-3 py-1.5 text-[12.5px] hover:text-primary">
                    <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: KINDS.find((x) => x.key === d.kind)?.color ?? "#71717a" }} />
                    <span className="w-14 shrink-0 tabular-nums text-muted-foreground">{short(new Date(d.date + "T00:00:00"))}</span>
                    <span className="w-36 shrink-0 truncate font-medium">{d.client}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {week.items.length > 6 && (
            <Link href="/expert/cases" className="mt-1 inline-block text-[12px] font-medium text-primary hover:underline">and {week.items.length - 6} more</Link>
          )}
        </div>
      </Panel>

      <Panel title="Document pipeline" sub="Every requested document, all customers">
        <div className="flex h-3 overflow-hidden rounded-full">
          {Object.entries(data.pipeline).filter(([, v]) => v > 0).map(([k, v]) => (
            <span key={k} title={`${k}: ${v}`} style={{ width: `${(v / pipeTotal) * 100}%`, background: PIPE[k] }} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px]">
          {Object.entries(data.pipeline).map(([k, v]) => (
            <li key={k} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: PIPE[k] }} /> {k} <b className="ml-auto pr-4 tabular-nums">{v}</b></li>
          ))}
        </ul>
        <div className="mt-5 border-t pt-4">
          <h3 className="text-[13px] font-semibold">India status this year</h3>
          <p className="text-[11.5px] text-muted-foreground">Calculated from each customer&apos;s travel record</p>
          <div className="mt-3 flex items-center gap-4">
            <DonutMiniChart size={88} thickness={12} segments={Object.entries(data.residency_mix).map(([k, v]) => ({ label: k, value: v, color: MIX[k] ?? MIX.Other }))} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
