"use client";

/**
 * The expert's side of the customer's questions: each open question with the agent's
 * draft, editable before it goes out. Sending resolves the ticket and posts the reply to
 * the customer (workspace and WhatsApp thread), so both views show the same answer.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { resolveTicket } from "@/lib/api";
import { formatDate, relativeDays } from "@/lib/format";

export function QuestionQueue({ tickets, advisor, customer }: { tickets: Ticket[]; advisor: string; customer: string }) {
  const open = tickets.filter((t) => t.status === "open").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const done = tickets.filter((t) => t.status === "resolved").sort((a, b) => (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""));
  const first = customer.split(" ")[0];
  return (
    <section aria-labelledby="q-h" className="rounded-xl border bg-card">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h3 id="q-h" className="text-[14px] font-semibold">{first}&apos;s questions</h3>
        <span className="text-[12px] text-muted-foreground">{open.length} waiting · {done.length} answered</span>
      </header>
      {open.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">No questions waiting.</p>
      ) : (
        <ul className="divide-y">
          {open.map((t) => (
            <Question key={t.id} t={t} advisor={advisor} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="border-t">
          <summary className="cursor-pointer px-4 py-2.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">Answered ({done.length})</summary>
          <ul className="divide-y border-t">
            {done.map((t) => (
              <li key={t.id} className="px-4 py-3 text-[13px]">
                <p className="font-medium text-foreground">{t.question}</p>
                <p className="mt-1 text-muted-foreground">{t.resolution}</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{t.resolved_by} · {formatDate(t.resolved_at, { day: "numeric", month: "short" })}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// The agent says so when the record can't answer; that isn't a draft worth sending.
const grounded = (d: string | null) => !!d && !/^I don.t have a grounded answer/i.test(d.trim());

export function Question({ t, advisor }: { t: Ticket; advisor: string }) {
  const router = useRouter();
  const draft = grounded(t.draft_answer) ? t.draft_answer! : "";
  const [reply, setReply] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const late = !!t.sla_due_at && t.sla_due_at < new Date().toISOString();

  async function send() {
    if (!reply.trim()) {
      setError("Write the reply first");
      return;
    }
    setBusy(true);
    try {
      await resolveTicket(t.id, advisor, reply.trim());
      toast.success("Reply sent to the customer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send");
      setBusy(false);
    }
  }

  return (
    <li className="space-y-2 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13.5px] font-medium text-foreground">“{t.question}”</p>
        <span className={`shrink-0 text-[11.5px] ${late ? "font-semibold text-amber-800" : "text-muted-foreground"}`}>
          {late ? "Overdue" : `Due ${formatDate(t.sla_due_at, { day: "numeric", month: "short" })}`}
        </span>
      </div>
      <p className="text-[11.5px] text-muted-foreground">Asked {relativeDays(t.created_at)}</p>
      {draft ? (
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Draft by Kiyos from the case record{t.cited_rules?.length ? ` · cites ${t.cited_rules.join(", ")}` : ""}. Edit before sending.
        </p>
      ) : (
        <p className="text-[11.5px] text-muted-foreground">No grounded draft: the record doesn&apos;t answer this yet. Write it yourself.</p>
      )}
      <textarea
        value={reply}
        onChange={(e) => {
          setReply(e.target.value);
          setError(null);
        }}
        rows={3}
        placeholder="Write your answer"
        className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary"
      />
      {error && <p className="text-[12px] text-rose-700">{error}</p>}
      <button onClick={send} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-60">
        <Check className="h-3.5 w-3.5" /> Send answer
      </button>
    </li>
  );
}
