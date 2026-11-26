"use client";

/**
 * The customer's file: everything Kiyos and the expert hold, in nine sections a return is
 * built from. Each section is a tile (its key facts, and whether anything needs checking);
 * opening it shows the facts in place, under its row, with their source, status and, where
 * it's the customer's to give, a way to change it. Read from the same record as every other page; nothing is
 * calculated here beyond counting.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, ChevronDown, Coins, FileStack, Globe, Loader2, Pencil, ReceiptText, Scale, Stamp, Users, Wallet, X, type LucideIcon } from "lucide-react";
import type { CaseDetail, DocumentRequest, Fact, InitialScan, ProfileChange } from "@/lib/types";
import type { Residency } from "@/lib/residency";
import { editProfile, type Saving } from "@/lib/residency";
import { explainSplitYear, pictureFromFacts, type PictureItem } from "@/lib/financial-picture";
import { estimatesOf, STATUS_SHORT, type Code } from "@/lib/position";
import { formatDate, formatMoneyCompact } from "@/lib/format";
import { Cite, type SourceNode } from "@/components/source/cite";
import { daysNode, itemNode } from "@/components/source/nodes";
import { statusOf } from "./home/holdings-board";
import { FactRow } from "./profile";
import { SENSITIVE_FACT } from "./profile-labels";
import { cn } from "@/lib/utils";
import { hasCaptain } from "@/lib/captain";

type Tone = "ok" | "check" | "missing" | "muted";
type Row = { key: string; label: string; sub?: string | null; value: string; node?: SourceNode | null; tone?: Tone; fact?: Fact; sensitive?: boolean; member?: CaseDetail["members"][number] };
type Section = { n: number; title: string; summary: string; rows: Row[]; empty?: string; badge?: { text: string; tone: Tone } };

const NAME: Record<Code, string> = { IN: "India", US: "US" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const d = (s: string | null | undefined) => (s ? formatDate(s, { day: "numeric", month: "short", year: "numeric" }) : "—");
const SCAN_Q: Record<string, string> = {
  need: "What you wanted help with", move_timing: "Your move", years_abroad: "Time abroad", retirement: "US retirement accounts",
  equity: "US shares or RSUs", india_funds: "Indian mutual funds", india_property: "Property in India", household: "Household",
};
const TONE_TEXT: Record<Tone, string> = { ok: "text-emerald-700", check: "text-foreground/75", missing: "text-amber-800", muted: "text-muted-foreground" };
/** One dot per section; colour has one meaning each: green complete, amber needed, neutral with the expert or not started. */
const DOT: Record<Tone, string> = { ok: "bg-primary", check: "bg-[#9C978A]", missing: "bg-[#C9822B]", muted: "bg-[#CFCABD]" };
const ICON: Record<number, LucideIcon> = { 1: Users, 2: Globe, 3: Coins, 4: Scale, 5: ReceiptText, 6: Wallet, 7: BadgeCheck, 8: Stamp, 9: FileStack };

/** Which income an asset produces, by kind and, where possible, by place in its name. */
export function producedBy(asset: PictureItem, income: PictureItem[], assets: PictureItem[]): PictureItem | null {
  const kind: Record<string, RegExp> = { Property: /rent/i, Investments: /dividend|gain/i, "Cash & deposits": /interest/i };
  const re = kind[asset.category ?? ""];
  if (!re) return null;
  const same = income.filter((i) => i.country === asset.country && re.test(`${i.label} ${i.category}`));
  const words = asset.label.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const named = same.find((i) => words.some((w) => `${i.label} ${i.detail ?? ""}`.toLowerCase().includes(w)));
  if (named) return named;
  // Without a name to match, link only when this is the one asset of its kind in the country.
  const peers = assets.filter((a) => a.country === asset.country && a.category === asset.category && typeof a.amount === "number");
  return peers.length === 1 && peers[0].id === asset.id ? same[0] ?? null : null;
}

function statusRow(r: PictureItem, docs: CaseDetail["documents"]): { tone: Tone; sub: string } {
  const s = statusOf(r, docs);
  if (!s) return { tone: "muted", sub: r.source ?? "" };
  return { tone: s.tone === "reviewed" ? "ok" : s.tone === "checking" ? "check" : "muted", sub: s.tone === "demo" ? "demo figure" : s.text };
}

export function buildFile(caseData: CaseDetail, residency: Residency | null, scan: InitialScan | null, requests: DocumentRequest[], savings: Saving[], changes: ProfileChange[]): Section[] {
  const facts = caseData.facts;
  const fact = (k: string) => facts.find((f) => f.key === k);
  const picture = explainSplitYear(pictureFromFacts(facts, caseData.members.map((m) => m.name)), facts).items;
  const income = picture.filter((i) => i.section === "income");
  const assets = picture.filter((i) => i.section === "holdings");
  const docs = caseData.documents;
  const est = estimatesOf(facts);
  const lead = caseData.case_captain;
  const leadFirst = hasCaptain(lead) ? lead.split(" ")[0] : "Kiyos";
  const pending = changes.filter((c) => c.status === "proposed");

  // 1 · you and your household
  const people: Row[] = caseData.members.map((m) => ({
    key: `m-${m.id}`, label: m.name, sub: m.role === "primary" ? "You" : m.role === "spouse" ? "Spouse" : "Dependant",
    value: m.citizenship ?? "Citizenship not given", tone: m.citizenship ? "ok" : "missing", member: m,
  }));
  const work: Row[] = facts.filter((f) => /employer/.test(f.key)).map((f) => ({ key: f.key, label: "", value: f.value, fact: f }));
  const ids: Row[] = facts.filter((f) => SENSITIVE_FACT.test(f.key)).map((f) => ({ key: f.key, label: "", value: f.value, fact: f, sensitive: true }));
  const told: Row[] = scan ? Object.entries(scan.answers).map(([k, v]) => ({ key: `scan-${k}`, label: SCAN_Q[k] ?? k.replace(/_/g, " "), sub: `WhatsApp, ${d(scan.created_at)}`, value: v, tone: "muted" as Tone })) : [];

  // 2 · residency
  const res: Row[] = [];
  for (const [c, years] of [["IN", residency?.india ?? []], ["US", residency?.us ?? []]] as const) {
    for (const y of years.filter((y) => !y.projected || y.current)) {
      res.push({
        key: `${c}-${y.year}`, label: `${FLAG[c]} ${NAME[c]} · ${y.year}`, sub: c === "IN" ? `${y.days} days${y.projected ? " by year-end" : ""}` : null,
        value: y.label, node: c === "IN" && residency ? daysNode(y, residency) : null, tone: residency?.reviewed[c] && !residency.reviewed[c]!.stale ? "ok" : "check",
      });
    }
  }
  const dates: Row[] = facts.filter((f) => /return_date|left_india|us_arrived|us_departed|green_card/.test(f.key)).map((f) => ({ key: f.key, label: "", value: f.value, fact: f }));
  if (!residency?.us.length) res.push({ key: "us-missing", label: "🇺🇸 US residency", value: "Needs your US arrival and departure dates", tone: "missing" });

  // 3 · income
  const inc: Row[] = income.map((i) => {
    const s = statusRow(i, docs);
    return { key: i.id, label: `${FLAG[i.country]} ${i.label}`, sub: [i.detail, s.sub].filter(Boolean).join(" · "), value: typeof i.amount === "number" ? formatMoneyCompact(i.amount, i.currency ?? "INR") ?? "—" : i.value ?? "—", node: itemNode(i), tone: s.tone };
  });

  // 4 · deductions and regime
  const ded: Row[] = facts
    .filter((f) => /regime|deduction|80c|80d|hra|standard_ded|itemi[sz]e/i.test(f.key))
    .map((f) => ({ key: f.key, label: "", value: f.value, fact: f }));
  const regimeTopic = caseData.topics.find((t) => /regime|deduction/i.test(t.title));
  if (regimeTopic) ded.push({ key: `t-${regimeTopic.id}`, label: regimeTopic.title, sub: regimeTopic.next_action, value: regimeTopic.status === "resolved" ? "Settled" : "With your expert", tone: regimeTopic.status === "resolved" ? "ok" : "check" });

  // 5 · tax paid and credits
  const paid: Row[] = [];
  for (const c of ["IN", "US"] as Code[]) {
    const e = est[c];
    if (e) paid.push({ key: `paid-${c}`, label: `${FLAG[c]} Paid so far · ${e.year}`, sub: `${c === "IN" ? "TDS and advance tax" : "Withholding"} · from ${e.enteredBy ?? "your expert"}`, value: formatMoneyCompact(e.withheld, e.currency) ?? "—", node: { title: `Paid so far · ${NAME[c]}`, value: formatMoneyCompact(e.withheld, e.currency), evidence: e.evidence }, tone: e.status === "reviewed" ? "ok" : "check" });
    else paid.push({ key: `paid-${c}`, label: `${FLAG[c]} Paid so far`, value: "Not entered yet", tone: "missing" });
  }
  facts.filter((f) => /tds|withh|advance_tax|credit/i.test(f.key) && !f.key.startsWith("tax_estimate")).forEach((f) => paid.push({ key: f.key, label: "", value: f.value, fact: f }));
  caseData.topics.filter((t) => /credit|ftc|1116/i.test(`${t.title} ${t.conclusion ?? ""}`)).forEach((t) => paid.push({ key: `t-${t.id}`, label: t.title, sub: t.conclusion, value: t.status === "resolved" ? "Settled" : "With your expert", tone: t.status === "resolved" ? "ok" : "check" }));

  // 6 · accounts and assets: what each produces
  const acc: Row[] = assets.map((a) => {
    const p = producedBy(a, income, assets);
    const s = statusRow(a, docs);
    return {
      key: a.id, label: `${FLAG[a.country]} ${a.label.replace(/\s+\([^)]*\)$/, "")}`,
      sub: p && typeof p.amount === "number" ? `Produces ${/^[A-Z]{2}/.test(p.label) ? p.label : p.label.charAt(0).toLowerCase() + p.label.slice(1)} ${formatMoneyCompact(p.amount, p.currency ?? "INR")} a year` : a.category === "Retirement" ? "No income this year" : s.sub,
      value: typeof a.amount === "number" ? formatMoneyCompact(a.amount, a.currency ?? "INR") ?? "—" : "Not valued yet", node: itemNode(a), tone: typeof a.amount === "number" ? s.tone : "missing",
    };
  });
  facts.filter((f) => /fbar|8938|fatca|schedule_fa|global_income/i.test(f.key)).forEach((f) => acc.push({ key: f.key, label: "", value: f.value, fact: f }));

  // 7 · choices
  const choices: Row[] = [
    ...caseData.topics.map((t) => ({ key: `t-${t.id}`, label: t.title, sub: t.status === "resolved" ? t.conclusion : t.next_action, value: t.status === "resolved" ? "Settled" : t.status === "in_progress" ? "In progress" : "Not started", tone: (t.status === "resolved" ? "ok" : "check") as Tone })),
    ...savings.map((s) => ({ key: `s-${s.id}`, label: s.title, sub: `${s.law} · from ${s.author}`, value: s.amount && s.currency ? `could save ${formatMoneyCompact(s.amount, s.currency)}` : "Proposed", tone: "check" as Tone })),
  ];

  // 8 · filings and compliance
  const filings: Row[] = (["IN", "US"] as Code[]).map((c) => {
    const cs = caseData.country_status?.[c];
    return { key: `f-${c}`, label: `${FLAG[c]} ${cs?.filing ?? (c === "IN" ? "India return" : "US return")}`, sub: cs?.state ?? null, value: cs?.due ? `due ${d(cs.due)}` : "Due date to be set", tone: (cs?.due ? "check" : "missing") as Tone };
  });
  caseData.notices.forEach((n) => filings.push({ key: `n-${n.id}`, label: `Notice: ${n.subject}`, sub: n.authority, value: n.deadline ? `reply by ${d(n.deadline)}` : "Open", tone: "missing" }));

  // 9 · returns on file
  const prior = docs.filter((x) => x.doc_type === "prior_returns");
  const priorReq = requests.filter((r) => r.doc_type === "prior_returns" && (r.status === "pending" || r.status === "rejected"));
  const returns: Row[] = [
    ...prior.map((x) => ({ key: `d-${x.id}`, label: x.filename, sub: x.status === "reviewed" ? "Reviewed" : "Being checked", value: "On file", tone: (x.status === "reviewed" ? "ok" : "check") as Tone })),
    ...priorReq.map((r) => ({ key: `r-${r.id}`, label: r.title, sub: r.why, value: "Needed from you", tone: "missing" as Tone })),
  ];

  const count = (rows: Row[], t: Tone) => rows.filter((r) => r.tone === t).length;
  const badge = (rows: Row[], extra = 0): { text: string; tone: Tone } => {
    const miss = count(rows, "missing");
    const check = count(rows, "check") + extra;
    if (!rows.length) return { text: "Not started", tone: "muted" };
    if (miss) return { text: `${miss} needed`, tone: "missing" };
    if (check) return { text: `${check} to check`, tone: "check" };
    return { text: "Complete", tone: "ok" };
  };
  const names = (rows: PictureItem[], c: Code) => Array.from(new Set(rows.filter((r) => r.country === c).map((r) => (r.category ?? r.label).replace(" & equity", "").toLowerCase()))).join(", ");
  const cur = (c: Code) => residency && (c === "IN" ? residency.india : residency.us).find((y) => y.current);

  return [
    { n: 1, title: "You and your household", summary: [caseData.members.map((m) => m.name.split(" ")[0]).join(", "), facts.filter((f) => /employer/.test(f.key)).map((f) => f.value).join(" → ") || null, pending.length ? `${pending.length} change proposed` : null].filter(Boolean).join(" · "), rows: [...people, ...work, ...ids, ...told], badge: pending.length ? { text: `${pending.length} to confirm`, tone: "missing" as Tone } : undefined },
    { n: 2, title: "Where you're resident", summary: [cur("IN") ? `India: ${STATUS_SHORT[cur("IN")!.status] ?? cur("IN")!.label}` : null, cur("US") ? `US: ${STATUS_SHORT[cur("US")!.status] ?? cur("US")!.label}` : "US: needs dates", fact("india_return_date") ? `back ${d(fact("india_return_date")!.value)}` : null].filter(Boolean).join(" · "), rows: [...res, ...dates] },
    { n: 3, title: "Income, by type", summary: [names(income, "IN") && `India: ${names(income, "IN")}`, names(income, "US") && `US: ${names(income, "US")}`].filter(Boolean).join(" · ") || "Nothing recorded yet", rows: inc },
    { n: 4, title: "Deductions and tax regime", summary: ded.length ? `${ded.length} item${ded.length === 1 ? "" : "s"}` : `${leadFirst} confirms these with you`, rows: ded, empty: `Nothing recorded yet. ${leadFirst} confirms your regime and deductions with you before the return.` },
    { n: 5, title: "Tax paid and credits", summary: (["IN", "US"] as Code[]).map((c) => (est[c] ? `${NAME[c]} ${formatMoneyCompact(est[c]!.withheld, est[c]!.currency)} paid` : null)).filter(Boolean).join(" · ") || "Not entered yet", rows: paid },
    { n: 6, title: "Accounts and assets", summary: `${assets.length} held · ${acc.filter((r) => r.sub?.startsWith("Produces")).length} produce income`, rows: acc },
    { n: 7, title: "Choices you've made", summary: choices.length ? `${choices.filter((r) => r.tone === "ok").length} settled · ${choices.filter((r) => r.tone !== "ok").length} open` : "None yet", rows: choices },
    { n: 8, title: "Filings and compliance", summary: filings.filter((r) => r.key.startsWith("f-")).map((r) => `${r.label.replace(/^\S+ /, "")} ${r.value}`).join(" · "), rows: filings },
    { n: 9, title: "Returns on file", summary: `${prior.length} on file${priorReq.length ? ` · ${priorReq.length} to upload` : ""}`, rows: returns, empty: "No past returns yet." },
  ].map((s) => ({ ...s, badge: s.badge ?? badge(s.rows) }));
}

export function YourFile({ sections, caseId, by }: { sections: Section[]; caseId: number; by: string }) {
  // One section open at a time, shown in place: directly under its row, across the full width,
  // so the detail stays next to what was selected instead of in a panel on the far side.
  const [openN, setOpenN] = useState<number | null>(null);
  const open = sections.find((s) => s.n === openN) ?? null;
  const tiles = useRef<Record<number, HTMLButtonElement | null>>({});
  const detail = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (openN !== null) detail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [openN]);
  const close = () => {
    const n = openN;
    setOpenN(null);
    if (n !== null) tiles.current[n]?.focus();
  };

  return (
    // Dense packing lets the tiles after the open one fill its row, so the detail always sits
    // on the row below, whatever the number of columns.
    <ol className="grid grid-flow-row-dense grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.flatMap((s) => {
        const Icon = ICON[s.n] ?? FileStack;
        const lines = s.summary.split(" · ").filter(Boolean).slice(0, 3);
        const isOpen = s.n === openN;
        const tile = (
          <li key={s.n} className="min-w-0">
            <button
              ref={(el) => {
                tiles.current[s.n] = el;
              }}
              type="button"
              aria-expanded={isOpen}
              aria-controls={isOpen ? `file-${s.n}` : undefined}
              onClick={() => setOpenN(isOpen ? null : s.n)}
              className={cn(
                "flex h-full w-full flex-col gap-3 rounded-[14px] border bg-card px-[18px] py-4 text-left transition-colors",
                isOpen ? "border-primary/50 bg-primary/[0.03] shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]" : "hover:border-[#CFCABD] hover:bg-muted/20"
              )}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5 text-[14.5px] font-semibold text-foreground">
                  <span aria-hidden className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#F4F1E8] text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">{s.title}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                  {s.badge && (
                    <>
                      <i aria-hidden className={cn("inline-block h-2 w-2 rounded-full", DOT[s.badge.tone])} />
                      {s.badge.text}
                    </>
                  )}
                  <ChevronDown aria-hidden className={cn("ml-1 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </span>
              </span>
              <span className="flex flex-col gap-1 text-[13.5px] text-foreground/85">
                {lines.length ? lines.map((l) => <span key={l} className="min-w-0 truncate">{l}</span>) : <span className="text-muted-foreground">Nothing recorded yet</span>}
              </span>
            </button>
          </li>
        );
        if (!isOpen || !open) return [tile];
        return [
          tile,
          <li
            key={`detail-${s.n}`}
            ref={detail}
            id={`file-${s.n}`}
            aria-label={`${s.title}, in full`}
            onKeyDown={(e) => e.key === "Escape" && close()}
            className="col-span-full rounded-[14px] border border-primary/30 bg-card"
          >
            <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
              <p className="text-[14px] font-semibold text-foreground">
                {open.title}
                <span className="ml-2 font-normal text-muted-foreground">
                  {open.rows.length} {open.rows.length === 1 ? "item" : "items"} · select a value to see where it comes from
                </span>
              </p>
              <button type="button" onClick={close} aria-label={`Close ${open.title}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {open.rows.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-muted-foreground">{open.empty ?? "Nothing recorded yet."}</p>
            ) : (
              // Facts across the width, in columns, instead of one long vertical list.
              <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-8 px-5 pb-2 md:grid-cols-2 xl:grid-cols-3">
                {open.rows.map((r) =>
                  r.fact ? (
                    <div key={r.key} className="min-w-0 border-b">
                      <FactRow fact={r.fact} caseId={caseId} by={by} sensitive={r.sensitive} />
                    </div>
                  ) : r.member ? (
                    <div key={r.key} className="min-w-0 border-b [&>div]:px-0">
                      <MemberRow m={r.member} role={r.sub ?? ""} caseId={caseId} by={by} />
                    </div>
                  ) : (
                    <div key={r.key} className="flex min-w-0 items-start justify-between gap-4 border-b py-2.5">
                      <div className="min-w-0">
                        <dt className="text-[13px] text-foreground">{r.label}</dt>
                        {r.sub && <dd className="text-[11.5px] leading-snug text-muted-foreground">{r.sub}</dd>}
                      </div>
                      <dd className={cn("shrink-0 text-right text-[13px] font-medium tabular-nums", r.tone ? TONE_TEXT[r.tone] : "text-foreground", r.tone === "ok" && "text-foreground")}>
                        {r.node ? <Cite node={r.node}>{r.value}</Cite> : r.value}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            )}
          </li>,
        ];
      })}
    </ol>
  );
}


/** A household member: citizenship and visa are what the customer told us, so they can change them. */
function MemberRow({ m, role, caseId, by }: { m: CaseDetail["members"][number]; role: string; caseId: number; by: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [cit, setCit] = useState(m.citizenship ?? "");
  const [visa, setVisa] = useState(m.visa_status ?? "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      if (cit.trim() && cit.trim() !== (m.citizenship ?? "")) await editProfile(caseId, { target: "member", id: m.id, field: "citizenship", value: cit, by });
      if (visa.trim() && visa.trim() !== (m.visa_status ?? "")) await editProfile(caseId, { target: "member", id: m.id, field: "visa_status", value: visa, by });
      toast.success("Saved. Your expert has been told and will check it.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  const input = "h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-[13px] outline-none focus:border-primary";
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <dt className="text-[14px] text-foreground">{m.name}</dt>
          <dd className="truncate text-[12.5px] text-muted-foreground">{role}{m.visa_status ? ` · ${m.visa_status}` : ""}</dd>
        </div>
        {!editing && (
          <dd className="flex shrink-0 items-center gap-2">
            <span className={cn("text-[14px] font-medium", m.citizenship ? "text-foreground" : TONE_TEXT.missing)}>{m.citizenship ?? "Citizenship not given"}</span>
            <button onClick={() => setEditing(true)} aria-label={`Edit ${m.name}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </dd>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input autoFocus value={cit} onChange={(e) => setCit(e.target.value)} placeholder="Citizenship" aria-label="Citizenship" className={input} />
          <input value={visa} onChange={(e) => setVisa(e.target.value)} placeholder="Visa or status, e.g. H-1B (US)" aria-label="Visa" className={input} />
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40">{busy && <Loader2 className="h-3 w-3 animate-spin" />}{busy ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} className="rounded-md border px-3 text-xs text-muted-foreground">Cancel</button>
        </div>
      )}
    </div>
  );
}
