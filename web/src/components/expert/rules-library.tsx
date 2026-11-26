"use client";

/**
 * Rules: the tax rules Kiyos applies, written for a person rather than a parser. Each rule
 * shows the law it comes from, what Kiyos checks in plain words, whether its tests pass and
 * where it has been cited. A rule opens in place, under its row (no side panel). The YAML is
 * still there, folded, for whoever maintains it.
 *
 * Everything shown is the rule file as written and the engine's own test run; nothing here
 * restates or interprets the law (C-03).
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleAlert, FileCode2, Scale, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Face } from "./face";

const DISPLAY = "[font-family:var(--font-display),var(--font-inter),sans-serif]";

type Input = { name: string; type?: string; description?: string; length?: number };
type Logic = { kind: string; [k: string]: unknown };
type Test = { name: string; inputs: Record<string, unknown>; expected: unknown; got: unknown; passed: boolean; error: string | null };
export type LibraryRule = {
  id: string;
  jurisdiction: string;
  tax_year: string;
  topic: string;
  summary: string;
  status: string;
  sources: { id?: string; section?: string; passage?: string }[];
  inputs: Input[];
  logic: Logic;
  notes: string | null;
  tests: Test[];
  explainer: string | null;
  path: string;
  yaml: string | null;
  cited: { assessments: number; answers: number; cases: { id: number; customer: string }[] };
};

const COUNTRY: Record<string, string> = { IN: "India", US: "United States" };
const LAW: [RegExp, string][] = [
  [/^IN-ITA/, "Income Tax Act"],
  [/^US-IRC/, "Internal Revenue Code"],
];
const OP: Record<string, string> = { ">=": "is at least", ">": "is more than", "<=": "is at most", "<": "is less than", "==": "equals" };
const SYM: Record<string, string> = { ">=": "≥", ">": ">", "<=": "≤", "<": "<", "==": "=" };

const lawOf = (s: { id?: string; section?: string }) => {
  const name = LAW.find(([re]) => re.test(s.id ?? ""))?.[1] ?? s.id ?? "Source";
  return s.section ? `${name} · ${name.startsWith("Internal") ? "§" : "s."} ${s.section}` : name;
};
const human = (v: unknown) =>
  typeof v === "string"
    ? v
        .split("_")
        .map((w, i) => (/^(RNOR|ROR|NR|US|IN|SPT)$/.test(w) ? w : i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w.toLowerCase()))
        .join(" ")
    : String(v);
const pending = (r: LibraryRule) => r.status !== "active";

function labelOf(r: LibraryRule, name: string): string {
  const d = r.inputs.find((i) => i.name === name)?.description;
  if (d) return d.replace(/\.$/, "");
  return name.replace(/_/g, " ").replace(/\bus\b/g, "US").replace(/\bindia\b/g, "India");
}

function fraction(w: number): string {
  const known: [number, string][] = [[1, ""], [1 / 3, "⅓ × "], [1 / 6, "⅙ × "], [0.5, "½ × "], [0.25, "¼ × "]];
  const hit = known.find(([v]) => Math.abs(v - w) < 1e-6);
  return hit ? hit[1] : `${w} × `;
}

/** The rule's condition in words, one line per check, nested for all-of / any-of. */
function Conditions({ r, logic, depth = 0 }: { r: LibraryRule; logic: Logic; depth?: number }) {
  const k = logic.kind;
  if (k === "all_of" || k === "any_of") {
    const parts = (logic.conditions as Logic[]) ?? [];
    return (
      <div className={cn(depth > 0 && "ml-4")}>
        <p className="text-[12.5px] font-medium text-foreground/70">{k === "all_of" ? `All ${parts.length} of these:` : "Any one of these:"}</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {parts.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D6B5C]" />
              <Conditions r={r} logic={c} depth={depth + 1} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <p className="text-[13.5px] leading-snug text-foreground">{sentence(r, logic)}</p>;
}

function sentence(r: LibraryRule, l: Logic): string {
  const op = OP[String(l.operator)] ?? String(l.operator ?? "");
  switch (l.kind) {
    case "threshold":
      return `${labelOf(r, String(l.input))} ${op} ${l.threshold}`;
    case "threshold_count":
      return `Years marked ${l.count_of} in “${labelOf(r, String(l.within))}” ${op} ${l.threshold}`;
    case "flag":
      return `${labelOf(r, String(l.input))}: ${l.equals === false ? "no" : "yes"}`;
    case "weighted_sum": {
      const terms = (l.terms as { input: string; weight?: number }[]).map((t) => `${fraction(t.weight ?? 1)}${labelOf(r, t.input).toLowerCase()}`).join(" + ");
      return `${terms.charAt(0).toUpperCase()}${terms.slice(1)} ${op} ${l.threshold}`;
    }
    default:
      return `${human(l.kind)} check`;
  }
}

/** One short line for the card: the check in symbols, then what it gives when met. */
function oneLine(r: LibraryRule): string {
  const l = r.logic;
  const sym = (x: Logic): string =>
    x.kind === "threshold"
      ? `${String(x.input).replace(/_/g, " ").replace(/\bus\b/g, "US").replace(/\bindia\b/g, "India")} ${SYM[String(x.operator)]} ${x.threshold}`
      : x.kind === "threshold_count"
        ? `${x.count_of} years ${SYM[String(x.operator)]} ${x.threshold}`
        : x.kind === "flag"
          ? `${String(x.input).replace(/_/g, " ")}${x.equals === false ? " is false" : ""}`
          : x.kind === "weighted_sum"
            ? `weighted days ${SYM[String(x.operator)]} ${x.threshold}`
            : x.kind === "all_of" || x.kind === "any_of"
              ? ((x.conditions as Logic[]) ?? []).map(sym).join(x.kind === "all_of" ? " and " : " or ")
              : String(x.kind);
  const yes = (l.returns as Record<string, unknown> | undefined)?.true;
  return `${sym(l)}${yes ? ` → ${human(yes)}` : ""}`;
}

export function RulesLibrary({ rules, versions }: { rules: LibraryRule[]; versions: React.ReactNode }) {
  const [country, setCountry] = useState<"all" | string>("all");
  const [status, setStatus] = useState<"all" | "active" | "pending">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const detailRef = useRef<HTMLLIElement>(null);

  const tests = rules.flatMap((r) => r.tests);
  const passing = tests.filter((t) => t.passed).length;
  const active = rules.filter((r) => !pending(r)).length;
  const citedTimes = rules.reduce((n, r) => n + r.cited.assessments + r.cited.answers, 0);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rules.filter(
      (r) =>
        (country === "all" || r.jurisdiction === country) &&
        (status === "all" || (status === "active" ? !pending(r) : pending(r))) &&
        (!needle || [r.id, r.summary, ...r.sources.map((s) => `${s.section} ${s.passage}`)].some((s) => s?.toLowerCase().includes(needle)))
    );
  }, [rules, country, status, q]);

  const groups = useMemo(() => {
    const m = new Map<string, LibraryRule[]>();
    for (const r of shown) {
      const k = `${r.jurisdiction}|${r.topic}|${r.tax_year}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.entries());
  }, [shown]);

  useEffect(() => {
    if (open) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);

  const tiles = [
    { key: "active", label: "In use", value: active, note: "Kiyos answers only from these", tone: "ok" as const, onClick: () => setStatus(status === "active" ? "all" : "active"), on: status === "active" },
    { key: "pending", label: "Waiting for validation", value: rules.length - active, note: "not used to answer until the tax team validates them", tone: "wait" as const, onClick: () => setStatus(status === "pending" ? "all" : "pending"), on: status === "pending" },
    { key: "tests", label: "Tests", value: `${passing}/${tests.length}`, note: passing === tests.length ? "all pass, run when this page opened" : `${tests.length - passing} failing`, tone: passing === tests.length ? ("ok" as const) : ("bad" as const) },
    { key: "cited", label: "Cited", value: citedTimes, note: "times in assessments and answers", tone: "plain" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-[720px]">
          <h1 className={cn("text-[26px] font-semibold tracking-[-0.015em]", DISPLAY)}>Rules</h1>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">The tax rules Kiyos applies. Each one is written by the tax team, quotes the law it comes from and is tested. Kiyos answers only from rules in use; anything else goes to an expert.</p>
        </div>
        <a href="#h-versions" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border bg-card px-3.5 text-[13px] font-semibold text-foreground hover:border-[#0E3B2C]/40">
          Import from the spreadsheet <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </header>

      <section aria-label="The rule library at a glance" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] lg:grid-cols-4">
        {tiles.map((t) => {
          const Tag = t.onClick ? "button" : "div";
          return (
            <Tag
              key={t.key}
              {...(t.onClick ? { type: "button" as const, onClick: t.onClick, "aria-pressed": t.on } : {})}
              className={cn("flex flex-col gap-2.5 rounded-xl px-4 py-3.5 text-left", t.onClick && (t.on ? "bg-[#0E3B2C] text-white" : "hover:bg-[#F5F4F0]"))}
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium">
                <i aria-hidden className={cn("h-2 w-2 rounded-full", t.tone === "ok" ? "bg-[#5FB58A]" : t.tone === "wait" ? "bg-[#C9822B]" : t.tone === "bad" ? "bg-[#B42318]" : "bg-[#7C8595]")} />
                {t.label}
              </span>
              <span className={cn("text-[32px] font-semibold leading-none tabular-nums tracking-[-0.02em]", DISPLAY)}>{t.value}</span>
              <span className={cn("text-[12px]", t.on ? "text-white/70" : "text-muted-foreground")}>{t.note}</span>
            </Tag>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Country" className="flex gap-1">
          {["all", ...Array.from(new Set(rules.map((r) => r.jurisdiction)))].map((c) => {
            const n = c === "all" ? rules.length : rules.filter((r) => r.jurisdiction === c).length;
            return (
              <button key={c} role="tab" type="button" aria-selected={country === c} onClick={() => setCountry(c)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px]", country === c ? "bg-foreground text-background" : "text-foreground/70 hover:bg-black/[0.04]")}>
                {c === "all" ? "All" : COUNTRY[c] ?? c}
                <span className={cn("tabular-nums", country === c ? "text-background/60" : "text-muted-foreground")}>{n}</span>
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        {status !== "all" && (
          <button type="button" onClick={() => setStatus("all")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0E3B2C]/10 px-3 text-[12.5px] font-medium text-[#0E3B2C]">
            {status === "active" ? "In use" : "Waiting for validation"} <X className="h-3.5 w-3.5" aria-label="Clear" />
          </button>
        )}
        <label className="relative">
          <span className="sr-only">Search rules</span>
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rule, section or wording" className="h-9 w-[260px] rounded-[10px] border bg-card pl-9 pr-3 text-[13px] outline-none focus:border-[#0E3B2C]" />
        </label>
      </div>

      {groups.length === 0 && <p className="rounded-2xl bg-card px-5 py-10 text-center text-[13.5px] text-muted-foreground shadow-[0_0_0_1px_rgba(16,24,40,.06)]">No rules match.</p>}

      {groups.map(([key, list]) => {
        const [j, topic, year] = key.split("|");
        return (
          <section key={key} aria-label={`${COUNTRY[j] ?? j}, ${topic}`}>
            <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
              {COUNTRY[j] ?? j} · {topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, " ")}
              <span className="text-[12.5px] font-normal text-muted-foreground">
                Tax year {year} · {list.length} {list.length === 1 ? "rule" : "rules"}
              </span>
            </h2>
            <ol className="grid grid-flow-row-dense grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => {
                const on = open === r.id;
                const pass = r.tests.filter((t) => t.passed).length;
                const times = r.cited.assessments + r.cited.answers;
                return (
                  <Fragment key={r.id}>
                    <li className="min-w-0">
                      <button
                        type="button"
                        aria-expanded={on}
                        aria-controls={`rule-${r.id}`}
                        onClick={() => setOpen(on ? null : r.id)}
                        className={cn(
                          "flex h-full w-full flex-col gap-3 rounded-2xl bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(16,24,40,.25),0_0_0_1px_rgba(16,24,40,.1)]",
                          on && "shadow-[0_10px_30px_-12px_rgba(14,59,44,.28),0_0_0_1.5px_#0E3B2C]"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="rounded-md bg-[#F1F0EC] px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-foreground/70">{r.jurisdiction}</span>
                          <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium", pending(r) ? "bg-[#FBF0DE] text-[#7A3F06]" : "bg-[#DDF0E5] text-[#0F5132]")}>
                            <i aria-hidden className={cn("h-1.5 w-1.5 rounded-full", pending(r) ? "bg-[#C9822B]" : "bg-[#0F5132]")} />
                            {pending(r) ? "Waiting for validation" : "In use"}
                          </span>
                          <span className={cn("ml-auto inline-flex items-center gap-1 text-[12px] tabular-nums", pass === r.tests.length ? "text-[#0F5132]" : "font-semibold text-[#B42318]")}>
                            {pass === r.tests.length ? <Check className="h-3.5 w-3.5" aria-hidden /> : <CircleAlert className="h-3.5 w-3.5" aria-hidden />}
                            {pass}/{r.tests.length} tests
                          </span>
                        </span>
                        <span className={cn("line-clamp-3 text-[15.5px] font-semibold leading-snug", DISPLAY)}>{r.summary}</span>
                        <span className="rounded-lg bg-[#F5F4F0] px-2.5 py-1.5 font-mono text-[11.5px] leading-snug text-foreground/75">{oneLine(r)}</span>
                        <span className="mt-auto flex items-center justify-between gap-3 border-t border-[#EFEDE8] pt-2.5 text-[12px] text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{r.sources[0] ? lawOf(r.sources[0]) : "No source"}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {times > 0 && <span>Cited {times}×</span>}
                            <ChevronDown className={cn("h-4 w-4 transition-transform", on && "rotate-180")} aria-hidden />
                          </span>
                        </span>
                      </button>
                    </li>
                    {on && (
                      <li ref={detailRef} id={`rule-${r.id}`} className="col-span-full min-w-0">
                        <RuleDetail r={r} onClose={() => setOpen(null)} />
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          </section>
        );
      })}

      <section id="h-versions" aria-label="Rule versions" className="scroll-mt-6">
        {versions}
      </section>
    </div>
  );
}

function RuleDetail({ r, onClose }: { r: LibraryRule; onClose: () => void }) {
  const returns = (r.logic.returns as Record<string, unknown> | undefined) ?? {};
  const pass = r.tests.filter((t) => t.passed).length;
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.08)]">
      <header className="flex items-start justify-between gap-4 border-b border-[#EFEDE8] px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[12px] text-muted-foreground">{r.id}</p>
          <h3 className={cn("mt-1 text-[18px] font-semibold leading-snug", DISPLAY)}>{r.summary}</h3>
          {pending(r) && <p className="mt-1.5 text-[12.5px] text-[#7A3F06]">Waiting for the tax team to validate it. Until then Kiyos doesn&apos;t use it to answer customers; an expert does.</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="grid gap-0 lg:grid-cols-3 lg:divide-x lg:divide-[#EFEDE8]">
        {/* the law */}
        <div className="px-5 py-4">
          <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            <Scale className="h-3.5 w-3.5" aria-hidden /> The law
          </h4>
          {r.sources.map((s, i) => (
            <figure key={i} className="mt-3">
              <figcaption className="text-[13px] font-semibold">{lawOf(s)}</figcaption>
              {s.passage && <blockquote className="mt-1.5 border-l-2 border-[#BFE3D1] pl-3 text-[13px] leading-relaxed text-foreground/80">“{s.passage.trim()}”</blockquote>}
            </figure>
          ))}
          {r.explainer && (
            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-[#0E3B2C] [&::-webkit-details-marker]:hidden">
                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Read the explainer
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-2 max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#FAF9F6] p-3 text-[12.5px] leading-relaxed text-foreground/80">{r.explainer.replace(/^#+\s*/gm, "")}</div>
            </details>
          )}
        </div>

        {/* what Kiyos checks */}
        <div className="border-t border-[#EFEDE8] px-5 py-4 lg:border-t-0">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">What Kiyos checks</h4>
          <div className="mt-3 rounded-xl bg-[#F5F4F0] p-3.5">
            <Conditions r={r} logic={r.logic} />
          </div>
          {(returns.true !== undefined || returns.false !== undefined) && (
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-muted-foreground">If met</dt>
              <dd className="font-semibold text-[#0F5132]">{human(returns.true)}</dd>
              <dt className="text-muted-foreground">If not</dt>
              <dd className="text-foreground/80">{human(returns.false)}</dd>
            </dl>
          )}
          <p className="mt-4 text-[12px] font-medium text-muted-foreground">Facts it needs</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {r.inputs.map((i) => (
              <li key={i.name} className="text-[12.5px] leading-snug">
                <span className="font-mono text-[11.5px] text-foreground/60">{i.name}</span> <span className="text-foreground/80">{i.description ? `· ${i.description.replace(/\.$/, "")}` : ""}</span>
              </li>
            ))}
          </ul>
          {r.notes && <p className="mt-4 rounded-lg bg-[#EEF4FB] px-3 py-2 text-[12.5px] leading-relaxed text-foreground/80">{r.notes}</p>}
        </div>

        {/* tests */}
        <div className="border-t border-[#EFEDE8] px-5 py-4 lg:border-t-0">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            Tests · {pass} of {r.tests.length} pass
          </h4>
          <ul className="mt-3 flex flex-col gap-2">
            {r.tests.map((t) => (
              <li key={t.name} className="rounded-xl bg-[#FAF9F6] p-3 shadow-[inset_0_0_0_1px_#EFEDE8]">
                <p className="flex items-start gap-2 text-[13px] font-medium">
                  <span className={cn("mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full", t.passed ? "bg-[#DDF0E5] text-[#0F5132]" : "bg-[#FDEDEB] text-[#B42318]")}>
                    {t.passed ? <Check className="h-3 w-3" strokeWidth={3} aria-label="Passes" /> : <X className="h-3 w-3" strokeWidth={3} aria-label="Fails" />}
                  </span>
                  {t.name}
                </p>
                <p className="mt-1.5 pl-[26px] font-mono text-[11px] leading-relaxed text-foreground/65">
                  {Object.entries(t.inputs)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : String(v)}`)
                    .join(" · ")}
                </p>
                <p className="mt-1 pl-[26px] text-[12px] text-muted-foreground">
                  Expects <b className="font-semibold text-foreground/80">{human(returns[String(t.expected)] ?? t.expected)}</b>
                  {!t.passed && <span className="text-[#B42318]"> · {t.error ? `couldn't run: ${t.error}` : `got ${human(returns[String(t.got)] ?? t.got)}`}</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#EFEDE8] px-5 py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-muted-foreground">Cited in</span>
          {r.cited.cases.length ? (
            r.cited.cases.map((c) => (
              <Link key={c.id} href={`/expert/cases/${c.id}`} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card pl-1 pr-2.5 font-medium hover:border-[#0E3B2C]/40">
                <Face name={c.customer} size={20} />
                {c.customer}
              </Link>
            ))
          ) : (
            <span className="text-foreground/70">no assessment or answer yet</span>
          )}
          {r.cited.cases.length > 0 && (
            <span className="text-muted-foreground">
              ({[r.cited.assessments && `${r.cited.assessments} assessment${r.cited.assessments === 1 ? "" : "s"}`, r.cited.answers && `${r.cited.answers} answer${r.cited.answers === 1 ? "" : "s"}`].filter(Boolean).join(", ")})
            </span>
          )}
        </div>
      </footer>
      <details className="group border-t border-[#EFEDE8]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-3 text-[12.5px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <FileCode2 className="h-3.5 w-3.5" aria-hidden /> Source file <span className="font-mono text-[11.5px] font-normal">knowledge/{r.path}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        {r.yaml && <pre className="mx-5 mb-4 max-h-[360px] overflow-auto rounded-lg bg-[#12161C] p-3.5 text-[11.5px] leading-relaxed text-[#E6E8EB]">{r.yaml}</pre>}
      </details>
    </article>
  );
}
