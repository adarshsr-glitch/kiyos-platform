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

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleAlert, FileCode2, Flag, Loader2, Scale, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Face } from "./face";
import { Tabs } from "./tabs";

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
  added: string | null;
  changed: string | null;
  flags: Flag[];
};
type Flag = { id: number; rule_id: string; note: string; by: string; at: string; resolved_at: string | null; resolved_by: string | null };

const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null);
const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : Infinity);

/** Why a written rule needs a look: facts from its tests, flags and where it has been cited. */
function attentionOf(r: LibraryRule): string[] {
  const out: string[] = [];
  const failing = r.tests.filter((t) => !t.passed).length;
  if (failing) out.push(`${failing} test${failing === 1 ? "" : "s"} failing`);
  const open = r.flags.filter((f) => !f.resolved_at).length;
  if (open) out.push(`${open} open flag${open === 1 ? "" : "s"}`);
  if (r.status !== "active" && r.cited.answers) out.push(`cited in ${r.cited.answers} answer${r.cited.answers === 1 ? "" : "s"} before validation`);
  return out;
}

const LAW: [RegExp, string][] = [
  [/^IN-ITA/, "Income Tax Act"],
  [/^US-IRC/, "Internal Revenue Code"],
];
const OP: Record<string, string> = { ">=": "is at least", ">": "is more than", "<=": "is at most", "<": "is less than", "==": "equals" };

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

export type IndexEntry = { id: string; country: string; area: string; title: string; law: string | null; section: string | null; kind: string; status: string };

const STATUS: Record<string, { label: string; pill: string; dot: string }> = {
  active: { label: "In use", pill: "bg-[#DDF0E5] text-[#0F5132]", dot: "bg-[#0F5132]" },
  pending_validation: { label: "Waiting for validation", pill: "bg-[#FBF0DE] text-[#7A3F06]", dot: "bg-[#C9822B]" },
  not_written: { label: "Not written yet", pill: "bg-[#F1F0EC] text-foreground/55", dot: "bg-[#D9D7D0]" },
};
const statusOf = (s: string) => STATUS[s] ?? (s === "draft" ? STATUS.pending_validation : { label: s.replace(/_/g, " "), pill: "bg-[#FBF0DE] text-[#7A3F06]", dot: "bg-[#C9822B]" });
const KIND_LABEL: Record<string, string> = {
  test: "Test", definition: "Definition", caveat: "Caveat", exemption: "Exemption", deduction: "Deduction", rate: "Rate", threshold: "Threshold",
  valuation: "Valuation", withholding: "Withholding", procedure: "Procedure", deadline: "Deadline", disclosure: "Disclosure", penalty: "Penalty", relief: "Relief", rule: "Rule",
};
const COUNTRY_TAB: Record<string, string> = { IN: "India", US: "United States", "IN-US": "Treaty" };
type StatusFilter = "all" | "written" | "active" | "pending" | "not_written";

export function RulesLibrary({ rules, index, versions, me }: { rules: LibraryRule[]; index: IndexEntry[]; versions: React.ReactNode; me: string | null }) {
  const [country, setCountry] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [areasOpen, setAreasOpen] = useState<Set<string>>(() => new Set(index.filter((e) => e.status !== "not_written").map((e) => e.area)));
  const byId = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const openRule = (id: string) => {
    const e = index.find((x) => x.id === id);
    setCountry("all");
    setStatus("all");
    setQ("");
    if (e) setAreasOpen((s) => new Set(s).add(e.area));
    setOpen(id);
    setTimeout(() => document.getElementById(`rule-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const attention = rules.map((r) => ({ r, why: attentionOf(r) })).filter((x) => x.why.length);
  const recent = [...rules].sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "")).slice(0, 5);

  const tests = rules.flatMap((r) => r.tests);
  const passing = tests.filter((t) => t.passed).length;
  const written = index.filter((e) => e.status !== "not_written").length;
  const active = index.filter((e) => e.status === "active").length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return index.filter(
      (e) =>
        (country === "all" || e.country === country) &&
        (status === "all" ||
          (status === "written" && e.status !== "not_written") ||
          (status === "active" && e.status === "active") ||
          (status === "pending" && e.status !== "active" && e.status !== "not_written") ||
          (status === "not_written" && e.status === "not_written")) &&
        (!needle || [e.id, e.title, e.law, e.section, e.area, byId.get(e.id)?.summary].some((s) => s?.toLowerCase().includes(needle)))
    );
  }, [index, country, status, q, byId]);

  const areas = useMemo(() => {
    const m = new Map<string, IndexEntry[]>();
    for (const e of shown) m.set(e.area, [...(m.get(e.area) ?? []), e]);
    return Array.from(m.entries());
  }, [shown]);
  const filtering = !!q.trim() || status !== "all";
  const toggleArea = (a: string) =>
    setAreasOpen((s) => {
      const n = new Set(s);
      if (n.has(a)) n.delete(a);
      else n.add(a);
      return n;
    });

  const tiles: { key: StatusFilter | "tests"; label: string; value: string | number; note: string; dot: string; bar?: number }[] = [
    { key: "all", label: "In the index", value: index.length, note: "rules Kiyos needs, across India, the US and the treaty", dot: "bg-[#7C8595]" },
    { key: "written", label: "Written", value: written, note: `${Math.round((written / Math.max(1, index.length)) * 100)}% of the index so far`, dot: "bg-[#1D6B5C]", bar: written / Math.max(1, index.length) },
    { key: "active", label: "In use", value: active, note: "Kiyos answers only from these", dot: "bg-[#0F5132]" },
    { key: "tests", label: "Tests", value: `${passing}/${tests.length}`, note: passing === tests.length ? "all pass, run when this page opened" : `${tests.length - passing} failing`, dot: passing === tests.length ? "bg-[#5FB58A]" : "bg-[#B42318]" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-[760px]">
          <h1 className={cn("text-[26px] font-semibold tracking-[-0.015em]", DISPLAY)}>Rules</h1>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">
            The knowledge Kiyos reasons from: an index of every law, test, threshold, caveat and deadline it needs across India, the US and the treaty. The tax team writes each rule, quoting the law, and validates it; Kiyos answers only from rules in use and hands everything else to an expert.
          </p>
        </div>
        <a href="#h-versions" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border bg-card px-3.5 text-[13px] font-semibold text-foreground hover:border-[#0E3B2C]/40">
          Import from the spreadsheet <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </header>

      <section aria-label="The rule library at a glance" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] lg:grid-cols-4">
        {tiles.map((t) => {
          const clickable = t.key !== "tests";
          const on = clickable && status === t.key && t.key !== "all";
          const Tag = clickable ? "button" : "div";
          return (
            <Tag
              key={t.key}
              {...(clickable ? { type: "button" as const, onClick: () => setStatus(on || t.key === "all" ? "all" : (t.key as StatusFilter)), "aria-pressed": on } : {})}
              className={cn("flex flex-col gap-2.5 rounded-xl px-4 py-3.5 text-left", clickable && (on ? "bg-[#0E3B2C] text-white" : "hover:bg-[#F5F4F0]"))}
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium">
                <i aria-hidden className={cn("h-2 w-2 rounded-full", t.dot)} />
                {t.label}
              </span>
              <span className={cn("text-[32px] font-semibold leading-none tabular-nums tracking-[-0.02em]", DISPLAY)}>{t.value}</span>
              {t.bar !== undefined && (
                <span aria-hidden className={cn("h-1.5 overflow-hidden rounded-full", on ? "bg-white/20" : "bg-[#EFEDE8]")}>
                  <span className={cn("block h-full rounded-full", on ? "bg-[#BFE3D1]" : "bg-[#1D6B5C]")} style={{ width: `${Math.max(2, t.bar * 100)}%` }} />
                </span>
              )}
              <span className={cn("text-[12px]", on ? "text-white/70" : "text-muted-foreground")}>{t.note}</span>
            </Tag>
          );
        })}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        <section aria-labelledby="h-attention" className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
          <h2 id="h-attention" className="flex items-center gap-2 px-4 pb-2 pt-3.5 text-[14px] font-semibold">
            <CircleAlert className={cn("h-4 w-4", attention.length ? "text-[#B42318]" : "text-muted-foreground")} aria-hidden /> Needs attention
            <span className="text-[12.5px] font-normal text-muted-foreground">failing tests, flags, or cited before validation</span>
          </h2>
          {attention.length === 0 ? (
            <p className="px-4 pb-4 text-[13px] text-muted-foreground">Nothing. Every written rule passes its tests and has no open flags.</p>
          ) : (
            <ul className="pb-1.5">
              {attention.map(({ r, why }) => (
                <li key={r.id}>
                  <button type="button" onClick={() => openRule(r.id)} className="flex w-full items-center gap-3 border-t border-[#EFEDE8] px-4 py-2.5 text-left hover:bg-[#FAF9F6]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{r.summary}</span>
                      <span className="mt-0.5 flex flex-wrap gap-1.5">
                        {why.map((w) => (
                          <span key={w} className="rounded-full bg-[#FDEDEB] px-2 py-0.5 text-[11.5px] font-medium text-[#B42318]">{w}</span>
                        ))}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="h-recent" className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
          <h2 id="h-recent" className="flex items-center gap-2 px-4 pb-2 pt-3.5 text-[14px] font-semibold">
            Recently added <span className="text-[12.5px] font-normal text-muted-foreground">newest first, from the repository&apos;s history</span>
          </h2>
          <ul className="pb-1.5">
            {recent.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => openRule(r.id)} className="flex w-full items-center gap-3 border-t border-[#EFEDE8] px-4 py-2.5 text-left hover:bg-[#FAF9F6]">
                  <span className="w-[86px] shrink-0 text-[12px] tabular-nums text-muted-foreground">{dateOf(r.added) ?? "Not committed"}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{r.summary}</span>
                  {daysAgo(r.added) <= 7 && <span className="shrink-0 rounded-full bg-[#E6EEFA] px-2 py-0.5 text-[11px] font-semibold text-[#1F4E8C]">New</span>}
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusOf(r.status).dot)} aria-label={statusOf(r.status).label} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Country"
          value={country}
          onChange={setCountry}
          tabs={["all", "IN", "US", "IN-US"].filter((c) => c === "all" || index.some((e) => e.country === c)).map((c) => ({ key: c, label: c === "all" ? "All" : COUNTRY_TAB[c], count: c === "all" ? index.length : index.filter((e) => e.country === c).length }))}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status" className="h-8 rounded-lg border bg-card px-2.5 text-[13px] outline-none focus:border-[#0E3B2C]">
          <option value="all">Any status</option>
          <option value="written">Written</option>
          <option value="active">In use</option>
          <option value="pending">Waiting for validation</option>
          <option value="not_written">Not written yet</option>
        </select>
        <span className="flex-1" />
        <label className="relative">
          <span className="sr-only">Search the index</span>
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a topic, section or rule" className="h-9 w-[260px] rounded-[10px] border bg-card pl-9 pr-3 text-[13px] outline-none focus:border-[#0E3B2C]" />
        </label>
      </div>

      {areas.length === 0 && <p className="rounded-2xl bg-card px-5 py-10 text-center text-[13.5px] text-muted-foreground shadow-[0_0_0_1px_rgba(16,24,40,.06)]">Nothing in the index matches.</p>}

      <ol className="flex flex-col gap-3">
        {areas.map(([area, entries]) => {
          const all = index.filter((e) => e.area === area);
          const done = all.filter((e) => e.status !== "not_written").length;
          const isOpen = filtering || areasOpen.has(area);
          const c = all[0]?.country;
          return (
            <li key={area} className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
              <button type="button" aria-expanded={isOpen} onClick={() => toggleArea(area)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-[#FAF9F6]">
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} aria-hidden />
                <span className="w-[42px] shrink-0 rounded-md bg-[#F1F0EC] px-1.5 py-0.5 text-center text-[11px] font-semibold tracking-wide text-foreground/70">{c === "IN-US" ? "IN·US" : c}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px] font-semibold", DISPLAY)}>{area}</span>
                  <span className="block text-[12.5px] text-muted-foreground">
                    {done} of {all.length} written{filtering && entries.length !== all.length ? ` · ${entries.length} match` : ""}
                  </span>
                </span>
                <span aria-hidden className="hidden h-1.5 w-[120px] overflow-hidden rounded-full bg-[#EFEDE8] sm:block">
                  <span className="block h-full rounded-full bg-[#1D6B5C]" style={{ width: `${(done / all.length) * 100}%` }} />
                </span>
              </button>
              {isOpen && (
                <ul className="border-t border-[#EFEDE8]">
                  {entries.map((e) => {
                    const rule = byId.get(e.id);
                    const st = statusOf(e.status);
                    const on = open === e.id;
                    const pass = rule ? rule.tests.filter((t) => t.passed).length : 0;
                    const rowInner = (
                      <>
                        <span className="w-[88px] shrink-0 text-[11.5px] font-medium text-muted-foreground">{KIND_LABEL[e.kind] ?? e.kind}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-[13.5px] leading-snug", rule ? "font-semibold text-foreground" : "text-foreground/75")}>{e.title}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                            {[e.law, e.section && (e.law?.startsWith("Internal") ? `§ ${e.section}` : e.law?.startsWith("India") ? e.section : `s. ${e.section}`)].filter(Boolean).join(" · ")}
                            {rule ? ` · ${e.id}` : ""}
                          </span>
                        </span>
                        {rule && (
                          <span className={cn("hidden shrink-0 items-center gap-1 text-[12px] tabular-nums sm:inline-flex", pass === rule.tests.length ? "text-[#0F5132]" : "font-semibold text-[#B42318]")}>
                            {pass === rule.tests.length ? <Check className="h-3.5 w-3.5" aria-hidden /> : <CircleAlert className="h-3.5 w-3.5" aria-hidden />}
                            {pass}/{rule.tests.length} tests
                          </span>
                        )}
                        <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", st.pill)}>
                          <i aria-hidden className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                        {rule ? <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", on && "rotate-180")} aria-hidden /> : <span className="w-4 shrink-0" />}
                      </>
                    );
                    return (
                      <Fragment key={e.id}>
                        <li id={`rule-row-${e.id}`} className="scroll-mt-4 border-b border-[#EFEDE8] last:border-0">
                          {rule ? (
                            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : e.id)} className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#FAF9F6]", on && "bg-[#F5F4F0]")}>
                              {rowInner}
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 px-4 py-2.5">{rowInner}</div>
                          )}
                        </li>
                        {on && rule && (
                          <li className="border-b border-[#EFEDE8] bg-[#F5F4F0] p-3 last:border-0">
                            <RuleDetail r={rule} me={me} onClose={() => setOpen(null)} />
                          </li>
                        )}
                      </Fragment>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-[12px] text-muted-foreground">Index titles and section references are a starting point for the tax team to confirm. They carry no tax wording or logic; a rule says something only once it is written and validated.</p>

      <section id="h-versions" aria-label="Rule versions" className="scroll-mt-6">
        {versions}
      </section>
    </div>
  );
}

function RuleDetail({ r, me, onClose }: { r: LibraryRule; me: string | null; onClose: () => void }) {
  const returns = (r.logic.returns as Record<string, unknown> | undefined) ?? {};
  const pass = r.tests.filter((t) => t.passed).length;
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.08)]">
      <header className="flex items-start justify-between gap-4 border-b border-[#EFEDE8] px-5 py-4">
        <div className="min-w-0">
          <p className="flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
            <span className="font-mono">{r.id}</span>
            {r.added && <span>Added {dateOf(r.added)}</span>}
            {r.changed && r.changed !== r.added && <span>Last changed {dateOf(r.changed)}</span>}
          </p>
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

      <Flags r={r} me={me} />
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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Flags on a rule: an expert's note that it may be wrong or out of date, for the tax team.
 * A flag changes nothing in the rule; it shows under Needs attention until resolved. */
function Flags({ r, me }: { r: LibraryRule; me: string | null }) {
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const open = r.flags.filter((f) => !f.resolved_at);
  const send = async (url: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "That didn't save");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't save");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Flags" className="border-t border-[#EFEDE8] px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          <Flag className="h-3.5 w-3.5" aria-hidden /> Flags {open.length ? `· ${open.length} open` : ""}
        </h4>
        <span className="flex-1" />
        {!writing && (
          <button type="button" onClick={() => setWriting(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[12.5px] font-semibold hover:border-[#0E3B2C]/40">
            <Flag className="h-3.5 w-3.5" aria-hidden /> Flag for the tax team
          </button>
        )}
      </div>
      {open.length === 0 && !writing && <p className="mt-1.5 text-[12.5px] text-muted-foreground">No open flags. Flag a rule if it looks out of date or misses a case; the tax team reviews it.</p>}
      {open.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {open.map((f) => (
            <li key={f.id} className="flex items-start gap-3 rounded-xl bg-[#FDEDEB]/60 px-3.5 py-2.5 text-[13px]">
              <span className="min-w-0 flex-1">
                <span className="block leading-snug">{f.note}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {f.by} · {dateOf(f.at)}
                </span>
              </span>
              <button type="button" disabled={busy} onClick={async () => (await send(`${API}/rules/flags/${f.id}/resolve${me ? `?by=${encodeURIComponent(me)}` : ""}`)) && (toast.success("Flag resolved"), router.refresh())} className="shrink-0 text-[12.5px] font-semibold text-[#0E3B2C] hover:underline disabled:opacity-50">
                Resolve
              </button>
            </li>
          ))}
        </ul>
      )}
      {writing && (
        <div className="mt-2">
          <label htmlFor={`flag-${r.id}`} className="text-[12.5px] font-medium">
            What looks wrong or out of date?
          </label>
          <textarea id={`flag-${r.id}`} autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The Finance Act changed this threshold" className="mt-1.5 w-full resize-y rounded-lg border bg-background px-2.5 py-2 text-[13.5px] outline-none focus:border-[#0E3B2C]" />
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy || !note.trim()} onClick={async () => (await send(`${API}/rules/${r.id}/flags`, { note, by: me })) && (toast.success("Flagged for the tax team"), setWriting(false), setNote(""), router.refresh())} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0E3B2C] px-3 text-[12.5px] font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Flag it
            </button>
            <button type="button" onClick={() => (setWriting(false), setNote(""))} className="h-8 rounded-lg px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
