"use client";

/**
 * Residency Clock: each year's India and US status on one time axis, calculated
 * from the recorded travel history. Read-only: there is nothing to drag. Tapping a
 * year opens the rules that produced it, the inputs they saw and where those came from.
 */

import { useState } from "react";
import { CheckCircle2, CircleSlash, FileText, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/side-sheet";
import { STATUS_SHORT, type Residency, type ResidencyYear } from "@/lib/residency";
import { Cite } from "@/components/source/cite";
import { daysNode } from "@/components/source/nodes";

const TONE: Record<ResidencyYear["status"], string> = {
  NR: "bg-sky-100 text-sky-900 ring-sky-300",
  NONRESIDENT: "bg-sky-100 text-sky-900 ring-sky-300",
  RNOR: "bg-violet-100 text-violet-900 ring-violet-300",
  DUAL: "bg-violet-100 text-violet-900 ring-violet-300",
  ROR: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  RESIDENT: "bg-emerald-100 text-emerald-900 ring-emerald-300",
};

const ms = (iso: string) => new Date(iso + "T00:00:00").getTime();
const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const INPUT_LABEL: Record<string, string> = {
  days_in_india: "Days in India this year",
  days_in_india_prev4: "Days in India, previous 4 years",
  days_in_india_prev7: "Days in India, previous 7 years",
  visit_exception_applies: "Only visiting India this year",
  previous_year_statuses: "Status in the previous 10 years",
  green_card_in_year: "Held a green card this year",
  days_in_us: "Days in the US this year",
  days_in_us_prev1: "Days in the US last year",
  days_in_us_prev2: "Days in the US the year before",
};

function inputValue(v: unknown) {
  if (Array.isArray(v)) return v.join(" · ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** `namedReviewers` (expert side) names the specialist; customers see one expert, so just "Expert-reviewed". */
export function ResidencyClock({ data, compact, namedReviewers = false }: { data: Residency; compact?: boolean; namedReviewers?: boolean }) {
  const [open, setOpen] = useState<{ country: "IN" | "US"; year: ResidencyYear } | null>(null);
  const all = [...data.india, ...data.us];
  if (!all.length) return null;
  const min = Math.min(...all.map((y) => ms(y.start)));
  const max = Math.max(...all.map((y) => ms(y.end)));
  const pos = (iso: string) => ((ms(iso) - min) / (max - min)) * 100;
  const today = new Date().toISOString().slice(0, 10);
  const ret = data.facts.find((f) => f.key === "india_return_date");
  const pending = data.pending_changes.find((c) => c.fact_key === "india_return_date");

  const lane = (country: "IN" | "US", years: ResidencyYear[]) => (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[12px] font-medium text-muted-foreground">{country === "IN" ? "🇮🇳 India" : "🇺🇸 US"}</span>
      <div className="relative h-[58px] flex-1">
        {years.map((y) => (
          <button
            key={y.year}
            onClick={() => setOpen({ country, year: y })}
            style={{ left: `${pos(y.start)}%`, width: `calc(${pos(y.end) - pos(y.start)}% - 3px)` }}
            className={cn(
              "absolute inset-y-0 overflow-hidden rounded-lg px-2 py-1.5 text-left ring-1 ring-inset transition-shadow hover:shadow-md",
              TONE[y.status],
              y.projected && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(255,255,255,0.55)_6px,rgba(255,255,255,0.55)_12px)]"
            )}
            title={`${y.year}: ${y.label}`}
          >
            <span className="block truncate text-[11px] font-medium opacity-80">{y.year}</span>
            <span className="block truncate text-[13px] font-semibold leading-tight">{STATUS_SHORT[y.status]}</span>
            {!compact && <span className="block truncate text-[11px] opacity-80">{y.days} days{y.projected ? " · projected" : ""}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  const reviewedLine = (code: "IN" | "US") => {
    const r = data.reviewed[code];
    if (!r) return "Calculated, not yet reviewed";
    const base = `${namedReviewers ? `Reviewed by ${r.by}` : "Expert-reviewed"}${r.on ? `, ${fmt(r.on)}` : ""}`;
    return r.stale ? `${base}, before your latest change. Recheck pending` : base;
  };

  const list = (country: "IN" | "US", years: ResidencyYear[]) => (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{country === "IN" ? "🇮🇳 India (Apr–Mar years)" : "🇺🇸 US (calendar years)"}</p>
      <ul className="space-y-1.5">
        {years.map((y) => (
          <li key={y.year}>
            <button
              onClick={() => setOpen({ country, year: y })}
              className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ring-1 ring-inset", TONE[y.status])}
            >
              <span className="text-[13px] font-medium">{y.year}{y.current ? " · now" : ""}</span>
              <span className="text-right text-[13px] font-semibold">
                {STATUS_SHORT[y.status]}
                <span className="block text-[11px] font-normal opacity-80">{y.days} days{y.projected ? " · projected" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <div className="space-y-4 sm:hidden">
        {list("IN", data.india)}
        {data.us.length > 0 && list("US", data.us)}
        {ret && <p className="text-[12px] text-primary">Return to India: {fmt(ret.value)}</p>}
        {pending && <p className="text-[12px] text-amber-800">Proposed: {fmt(pending.to)}, not applied until confirmed</p>}
      </div>
      <div className="relative hidden space-y-2 sm:block">
        {lane("IN", data.india)}
        {data.us.length > 0 && lane("US", data.us)}
        <div className="pointer-events-none absolute inset-y-0 left-[68px] right-0">
          {today >= new Date(min).toISOString().slice(0, 10) && today <= new Date(max).toISOString().slice(0, 10) && (
            <div className="absolute inset-y-[-6px] w-px bg-foreground/70" style={{ left: `${pos(today)}%` }}>
              <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1 text-[10px] font-medium text-background">Today</span>
            </div>
          )}
          {ret && (
            <div className="absolute inset-y-[-6px] w-0 border-l-2 border-primary" style={{ left: `${pos(ret.value)}%` }}>
              <span className="absolute -bottom-5 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-primary">Return {fmt(ret.value)}</span>
            </div>
          )}
          {pending && (
            <div className="absolute inset-y-[-6px] w-0 border-l-2 border-dashed border-amber-500" style={{ left: `${pos(pending.to)}%` }}>
              <span className="absolute -bottom-5 -translate-x-1/2 whitespace-nowrap rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-800">Proposed {fmt(pending.to)}</span>
            </div>
          )}
        </div>
      </div>

      <div className={cn("mt-7 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground", compact && "mt-6")}>
        <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> India: {reviewedLine("IN")}</span>
        {data.us.length > 0 && <span>US: {reviewedLine("US")}</span>}
        {pending && <span className="text-amber-800">A proposed date change isn&apos;t applied until you confirm it.</span>}
        {!compact && <span>Tap a year to see how it was calculated.</span>}
      </div>

      <SideSheet
        open={!!open}
        onClose={() => setOpen(null)}
        eyebrow={open ? `${open.country === "IN" ? "India" : "United States"} · ${open.year.year}${open.year.projected ? " · projected" : ""}` : undefined}
        title={open?.year.label}
      >
        {open && (
          <div className="space-y-5 text-sm">
            <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
              <span>
                <b>{open.year.days} days</b> in {open.country === "IN" ? "India" : "the US"} ({fmt(open.year.start)} – {fmt(open.year.end)}), counted from your travel record.
              </span>
              {open.country === "IN" && <Cite node={daysNode(open.year, data)} />}
            </p>
            <div>
              <p className="mb-2 font-semibold">Rules applied</p>
              <ol className="space-y-3">
                {open.year.tests.map((t) => (
                  <li key={t.rule_id} className="rounded-xl border p-3">
                    <p className="flex items-start gap-2">
                      {t.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span>
                        <span className="font-medium">{t.passed ? "Met" : "Not met"}:</span> {t.summary}
                      </span>
                    </p>
                    <dl className="mt-2 space-y-1 pl-6 text-[12.5px]">
                      {Object.entries(t.inputs).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{INPUT_LABEL[k] ?? k}</dt>
                          <dd className="text-right font-medium">{inputValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 pl-6 text-[11.5px] text-muted-foreground">
                      {t.rule_id}
                      {t.section ? ` · ${open.country === "IN" ? "Income-tax Act s." : "IRC §"}${t.section}` : ""}
                      {t.rule_status !== "active" ? " · rule pending validation by Kiyos's tax team" : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-2 font-semibold">Where the days come from</p>
              <ul className="space-y-1.5 text-[12.5px]">
                {data.stays.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    In {s.country === "IN" ? "India" : "the US"} {fmt(s.arrived)} – {s.departed ? fmt(s.departed) : "ongoing"}
                    <span className="text-muted-foreground">· {s.source}</span>
                    <Cite node={{ title: `Trip from ${fmt(s.arrived)}`, value: `${fmt(s.arrived)} → ${s.departed ? fmt(s.departed) : "ongoing"}`, evidence: s.evidence ?? null, source: s.source }} className="ml-auto" />
                  </li>
                ))}
                {data.facts.map((f) => (
                  <li key={f.key} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {f.label}: {fmt(f.value)} <span className="text-muted-foreground">· {f.source}</span>
                    <Cite node={{ title: f.label, value: fmt(f.value), evidence: f.evidence ?? null, source: f.source }} className="ml-auto" />
                  </li>
                ))}
              </ul>
            </div>
            {data.assumptions.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-[12.5px] text-amber-900">
                <p className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-3.5 w-3.5" /> Assumptions</p>
                <ul className="list-disc space-y-1 pl-4">{data.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">
              {data.reviewed[open.country] ? reviewedLine(open.country) + "." : "Calculated by Kiyos from your records. An expert reviews it before it's final."}
            </p>
          </div>
        )}
      </SideSheet>
    </div>
  );
}
