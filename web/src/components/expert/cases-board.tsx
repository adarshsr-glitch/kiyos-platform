"use client";

/**
 * Cases (council Review 06, EX-09): the book. A pipeline strip counts customers by stage (and
 * filters the list); saved views cut it by whose turn it is; each customer is one row that says
 * what's most urgent, how far their documents are and when they next file. Built from the same
 * desk call as Home and Triage, so the three never disagree.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, firstOf, fmt, plural, type CaseSummary, type Desk, type Reason, type Stage } from "@/lib/desk";
import { Face } from "./face";
import { KindTile } from "./kinds";

const DISPLAY = "[font-family:var(--font-display),var(--font-inter),sans-serif]";

export const STAGE: Record<Stage, { label: string; hint: string; dot: string; bar: string }> = {
  documents: { label: "Owe documents", hint: "a requested document isn't in yet", dot: "bg-[#C9822B]", bar: "bg-[#C9822B]" },
  review: { label: "In review", hint: "documents in, work under way", dot: "bg-[#7C8595]", bar: "bg-[#7C8595]" },
  ready: { label: "Ready to sign off", hint: "nothing blocks the assessment", dot: "bg-[#5FB58A]", bar: "bg-[#8FD1B0]" },
  signed: { label: "Signed off", hint: "assessment signed, documents in", dot: "bg-[#0E3B2C]", bar: "bg-[#0E3B2C]" },
};
const STAGES: Stage[] = ["documents", "review", "ready", "signed"];

type View = "all" | "late" | "you" | "them" | "ready" | "clear";
const open = (c: CaseSummary) => c.tiers.late + c.tiers.waiting + c.tiers.soon + c.tiers.ready;
const VIEWS: { key: View; label: string; has: (c: CaseSummary) => boolean }[] = [
  { key: "all", label: "All", has: () => true },
  { key: "late", label: "Overdue", has: (c) => c.tiers.late > 0 },
  { key: "you", label: "Needs you", has: (c) => open(c) > 0 },
  { key: "them", label: "Waiting on them", has: (c) => open(c) === 0 && c.owed > 0 },
  { key: "ready", label: "Ready to sign off", has: (c) => c.tiers.ready > 0 },
  { key: "clear", label: "All clear", has: (c) => open(c) === 0 && c.owed === 0 },
];
type Sort = "urgent" | "filing" | "name";

/** Most urgent first: overdue (oldest), then waiting, due soon, ready, then the rest. */
function urgencyKey(c: CaseSummary): string {
  const t = c.top;
  if (!t) return `9${c.owed ? "0" : "1"}${c.customer}`;
  const rank = { late: 0, waiting: 1, soon: 2, ready: 3, later: 4 }[t.tier];
  return `${rank}${t.due ?? t.since ?? "9999"}`;
}

export function CasesBoard({ desk, initialView, initialStage, all, signedIn }: { desk: Desk; initialView?: string; initialStage?: string; all: boolean; signedIn: boolean }) {
  const [view, setView] = useState<View>((VIEWS.find((v) => v.key === initialView)?.key as View) ?? "all");
  const [stage, setStage] = useState<Stage | null>(STAGES.includes(initialStage as Stage) ? (initialStage as Stage) : null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("urgent");
  const cases = desk.cases;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const v = VIEWS.find((x) => x.key === view)!;
    const list = cases.filter(
      (c) => v.has(c) && (!stage || c.stage === stage) && (!needle || [c.customer, c.name, c.captain].some((s) => s.toLowerCase().includes(needle)))
    );
    return list.sort((a, b) =>
      sort === "name" ? a.customer.localeCompare(b.customer) : sort === "filing" ? (a.next_filing?.due ?? "9999").localeCompare(b.next_filing?.due ?? "9999") : urgencyKey(a).localeCompare(urgencyKey(b))
    );
  }, [cases, view, stage, q, sort]);

  return (
    <div className="flex flex-col gap-6">
      {/* ───────── header */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className={cn("text-[26px] font-semibold tracking-[-0.015em]", DISPLAY)}>Cases</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {desk.mine ? `Your ${plural(cases.length, "customer")}` : `All ${plural(cases.length, "customer")} with a plan`}. Customers still in the WhatsApp scan or on the free plan are with the Kiyos agent until they choose one.
          </p>
        </div>
        {signedIn && (
          <Link href={desk.mine ? "/expert/cases?all=1" : "/expert/cases"} className="text-[13px] font-semibold text-[#0E3B2C] hover:underline">
            {desk.mine ? "Show everyone's customers" : "Show only mine"}
          </Link>
        )}
      </header>

      {/* ───────── the pipeline */}
      <section aria-label="Customers by stage" className="rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
        <ol className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          {STAGES.map((s, i) => {
            const inStage = cases.filter((c) => c.stage === s);
            const on = stage === s;
            return (
              <li key={s} className="relative">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStage(on ? null : s)}
                  className={cn("flex h-full w-full flex-col gap-3 rounded-xl px-4 py-3.5 text-left transition-colors", on ? "bg-[#0E3B2C] text-white" : "hover:bg-[#F5F4F0]")}
                >
                  <span className="flex items-center gap-2 text-[12.5px] font-medium">
                    <i aria-hidden className={cn("h-2 w-2 rounded-full", STAGE[s].dot, on && s === "signed" && "bg-[#BFE3D1]")} />
                    {STAGE[s].label}
                  </span>
                  <span className="flex items-end justify-between gap-3">
                    <span className={cn("text-[34px] font-semibold leading-none tabular-nums tracking-[-0.02em]", DISPLAY, !inStage.length && !on && "text-muted-foreground/50")}>{inStage.length}</span>
                    <span className="flex">
                      {inStage.slice(0, 4).map((c, k) => (
                        <span key={c.id} className={cn("rounded-full ring-2", on ? "ring-[#0E3B2C]" : "ring-card", k > 0 && "-ml-2")}>
                          <Face name={c.customer} size={24} />
                        </span>
                      ))}
                      {inStage.length > 4 && <span className={cn("ml-1.5 self-center text-[12px]", on ? "text-white/70" : "text-muted-foreground")}>+{inStage.length - 4}</span>}
                    </span>
                  </span>
                  <span className={cn("text-[12px]", on ? "text-white/70" : "text-muted-foreground")}>{STAGE[s].hint}</span>
                </button>
                {i < 3 && <ChevronRight aria-hidden className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/50 lg:block" />}
              </li>
            );
          })}
        </ol>
        <span aria-hidden className="mx-2 mb-1 mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
          {STAGES.map((s) => {
            const n = cases.filter((c) => c.stage === s).length;
            return n ? <i key={s} className={cn("block h-full", STAGE[s].bar)} style={{ width: `${(n / Math.max(1, cases.length)) * 100}%` }} /> : null;
          })}
        </span>
      </section>

      {/* ───────── views, search, sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="View" className="flex flex-wrap gap-1">
          {VIEWS.map((v) => {
            const n = cases.filter((c) => v.has(c) && (!stage || c.stage === stage)).length;
            const on = view === v.key;
            return (
              <button
                key={v.key}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => setView(v.key)}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px]", on ? "bg-foreground text-background" : "text-foreground/70 hover:bg-black/[0.04]")}
              >
                {v.label}
                <span className={cn("tabular-nums", on ? "text-background/60" : v.key === "late" && n ? "text-[#B42318]" : "text-muted-foreground")}>{n}</span>
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        {stage && (
          <button type="button" onClick={() => setStage(null)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0E3B2C]/10 px-3 text-[12.5px] font-medium text-[#0E3B2C]">
            {STAGE[stage].label} <X className="h-3.5 w-3.5" aria-label="Clear stage" />
          </button>
        )}
        <label className="relative">
          <span className="sr-only">Search customers</span>
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, case or expert" className="h-9 w-[260px] rounded-[10px] border bg-card pl-9 pr-3 text-[13px] outline-none focus:border-[#0E3B2C]" />
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-[10px] border bg-card px-2.5 text-[13px] text-foreground outline-none focus:border-[#0E3B2C]">
            <option value="urgent">Most urgent</option>
            <option value="filing">Next filing</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {/* ───────── the customers */}
      <section aria-label="Customers" className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
        <div aria-hidden className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,2.4fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.7fr)_100px] gap-5 border-b border-[#EFEDE8] px-5 py-2.5 text-[11.5px] font-medium text-muted-foreground lg:grid">
          <span>Customer</span>
          <span>Needs you for</span>
          <span>Stage</span>
          <span>Next filing</span>
          <span>Docs accepted</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13.5px] text-muted-foreground">No customers here. {q ? "Try another search." : "This view is clear."}</p>
        ) : (
          <ul>
            {rows.map((c) => (
              <Row key={c.id} c={c} today={desk.today} all={all} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** What the case is about, without repeating the customer's name. */
function about(c: CaseSummary): string {
  const rest = c.name.startsWith(c.customer) ? c.name.slice(c.customer.length).replace(/^\s*[—–-]\s*/, "") : c.name;
  return rest.trim();
}

const SHOW = 3;

/** How urgent one reason is, in a few words. */
function whenOf(r: Reason, today: string): { text: string; late: boolean; ready: boolean } {
  if (r.tier === "late" && r.due) return { text: `${plural(daysBetween(r.due, today), "day")} late`, late: true, ready: false };
  if (r.tier === "ready") return { text: "Ready", late: false, ready: true };
  if (r.kind === "question" && r.due) return { text: daysBetween(today, r.due) <= 1 ? "Reply due soon" : `Reply by ${fmt(r.due)}`, late: false, ready: false };
  if (r.due) return { text: `Due ${fmt(r.due)}`, late: false, ready: false };
  if (r.since) return { text: `${Math.max(0, daysBetween(r.since, today))}d waiting`, late: false, ready: false };
  return { text: "Found", late: false, ready: false };
}

const reasonText = (r: Reason) => (r.kind === "question" ? `Reply: “${r.title.replace(/^About “[^”]*”:\s*/, "")}”` : r.kind === "signoff" ? `Sign off: ${r.title}` : r.kind === "mismatch" ? `Mismatch: ${r.title}` : r.title);

function Row({ c, today, all }: { c: CaseSummary; today: string; all: boolean }) {
  const n = open(c);
  const reasons = c.reasons;
  return (
    <li className="group relative grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-2.5 border-b border-[#EFEDE8] px-5 py-3.5 last:border-0 hover:bg-[#FAF9F6] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2.4fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.7fr)_100px] lg:items-center">
      {/* The whole row opens the case; the Triage button sits above it. */}
      <Link href={`/expert/cases/${c.id}`} className="flex min-w-0 items-center gap-3 after:absolute after:inset-0 after:content-['']">
        <Face name={c.customer} size={28} className="!h-9 !w-9" />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold group-hover:text-[#0E3B2C]">{c.customer}</span>
          <span className="block truncate text-[12px] text-muted-foreground">{[about(c), firstOf(c.captain)].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>

      <div className="min-w-0">
        {reasons.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {reasons.slice(0, SHOW).map((r) => {
              const w = whenOf(r, today);
              return (
                <li key={r.key} className="flex min-w-0 items-center gap-2">
                  <KindTile kind={r.kind} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{reasonText(r)}</span>
                  <span className={cn("shrink-0 whitespace-nowrap text-[12px] tabular-nums", w.late ? "font-semibold text-[#B42318]" : w.ready ? "font-medium text-[#0F5132]" : "text-muted-foreground")}>{w.text}</span>
                </li>
              );
            })}
            {reasons.length > SHOW && (
              <li>
                <Link href={`/expert/work?case=${c.id}${all ? "&all=1" : ""}`} className="relative z-10 pl-[30px] text-[12px] font-medium text-[#0E3B2C] hover:underline">
                  +{reasons.length - SHOW} more
                </Link>
              </li>
            )}
            {c.owed > 0 && (
              <li className="pl-[30px] text-[12px] text-[#7A3F06]">
                {firstOf(c.customer)} also owes you {plural(c.owed, "item")}
                {c.owed_late ? `, ${c.owed_late} overdue` : ""}
              </li>
            )}
          </ul>
        ) : c.owed ? (
          <span className="text-[13px] text-[#7A3F06]">
            {firstOf(c.customer)} owes you {plural(c.owed, "item")}
            {c.owed_late ? `, ${c.owed_late} overdue` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-[#0F5132]" aria-hidden /> Nothing open
          </span>
        )}
      </div>

      {/* On phones, stage, filing and documents share one line; on desktop each is a column. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 lg:contents">
      <span className="flex items-center gap-2 whitespace-nowrap text-[13px]">
        <i aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", STAGE[c.stage].dot)} />
        {STAGE[c.stage].label}
      </span>

      <span className="text-[13px]">
        {c.next_filing ? (
          <>
            <span className="block tabular-nums">
              {c.next_filing.country} · {fmt(c.next_filing.due, { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="block text-[12px] text-muted-foreground">in {c.next_filing.days} days</span>
          </>
        ) : (
          <span className="text-muted-foreground">No filing date</span>
        )}
      </span>

      <span className="flex items-center gap-2.5">
        {c.docs.total ? (
          <>
            <span aria-hidden className="h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-[#EFEDE8]">
              <span className="block h-full rounded-full bg-[#0E3B2C]" style={{ width: `${(c.docs.accepted / c.docs.total) * 100}%` }} />
            </span>
            <span className="whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
              {c.docs.accepted}/{c.docs.total}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-muted-foreground">None asked</span>
        )}
      </span>

      </div>

      <span className="flex justify-start lg:justify-end">
        {n > 0 ? (
          <Link
            href={`/expert/work?case=${c.id}${all ? "&all=1" : ""}`}
            className="relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:border-[#0E3B2C]/40"
          >
            Triage {n} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </span>
    </li>
  );
}
