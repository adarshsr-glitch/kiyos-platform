"use client";

/**
 * Three tabs of the expert's case workspace, built to be scanned rather than read:
 *   Tax questions    each question on the case, where it stands (open → working → concluded)
 *   Action items     the expert's to-dos and what the customer owes, overdue first
 *   Recommendations  advice the expert has given, as cards grouped by where it stands
 * Only records are shown. Recommendations come from experts only: anything the agent
 * proposed is left out (the system suggests nothing tax-shaped on its own).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Bell, Check, ChevronDown, Clock, RotateCcw } from "lucide-react";
import type { ActionItem, CaseDetail, Recommendation, TaxTopic } from "@/lib/types";
import { formatDate, formatMoneyCompact, initials } from "@/lib/format";
import { remindCustomer, setItemStatus } from "@/lib/residency";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { cn } from "@/lib/utils";
import { hasCaptain } from "@/lib/captain";

const DAY = 86_400_000;
const midnight = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).setHours(0, 0, 0, 0);
function due(iso: string | null): { text: string; late: boolean } | null {
  if (!iso) return null;
  const n = Math.round((midnight(iso) - new Date().setHours(0, 0, 0, 0)) / DAY);
  if (n < 0) return { text: `${-n} day${n === -1 ? "" : "s"} overdue`, late: true };
  if (n === 0) return { text: "due today", late: true };
  if (n === 1) return { text: "due tomorrow", late: false };
  return { text: n > 60 ? `due ${formatDate(iso, { day: "numeric", month: "short", year: "numeric" })}` : `due in ${n} days`, late: false };
}
const nice = (iso: string | null) => (iso ? formatDate(iso, { day: "numeric", month: "short", year: "numeric" }) : null);

function Avatar({ name }: { name: string }) {
  return (
    <span title={name} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
      {initials(name)}
    </span>
  );
}

function Folded({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} /> {title} <span className="tabular-nums">{count}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── Tax questions */

const STAGES = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "Expert working on it" },
  { key: "resolved", label: "Concluded" },
] as const;

export function TaxQuestions({ caseData }: { caseData: CaseDetail }) {
  const order = { in_progress: 0, open: 1, resolved: 2 } as Record<string, number>;
  const topics = [...caseData.topics].sort((a, b) => order[a.status] - order[b.status]);
  const count = (s: string) => caseData.topics.filter((t) => t.status === s).length;
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted-foreground">
        The tax questions on {caseData.client_name.split(" ")[0]}&apos;s case and where each one stands. A question is concluded only when the expert writes the conclusion.
      </p>
      {caseData.notices.filter((n) => n.status !== "resolved").map((n) => (
        <div key={n.id} className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-semibold text-foreground">Notice: {n.subject}</p>
            <p className="text-muted-foreground">{n.authority} · received {nice(n.received_at)}{n.deadline ? ` · reply by ${nice(n.deadline)}` : ""}</p>
          </div>
        </div>
      ))}
      {topics.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">No tax questions on this case yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-[12px]">
            {STAGES.map((s) => (
              <span key={s.key} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {s.label} <b className="ml-1 font-semibold tabular-nums text-foreground">{count(s.key)}</b>
              </span>
            ))}
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {topics.map((t) => <TopicCard key={t.id} t={t} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function TopicCard({ t }: { t: TaxTopic }) {
  const [more, setMore] = useState(false);
  const step = STAGES.findIndex((s) => s.key === t.status);
  const d = t.status !== "resolved" ? due(t.due_date) : null;
  return (
    <li className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-semibold leading-snug text-foreground">{t.title}</h3>
        <ConfidenceBadge level={t.confidence} />
      </div>
      {/* where it stands: three steps */}
      <ol className="mt-3 grid grid-cols-3 gap-1" aria-label={`Stage: ${STAGES[step]?.label}`}>
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <span className={cn("block h-1.5 rounded-full", i <= step ? (t.status === "resolved" ? "bg-emerald-500" : "bg-amber-500") : "bg-muted")} />
            <span className={cn("mt-1 block text-[10.5px]", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>{s.label}</span>
          </li>
        ))}
      </ol>
      {t.conclusion && t.status === "resolved" ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] leading-snug text-emerald-950">
          <span className="font-semibold">Conclusion: </span>{t.conclusion}
        </p>
      ) : t.conclusion ? (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[12.5px] leading-snug text-foreground">
          <span className="font-semibold">Working view, not final: </span>{t.conclusion}
        </p>
      ) : (
        <p className="mt-3 text-[12.5px] text-muted-foreground">No conclusion yet.</p>
      )}
      {t.next_action && (
        <p className="mt-2 text-[12.5px] text-foreground">
          <span className="text-muted-foreground">Next: </span>{t.next_action}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-2">
          {t.owner && <Avatar name={t.owner} />}
          {t.owner}
          {d && <span className={cn("inline-flex items-center gap-1", d.late && "font-medium text-rose-700")}><Clock className="h-3 w-3" />{d.text}</span>}
        </span>
        {(t.india_position || t.us_position) && (
          <button onClick={() => setMore((m) => !m)} className="font-medium text-foreground hover:underline">{more ? "Hide" : "India and US view"}</button>
        )}
      </div>
      {more && (
        <div className="mt-3 grid gap-2 border-t pt-3 text-[12.5px] sm:grid-cols-2">
          {t.india_position && <p><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">🇮🇳 India</span>{t.india_position}</p>}
          {t.us_position && <p><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">🇺🇸 US</span>{t.us_position}</p>}
        </div>
      )}
    </li>
  );
}

/* ─────────────────────────────────────────────────────────── Action items */

export function ActionItems({ caseData }: { caseData: CaseDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const first = caseData.client_name.split(" ")[0];
  // No named captain yet: the Kiyos team owns the case (never "Unassigned's to-dos").
  const named = hasCaptain(caseData.case_captain);
  const expert = named ? caseData.case_captain : "Kiyos team";
  const byDue = (a: ActionItem, b: ActionItem) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  const open = caseData.action_items.filter((i) => i.status !== "done");
  const mine = open.filter((i) => i.assignee !== "customer").sort(byDue);
  const theirs = open.filter((i) => i.assignee === "customer").sort(byDue);
  const done = caseData.action_items.filter((i) => i.status === "done");

  async function act(id: number, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  const row = (i: ActionItem, button: React.ReactNode) => {
    const d = i.status === "done" ? null : due(i.due_date);
    return (
      <li key={i.id} className={cn("flex items-center gap-3 px-4 py-3", d?.late && "bg-rose-50/40")}>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13.5px] font-medium leading-snug", i.status === "done" ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>{i.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            {d && <span className={cn("inline-flex items-center gap-1", d.late && "font-medium text-rose-700")}><Clock className="h-3 w-3" />{d.text}</span>}
            {i.status === "blocked" && <span className="font-medium text-amber-700">Blocked</span>}
            {i.notes && i.notes !== "clarification" && <span className="truncate">{i.notes}</span>}
            {i.notes === "clarification" && <span>Question sent on WhatsApp</span>}
          </p>
        </div>
        {button}
      </li>
    );
  };
  const btn = (label: string, icon: React.ReactNode, onClick: () => void, id: number) => (
    <button onClick={onClick} disabled={busy === id} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-50">
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: named ? `${expert.split(" ")[0]}'s to-dos` : "Kiyos team's to-dos", who: expert, items: mine, empty: "Nothing on your list.", action: (i: ActionItem) => btn("Mark done", <Check className="h-3.5 w-3.5" />, () => act(i.id, () => setItemStatus(i.id, "done", expert), "Marked done"), i.id) },
          { title: `Waiting on ${first}`, who: caseData.client_name, items: theirs, empty: `${first} doesn't owe you anything.`, action: (i: ActionItem) => btn("Remind", <Bell className="h-3.5 w-3.5" />, () => act(i.id, () => remindCustomer(i.id, expert), `Reminder sent to ${first} on WhatsApp`), i.id) },
        ].map((col) => (
          <section key={col.title} className="rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b px-4 py-3">
              <Avatar name={col.who} />
              <h3 className="text-[14px] font-semibold text-foreground">{col.title}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-muted-foreground">{col.items.length}</span>
              {col.items.some((i) => due(i.due_date)?.late) && (
                <span className="ml-auto text-[12px] font-medium text-rose-700">{col.items.filter((i) => due(i.due_date)?.late).length} overdue</span>
              )}
            </header>
            {col.items.length === 0 ? <p className="px-4 py-5 text-[13px] text-muted-foreground">{col.empty}</p> : <ul className="divide-y">{col.items.map((i) => row(i, col.action(i)))}</ul>}
          </section>
        ))}
      </div>
      <Folded title="Done" count={done.length}>
        <ul className="divide-y rounded-xl border bg-card">
          {done.map((i) => row(i, i.assignee !== "customer" ? btn("Reopen", <RotateCcw className="h-3.5 w-3.5" />, () => act(i.id, () => setItemStatus(i.id, "open", expert), "Reopened"), i.id) : null))}
        </ul>
      </Folded>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── Recommendations */

const REC: Record<string, { label: string; tone: string }> = {
  proposed: { label: "Suggested", tone: "bg-amber-50 text-amber-800" },
  accepted: { label: "Agreed", tone: "bg-emerald-50 text-emerald-800" },
  implemented_reported: { label: "Done", tone: "bg-sky-50 text-sky-800" },
  declined: { label: "Declined", tone: "bg-muted text-muted-foreground" },
  superseded: { label: "Replaced", tone: "bg-muted text-muted-foreground" },
};

export function Recommendations({ caseData }: { caseData: CaseDetail }) {
  const fromExperts = caseData.recommendations.filter((r) => r.author.toLowerCase() !== "agent");
  const hidden = caseData.recommendations.length - fromExperts.length;
  const newest = (a: Recommendation, b: Recommendation) => b.date.localeCompare(a.date);
  const active = fromExperts.filter((r) => r.status === "proposed" || r.status === "accepted").sort(newest);
  const done = fromExperts.filter((r) => r.status === "implemented_reported").sort(newest);
  const dropped = fromExperts.filter((r) => r.status === "declined" || r.status === "superseded").sort(newest);
  const first = caseData.client_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-muted-foreground">
        Advice the experts have given {first}. Each one is theirs, with their name and reasons. Ways to save added on the Today tab appear here too.
      </p>
      {active.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No open recommendations.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">{active.map((r) => <RecCard key={r.id} r={r} />)}</ul>
      )}
      <Folded title="Done" count={done.length}>
        <ul className="grid gap-3 lg:grid-cols-2">{done.map((r) => <RecCard key={r.id} r={r} />)}</ul>
      </Folded>
      <Folded title="Declined or replaced" count={dropped.length}>
        <ul className="grid gap-3 lg:grid-cols-2">{dropped.map((r) => <RecCard key={r.id} r={r} />)}</ul>
      </Folded>
      {hidden > 0 && (
        <p className="text-[12px] text-muted-foreground">
          {hidden} suggestion{hidden > 1 ? "s" : ""} from the agent {hidden > 1 ? "aren't" : "isn't"} shown. Recommendations come only from experts.
        </p>
      )}
    </div>
  );
}

function RecCard({ r }: { r: Recommendation }) {
  const [why, setWhy] = useState(false);
  const s = REC[r.status] ?? { label: r.status, tone: "bg-muted text-muted-foreground" };
  const cur = r.currency === "USD" ? "USD" : "INR";
  const save = r.amount ? formatMoneyCompact(r.amount, cur) : null;
  const faded = r.status === "declined" || r.status === "superseded";
  return (
    <li className={cn("flex flex-col rounded-xl border bg-card p-4", faded && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-semibold leading-snug text-foreground">
          {r.country && <span className="mr-1.5">{r.country === "IN" ? "🇮🇳" : "🇺🇸"}</span>}
          {r.content}
        </h3>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", s.tone)}>{s.label}</span>
      </div>
      {(save || r.deadline) && (
        <div className="mt-3 flex flex-wrap gap-4">
          {save && (
            <div>
              <p className="text-[11px] text-muted-foreground">Could save about</p>
              <p className="text-[17px] font-semibold tabular-nums text-foreground">{save}</p>
            </div>
          )}
          {r.deadline && (
            <div>
              <p className="text-[11px] text-muted-foreground">By</p>
              <p className="text-[17px] font-semibold text-foreground">{nice(r.deadline)}</p>
            </div>
          )}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-2"><Avatar name={r.author} />{r.author} · {nice(r.date)}</span>
        {r.rationale && <button onClick={() => setWhy((w) => !w)} className="font-medium text-foreground hover:underline">{why ? "Hide reason" : "Why"}</button>}
      </div>
      {why && r.rationale && <p className="mt-2 border-t pt-2 text-[12.5px] leading-relaxed text-foreground">{r.rationale}</p>}
    </li>
  );
}
