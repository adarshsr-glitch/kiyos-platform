"use client";

/**
 * Tax position: the expert's figures for this tax year, and what they rest on.
 *   1. One card per country: residency status, the position (figure, paid / left bar, legend),
 *      the income it is built on (donut), and the return's due date and stage.
 *   2. Why the residency status is what it is: the year-by-year record as dots, with the rule
 *      and the sign-off the conclusion rests on. The full calculation opens in the side panel.
 *   3. The tax questions, open first; settled ones fade. Each opens the reasoning per country.
 * Shapes replace sentences. Only recorded figures are shown; Kiyos never works out tax.
 */

import { hasCaptain } from "@/lib/captain";
import { useState } from "react";
import { Check } from "lucide-react";
import type { Assessment, CaseDetail, InitialScan, TaxTopic } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pill } from "./kit";
import { IncomeDonut } from "./blocks";
import { ResidencyClock } from "@/components/charts/residency-clock";
import type { Residency, ResidencyYear } from "@/lib/residency";
import { SideSheet } from "@/components/side-sheet";
import { explainSplitYear, pictureFromFacts, type MoveYear, type PictureItem } from "@/lib/financial-picture";
import { COUNTRY_NAME, COUNTRY_SHORT, estimatesOf, FLAG, positionOf, STATUS_SHORT, type Code, type CountryPositionData } from "@/lib/position";
import { DueLine, PositionFigure, SetBy } from "./position-figure";
import { Avatar, CountryCode, Segs } from "./visual";

const CODES: Code[] = ["IN", "US"];
const fullDay = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
const todayIso = () => new Date().toISOString().slice(0, 10);

const STATE: Record<TaxTopic["status"], { label: string; order: number }> = {
  open: { label: "Not started", order: 0 },
  in_progress: { label: "In progress", order: 1 },
  resolved: { label: "Settled", order: 2 },
};

/** Short marks for the year dots. */
const MARK: Record<ResidencyYear["status"], string> = { NR: "NR", RNOR: "RNOR", ROR: "ROR", RESIDENT: "R", DUAL: "D", NONRESIDENT: "NR" };

const CONFIDENCE: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" }> = {
  confirmed: { label: "Confirmed", tone: "green" },
  likely: { label: "Likely", tone: "blue" },
  incomplete: { label: "Incomplete", tone: "amber" },
  review_needed: { label: "Under expert review", tone: "red" },
};

export function TaxPosition({ caseData, scan, residency }: { caseData: CaseDetail; scan: InitialScan | null; residency?: Residency | null }) {
  const [topic, setTopic] = useState<TaxTopic | null>(null);
  const [panel, setPanel] = useState<"residency" | null>(null);
  const hasClock = !!residency && residency.india.length > 0 && (residency.stays.length > 0 || residency.facts.length > 0);
  const positions = { IN: positionOf(caseData, residency, "IN"), US: positionOf(caseData, residency, "US") };
  const split = explainSplitYear(pictureFromFacts(caseData.facts, caseData.members.map((m) => m.name)), caseData.facts);
  const picture = split.items;
  const first = caseData.client_name.split(" ")[0];
  const lead = caseData.case_captain;
  const captained = hasCaptain(lead);
  const expertName = captained ? lead : "Kiyos";
  // The topic's own owner when the record names one; the customer reads as "You".
  const ownerOf = (t: TaxTopic) => (t.owner && t.owner.split(" ")[0] === first ? "You" : t.owner && hasCaptain(t.owner) ? t.owner : expertName);
  const today = todayIso();

  const estimates = Object.values(estimatesOf(caseData.facts));
  const setBy = estimates.find((e) => e?.enteredBy)?.enteredBy ?? null;
  const setOn = estimates.map((e) => e?.enteredOn ?? "").sort().at(-1) || null;

  const topics = [...caseData.topics].sort((a, b) => STATE[a.status].order - STATE[b.status].order);
  const settled = caseData.topics.filter((t) => t.status === "resolved").length;

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">Tax position</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{captained ? `${lead.split(" ")[0]}’s figures` : "Your figures"} for this tax year, and what they rest on.</p>
        </div>
        {estimates.length > 0 && <SetBy name={setBy} on={setOn} illustrative={estimates.some((e) => e?.illustrative)} />}
      </section>

      {/* 1. One card per country */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        {CODES.map((c) => (
          <CountryCard key={c} p={positions[c]} picture={picture} move={split.move} lead={captained ? lead.split(" ")[0] : "Kiyos"} today={today} />
        ))}
      </div>

      {/* 2. Why the residency status is what it is */}
      {residency && (residency.india.length > 0 || residency.us.length > 0) && (
        <ResidencyRecord residency={residency} positions={positions} assessments={caseData.assessments} lead={captained ? lead.split(" ")[0] : "Kiyos"} onOpen={hasClock ? () => setPanel("residency") : null} />
      )}

      {/* 3. The tax questions */}
      {caseData.topics.length === 0 ? (
        <section aria-labelledby="h-topics" className="space-y-3">
          <h2 id="h-topics" className="text-[16px] font-semibold text-foreground">
            Your tax questions
          </h2>
          <Preliminary scan={scan} positions={positions} captain={expertName} unvalued={picture.filter((i) => i.section === "holdings" && typeof i.amount !== "number").map((i) => i.label)} hasTrips={(residency?.stays.length ?? 0) > 0} />
        </section>
      ) : (
        <section aria-labelledby="h-topics" className="overflow-hidden rounded-[14px] border bg-card">
          <div className="flex flex-wrap items-baseline gap-2.5 px-[22px] pb-3 pt-4">
            <h2 id="h-topics" className="text-[16px] font-semibold text-foreground">
              Your tax questions
            </h2>
            <Segs done={settled} total={caseData.topics.length} pendingTone="none" />
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {settled} of {caseData.topics.length} settled
            </span>
          </div>
          <ul>
            {topics.map((t) => (
              <li key={t.id}>
                <TopicRow topic={t} owner={ownerOf(t)} customer={caseData.client_name} today={today} onOpen={() => setTopic(t)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {scan && <p className="text-xs text-muted-foreground">Started from your initial scan on {fullDay(scan.created_at)}.</p>}

      <SideSheet wide open={panel === "residency"} onClose={() => setPanel(null)} eyebrow="Calculated from your travel record" title="Residency, year by year">
        {hasClock && <ResidencyClock data={residency!} />}
      </SideSheet>

      <SideSheet open={!!topic} onClose={() => setTopic(null)} eyebrow={topic ? STATE[topic.status].label : undefined} title={topic?.title ?? ""}>
        {topic && <TopicDetail topic={topic} owner={ownerOf(topic)} />}
      </SideSheet>
    </div>
  );
}

/* ================================================================ country */

/** One country: its residency status, the position, the income behind it, and the return's date. */
function CountryCard({ p, picture, move, lead, today }: { p: CountryPositionData; picture: PictureItem[]; move: MoveYear | null; lead: string; today: string }) {
  const filing = p.filing?.split(" + ")[0] ?? null;
  const status = p.status ? STATUS_SHORT[p.status] ?? p.status : null;
  const settledStatus = !!p.reviewedBy && !p.reviewStale;
  return (
    <section aria-label={COUNTRY_NAME[p.code]} className="flex min-w-0 flex-col gap-[18px] rounded-[14px] border bg-card px-[22px] py-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <CountryCode code={p.code} />
          {COUNTRY_NAME[p.code]}
          {p.year && <span className="font-normal text-muted-foreground">· {p.estimate?.year ?? p.year}</span>}
        </h2>
        {status ? (
          <span className={cn("inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold", settledStatus ? "bg-primary/10 text-primary" : "bg-muted text-foreground/80")}>
            {settledStatus && <Check className="h-3.5 w-3.5" aria-hidden />}
            {status} · {settledStatus ? "reviewed" : p.reviewStale ? `${lead} is rechecking` : p.source === "calculated" ? "from your travel dates" : "in review"}
          </span>
        ) : (
          <span className="inline-flex h-[26px] items-center rounded-full bg-muted px-2.5 text-[12.5px] font-medium text-muted-foreground">Residency pending</span>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Position</p>
        {p.estimate ? (
          <PositionFigure p={p} size="md" />
        ) : (
          <>
            <p className="font-serif text-[22px] text-muted-foreground">Not set yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{lead} adds this figure once your income for the year is reviewed.</p>
          </>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="mb-2.5 text-[12.5px] font-medium text-muted-foreground">Built on this income</p>
        <IncomeDonut code={p.code} picture={picture} move={move} bare heading={false} />
      </div>

      {(p.due || p.stage) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <DueLine p={p} filing={filing} today={today} />
          {p.stage && <span className="text-[12.5px] text-muted-foreground">Stage: {p.stage}</span>}
        </div>
      )}
    </section>
  );
}

/* ================================================================ residency record */

type Dot = { key: string; mark: string; label: string; current?: boolean; split?: boolean };

/** "FY 2026-27" and k years back: "FY 2016-17" shown as "16-17". */
function fyBack(year: string | null, k: number) {
  const m = year?.match(/(\d{4})-(\d{2})/);
  if (!m) return `−${k}`;
  const start = Number(m[1]) - k;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/**
 * The residency status as a record: one dot per year, the rule it rests on and when it was
 * signed off. The prior years come from the signed assessment's own inputs; nothing is inferred.
 */
function ResidencyRecord({ residency, positions, assessments, lead, onOpen }: { residency: Residency; positions: Record<Code, CountryPositionData>; assessments: Assessment[]; lead: string; onOpen: (() => void) | null }) {
  const curIN = residency.india.find((y) => y.current) ?? residency.india.at(-1) ?? null;
  // The signed assessment whose rule used the years before this one.
  const signed = assessments.find((a) => a.status === "signed_off" && a.derivation_trail?.some((s) => Array.isArray(s.inputs_used?.previous_year_statuses)));
  const step = signed?.derivation_trail?.find((s) => Array.isArray(s.inputs_used?.previous_year_statuses)) ?? null;
  const prior = (step?.inputs_used?.previous_year_statuses as string[] | undefined) ?? [];

  const india: Dot[] = prior.length
    ? [
        ...prior.map((s, i) => ({ key: `p${i}`, mark: s, label: fyBack(curIN?.year ?? positions.IN.year, prior.length - i) })),
        ...(curIN ? [{ key: curIN.year, mark: MARK[curIN.status], label: fyBack(curIN.year, 0), current: true }] : []),
      ]
    : residency.india.map((y) => ({ key: y.year, mark: MARK[y.status], label: y.year.replace(/^FY 20/, ""), current: y.current }));
  const us: Dot[] = residency.us.map((y) => ({ key: y.year, mark: MARK[y.status], label: y.year, current: y.current, split: y.status === "DUAL" }));
  const nr = prior.filter((s) => s === "NR").length;
  const status = curIN ? STATUS_SHORT[curIN.status] ?? curIN.status : null;

  return (
    <section aria-labelledby="h-record" className="rounded-[14px] border bg-card px-[22px] py-[18px]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="h-record" className="text-[16px] font-semibold text-foreground">
          {prior.length && status ? `Why you’re ${status} in India` : "Residency, year by year"}
        </h2>
        {onOpen && (
          <button type="button" aria-haspopup="dialog" onClick={onOpen} className="text-[13px] font-medium text-primary hover:underline">
            See the full calculation
          </button>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <YearDots dots={india} label={`India, year by year: ${india.map((d) => `${d.label} ${d.mark}`).join(", ")}`} tone="in" />
          {prior.length > 0 && (
            <p className="mt-3 text-[13.5px] text-foreground">
              Non-resident in <b>{nr} of the {prior.length}</b> years before this one.
            </p>
          )}
          {step && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
              <span className="inline-flex h-[22px] items-center rounded-[5px] bg-muted px-2 font-medium text-foreground">{step.rule_id}</span>
              <span>{step.summary}</span>
              {signed && <span>· signed off {fullDay(signed.updated_at)}</span>}
            </p>
          )}
          {positions.IN.reviewStale && <p className="mt-2 text-[12.5px] text-muted-foreground">{lead} is rechecking this after a change to your details.</p>}
        </div>
        {us.length > 0 && (
          <div className="min-w-[200px] md:border-l md:pl-6">
            <p className="mb-2 text-[12.5px] font-medium text-muted-foreground">United States</p>
            <YearDots dots={us} label={`United States, year by year: ${residency.us.map((y) => `${y.year} ${y.label}`).join(", ")}`} tone="us" />
            <p className="mt-2.5 text-[12.5px] text-muted-foreground">{residency.us.map((y) => `${y.year}: ${STATUS_SHORT[y.status] ?? y.status}`).join(" · ")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function YearDots({ dots, label, tone }: { dots: Dot[]; label: string; tone: "in" | "us" }) {
  const solid = tone === "in" ? "bg-primary text-primary-foreground" : "bg-[#22405F] text-white";
  return (
    <div role="img" aria-label={label} className="flex flex-wrap items-end gap-1.5">
      {dots.map((d, i) => (
        <span key={d.key} className="flex items-end gap-1.5">
          {d.current && i > 0 && <span aria-hidden className="mb-3.5 w-4 self-center border-t-2 border-dotted border-[#B9B4A6]" />}
          <span className="flex flex-col items-center gap-1 text-[10.5px] text-muted-foreground">
            <i
              className={cn(
                "flex items-center justify-center rounded-full not-italic font-bold tracking-[0.02em]",
                d.current ? "h-[34px] w-[34px] text-[10px]" : "h-[22px] w-[22px] text-[8.5px]",
                d.split ? "border border-[#22405F] text-white" : d.current || d.mark !== "NR" ? solid : "border bg-muted text-foreground/80"
              )}
              style={d.split ? { background: "linear-gradient(90deg,#22405F 50%,hsl(var(--muted)) 50%)" } : undefined}
            >
              {d.split ? "" : d.mark}
            </i>
            <span className={cn(d.current && "font-semibold text-foreground")}>{d.label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ================================================================ questions */

function TopicRow({ topic: t, owner, customer, today, onOpen }: { topic: TaxTopic; owner: string; customer: string; today: string; onOpen: () => void }) {
  const done = t.status === "resolved";
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className={cn(
        "grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3.5 border-t px-[22px] py-3 text-left hover:bg-muted/30 md:grid-cols-[22px_minmax(0,1fr)_180px_110px_96px]",
        done && "opacity-70"
      )}
    >
      <span aria-hidden className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-full border-2", done ? "border-primary bg-primary" : t.status === "in_progress" ? (owner === "You" ? "border-[#C9822B]" : "border-[#9C978A]") : "border-[#CFCABD]")}>
        {done && <Check className="h-3 w-3 text-primary-foreground" />}
      </span>
      <span className="text-[14px] font-medium text-foreground">{t.title}</span>
      <span className="hidden items-center gap-2 text-[12.5px] text-muted-foreground md:flex">
        <Avatar name={owner === "You" ? customer : owner} who={owner === "You" ? "customer" : "expert"} />
        {owner}
      </span>
      <span className="hidden text-[12.5px] text-muted-foreground md:block">{!done && t.due_date ? (t.due_date < today ? `Was due ${fullDay(t.due_date)}` : `By ${formatDate(t.due_date, { day: "numeric", month: "short" })}`) : ""}</span>
      <span className={cn("inline-flex h-6 items-center justify-self-end rounded-md px-2 text-[12.5px] font-medium", done ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>{STATE[t.status].label}</span>
    </button>
  );
}

/* ================================================================ before the expert's topics */

/**
 * Before the expert has opened tax questions: what the assessment already points to,
 * per country and why, and what is still unknown. Nothing here is a conclusion.
 */
function Preliminary({ scan, positions, captain, unvalued, hasTrips }: { scan: InitialScan | null; positions: Record<Code, CountryPositionData>; captain: string; unvalued: string[]; hasTrips: boolean }) {
  const first = captain.split(" ")[0];
  // The assessment's list was written before payment; drop what the record now answers
  // and name the specific values that are still missing instead.
  const fromScan = (scan?.missing ?? []).filter((m) => !/^Account balances and income figures/.test(m) && !(hasTrips && /^Days spent in India/.test(m)));
  const unknown = [
    ...fromScan,
    ...unvalued.map((l) => `A value for ${l.replace(/\s+\([^)]*\)$/, "")}: not in any document yet`),
    ...CODES.filter((c) => !positions[c].status).map((c) => `Your ${COUNTRY_SHORT[c]} residency: needs your ${c === "US" ? "US arrival and departure dates" : "travel dates"}`),
    ...CODES.filter((c) => !positions[c].estimate).map((c) => `${c === "IN" ? "An India" : "A US"} tax estimate: needs your income documents`),
  ];
  return (
    <div className="space-y-4">
      {scan?.rows?.length ? (
        <>
          <p className="text-[13.5px] text-muted-foreground">
            From your WhatsApp assessment. {first} turns these into settled questions as your documents are reviewed.
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {scan.rows.map((r) => (
              <li key={r.area + r.country} className="rounded-xl border bg-card p-4">
                <p className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                  <span>{r.area}</span>
                  <span>{r.country === "BOTH" ? "🇮🇳 🇺🇸" : r.country === "IN" ? "🇮🇳 India" : "🇺🇸 US"}</span>
                </p>
                <p className="mt-1 text-[14.5px] font-medium leading-snug text-foreground">{r.finding}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{r.why}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Based on: “{r.input}” · {r.confidence === "likely" ? "likely, not yet reviewed" : "incomplete, more needed"}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-2xl border bg-card px-5 py-4 text-sm text-muted-foreground">{first} opens your tax questions once your first documents are in.</p>
      )}
      {unknown.length > 0 && (
        <div className="rounded-xl bg-amber-50/70 px-4 py-3">
          <p className="text-[13px] font-medium text-amber-950">Still unknown</p>
          <ul className="mt-1 space-y-0.5 text-[13px] text-amber-950/90">
            {unknown.map((u) => (
              <li key={u}>· {u}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopicDetail({ topic: t, owner }: { topic: TaxTopic; owner: string }) {
  const c = CONFIDENCE[t.confidence] ?? CONFIDENCE.incomplete;
  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
        <Pill tone={c.tone}>{c.label}</Pill> {owner}
      </p>
      {t.conclusion && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Conclusion</p>
          <p className="mt-1 text-[14px] leading-relaxed text-foreground">{t.conclusion}</p>
        </div>
      )}
      {(["IN", "US"] as const).map((code) => {
        const text = code === "IN" ? t.india_position : t.us_position;
        return (
          <div key={code} className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground">
              <span aria-hidden>{FLAG[code]}</span> {COUNTRY_NAME[code]}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">{text ?? "No position yet."}</p>
          </div>
        );
      })}
      {t.next_action && t.status !== "resolved" && (
        <p className="text-[13px] text-foreground">
          <span className="text-muted-foreground">Next: </span>
          {t.next_action}
          {t.due_date && <span className="text-muted-foreground"> · by {formatDate(t.due_date, { day: "numeric", month: "short", year: "numeric" })}</span>}
        </p>
      )}
    </div>
  );
}
