"use client";

/**
 * The top of the expert's Today tab: everything on this case that needs the expert, one row
 * each with the one button that does it, and, beside it, what's waiting on the customer.
 * Built only from records (tickets, documents sent, the agent's brief, open to-dos); every
 * button writes a real record.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, Bell, Check, CheckCircle2, FileSearch, FileText, ListTodo, Lock, MessageCircleQuestion, Plus, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reviewAssessment } from "@/lib/api";
import { askClarification, remindCustomer, requestDocuments, setItemStatus, setReviewStatus, type Brief, type DocReading } from "@/lib/residency";
import type { ActionItem, Ticket } from "@/lib/types";
import { SideSheet } from "@/components/side-sheet";
import { DocumentReader } from "@/components/document-reader";
import { KindTile } from "@/components/expert/kinds";
import { urgency, type DeskRow } from "@/lib/desk";

type Row = {
  key: string;
  icon: React.ElementType;
  title: string;
  detail?: string;
  /** "4 days overdue", "due in 2 days", "sent today" */
  when?: string;
  late?: boolean;
  action: { label: string; run: () => void | Promise<void>; primary?: boolean };
};

const DAY = 86_400_000;
const startOf = (iso: string) => new Date((iso.length === 10 ? `${iso}T00:00:00` : iso)).setHours(0, 0, 0, 0);
const today = () => new Date().setHours(0, 0, 0, 0);
function due(iso: string | null): { text?: string; late: boolean } {
  if (!iso) return { late: false };
  const n = Math.round((startOf(iso) - today()) / DAY);
  if (n < 0) return { text: `${-n} day${n === -1 ? "" : "s"} overdue`, late: true };
  if (n === 0) return { text: "due today", late: true };
  return { text: n === 1 ? "due tomorrow" : `due in ${n} days`, late: false };
}
function ago(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const n = Math.round((today() - startOf(iso)) / DAY);
  return n <= 0 ? "today" : n === 1 ? "1 day" : `${n} days`;
}
const scrollToReview = () => document.getElementById("q-h")?.scrollIntoView({ behavior: "smooth", block: "start" });

const STATUS: { key: Brief["review_status"]; label: string }[] = [
  { key: "in_review", label: "In review" },
  { key: "awaiting_customer", label: "Waiting on customer" },
  { key: "ready_for_signoff", label: "Ready for sign-off" },
];

export function UpNext({
  brief, tickets, readings, items, advisor, customer, desk,
}: {
  brief: Brief;
  tickets: Ticket[];
  readings: DocReading[];
  items: ActionItem[];
  advisor: string;
  customer: string;
  /** The desk's items for this case (Review 06, EX-10): each opens in Triage, as on Home. */
  desk?: { rows: DeskRow[]; today: string } | null;
}) {
  const router = useRouter();
  const first = customer.split(" ")[0];
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  // ── what needs the expert, most urgent first
  const mine: Row[] = [];
  for (const t of tickets.filter((t) => t.status === "open")) {
    const d = due(t.sla_due_at);
    mine.push({ key: `t${t.id}`, icon: MessageCircleQuestion, title: `Answer ${first}'s question`, detail: `“${t.question}”`, when: d.late ? "reply overdue" : "reply within a day", late: d.late,
      action: { label: "Answer", run: scrollToReview, primary: true } });
  }
  for (const r of readings.filter((r) => r.status !== "reviewed" && r.status !== "rejected")) {
    mine.push({ key: `r${r.id}`, icon: FileText, title: `Check the ${r.extraction?.title ?? r.filename}`, detail: `${first} sent it ${ago(r.created_at) === "today" ? "today" : `${ago(r.created_at)} ago`}`,
      action: { label: "Review", run: scrollToReview, primary: true } });
  }
  for (const d of brief.discrepancies) {
    const q = `The document you sent (${d.found_source}) shows ${d.found} for your ${d.title}, but you told us ${d.stated}. Could you confirm which is right?`;
    mine.push({ key: `x${d.id}`, icon: AlertTriangle, title: `${d.title} doesn't match`, detail: `Told us ${d.stated} · document shows ${d.found}`, late: true,
      action: { label: `Ask ${first}`, run: () => setAsk(q), primary: true } });
  }
  for (const s of brief.suggested_requests) {
    mine.push({ key: `s${s.title}`, icon: FileSearch, title: `Request: ${s.title}`, detail: s.why,
      action: { label: "Request on WhatsApp", run: () => run(`s${s.title}`, () => requestDocuments(brief.case_id, [s]), `Requested on ${first}'s WhatsApp`) } });
  }
  for (const i of items.filter((i) => i.assignee !== "customer" && i.status !== "done").sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))) {
    const d = due(i.due_date);
    mine.push({ key: `i${i.id}`, icon: ListTodo, title: i.title, when: d.text, late: d.late,
      action: { label: "Mark done", run: () => run(`i${i.id}`, () => setItemStatus(i.id, "done", advisor), "Marked done") } });
  }
  if (brief.assessment && brief.assessment.status !== "signed_off" && brief.can_sign_off) {
    const a = brief.assessment;
    mine.push({ key: "sign", icon: Lock, title: "Sign off the assessment", detail: a.headline,
      action: { label: "Sign off", primary: true, run: () => run("sign", () => reviewAssessment(a.id, "sign_off", advisor), "Assessment signed off") } });
  }
  mine.sort((a, b) => Number(!!b.late) - Number(!!a.late));
  // Suggested requests aren't on the desk: they stay here as one-press actions.
  const suggested = mine.filter((r) => r.key.startsWith("s"));
  const count = desk ? desk.rows.length + suggested.length : mine.length;

  // ── what the customer owes
  const theirs: Row[] = [];
  for (const i of items.filter((i) => i.assignee === "customer" && i.status !== "done")) {
    const c = brief.clarifications.find((c) => c.title === i.title);
    theirs.push({ key: `c${i.id}`, icon: MessageCircleQuestion, title: i.title, when: c ? `asked ${ago(c.created_at) === "today" ? "today" : `${ago(c.created_at)} ago`}` : due(i.due_date).text,
      action: { label: "Remind", run: () => run(`c${i.id}`, () => remindCustomer(i.id, advisor), `Reminder sent to ${first} on WhatsApp`) } });
  }
  for (const r of brief.requests.filter((r) => r.status === "pending" || r.status === "rejected")) {
    const d = due(r.due_date);
    theirs.push({ key: `q${r.id}`, icon: FileText, title: r.title, when: r.status === "rejected" ? "new copy asked for" : d.text, late: d.late,
      action: { label: "", run: () => {} } });
  }

  return (
    <section aria-labelledby="h-next" className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 id="h-next" className="text-[15px] font-semibold text-foreground">
            Up next for you
            <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums", count ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{count}</span>
          </h2>
          <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="h-3.5 w-3.5" /> Add a document for {first}
          </button>
        </header>
        {desk ? (
          desk.rows.length + suggested.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-5 text-[13.5px] text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Nothing needs you on this case right now.</p>
          ) : (
            <ul className="divide-y">
              {desk.rows.map((r) => <DeskLine key={r.key} r={r} today={desk.today} />)}
              {suggested.map((r) => <Line key={r.key} r={r} busy={busy === r.key} />)}
            </ul>
          )
        ) : mine.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-5 text-[13.5px] text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Nothing needs you on this case right now.</p>
        ) : (
          <ul className="divide-y">
            {mine.map((r) => <Line key={r.key} r={r} busy={busy === r.key} />)}
          </ul>
        )}
        <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-2.5 text-[12px]">
          <span className="text-muted-foreground">Case status</span>
          {STATUS.map((s) => {
            const blocked = s.key === "ready_for_signoff" && !brief.can_sign_off;
            return (
              <button
                key={s.key}
                disabled={blocked || busy !== null}
                title={blocked ? brief.blockers.join("; ") : undefined}
                onClick={() => run("status", () => setReviewStatus(brief.case_id, s.key), `Status: ${s.label}`)}
                className={cn("rounded-full border px-2.5 py-0.5 font-medium disabled:cursor-not-allowed disabled:opacity-40", brief.review_status === s.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
              >
                {s.label}
              </button>
            );
          })}
        </footer>
      </div>

      <div className="rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="text-[15px] font-semibold text-foreground">
            Waiting on {first}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-muted-foreground">{theirs.length}</span>
          </h3>
          <button onClick={() => setAsk("")} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="h-3.5 w-3.5" /> Ask {first}
          </button>
        </header>
        {theirs.length === 0 ? (
          <p className="px-4 py-5 text-[13.5px] text-muted-foreground">{first} doesn&apos;t owe you anything.</p>
        ) : (
          <ul className="divide-y">
            {theirs.map((r) => <Line key={r.key} r={r} busy={busy === r.key} compact />)}
          </ul>
        )}
      </div>

      <SideSheet open={ask !== null} onClose={() => setAsk(null)} title={`Ask ${first}`} eyebrow="Sent on WhatsApp and shown in their workspace">
        <AskForm key={ask ?? "closed"} initial={ask ?? ""} first={first} busy={busy === "ask"} onSend={(q) => run("ask", async () => { await askClarification(brief.case_id, q); setAsk(null); }, `Sent to ${first} on WhatsApp`)} />
      </SideSheet>
      <SideSheet open={uploadOpen} onClose={() => { setUploadOpen(false); router.refresh(); }} title={`Add a document for ${first}`} eyebrow="Received by email or in person">
        <DocumentReader caseId={brief.case_id} docType={null} by={advisor} onDone={() => router.refresh()} />
      </SideSheet>
    </section>
  );
}

/** A desk item: the same kind tile and urgency as Home and Triage; opens the item in Triage. */
function DeskLine({ r, today }: { r: DeskRow; today: string }) {
  const u = urgency(r, today);
  const title = r.kind === "documents" ? `Check ${r.detail.documents.length === 1 ? "1 document" : `${r.detail.documents.length} documents`}${r.detail.read ? " Kiyos read" : ""}` : r.kind === "question" ? `Reply: “${r.title.replace(/^About “[^”]*”:\s*/, "")}”` : r.title;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <KindTile kind={r.kind} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-foreground">{title}</p>
        <p className={cn("text-[12px]", u.tone === "late" ? "font-medium text-rose-700" : "text-muted-foreground")}>
          {u.text}
          {r.prepared ? " · prepared by Kiyos" : ""}
        </p>
      </div>
      <Link
        href={`/expert/cases?view=triage&case=${r.case_id}&item=${encodeURIComponent(r.key)}`}
        className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium", r.tier === "late" || r.prepared ? "bg-primary text-primary-foreground" : "border text-foreground hover:bg-muted")}
      >
        Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  );
}

function Line({ r, busy, compact }: { r: Row; busy: boolean; compact?: boolean }) {
  const Icon = r.icon;
  return (
    <li className={cn("flex items-center gap-3 px-4", compact ? "py-2.5" : "py-3")}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", r.late ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-foreground">{r.title}</p>
        {(r.detail || r.when) && (
          <p className="truncate text-[12px] text-muted-foreground">
            {r.when && <span className={cn(r.late && "font-medium text-rose-700")}>{r.when}</span>}
            {r.when && r.detail && " · "}
            {r.detail}
          </p>
        )}
      </div>
      {r.action.label && (
        <button
          onClick={() => r.action.run()}
          disabled={busy}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium disabled:opacity-50",
            r.action.primary ? "bg-primary text-primary-foreground" : "border text-foreground hover:bg-muted"
          )}
        >
          {r.action.label === "Mark done" ? <Check className="h-3.5 w-3.5" /> : r.action.label === "Remind" ? <Bell className="h-3.5 w-3.5" /> : r.action.label.startsWith("Request") ? <Send className="h-3.5 w-3.5" /> : null}
          {r.action.label}
        </button>
      )}
    </li>
  );
}

function AskForm({ initial, first, busy, onSend }: { initial: string; first: string; busy: boolean; onSend: (q: string) => void }) {
  const [q, setQ] = useState(initial);
  return (
    <div className="space-y-2">
      <textarea autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask ${first} for information or a decision.`} className="h-32 w-full rounded-lg border p-2.5 text-sm" />
      <button disabled={!q.trim() || busy} onClick={() => onSend(q.trim())} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
        <Send className="h-4 w-4" /> Send to {first}
      </button>
      <p className="text-xs text-muted-foreground">Holds sign-off until {first} answers.</p>
    </div>
  );
}
