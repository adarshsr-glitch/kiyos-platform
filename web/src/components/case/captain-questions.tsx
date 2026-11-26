"use client";

/**
 * The customer's line to their case captain: who owns the case, the questions asked and
 * their answers. A new question goes to the captain with a draft from the agent; the
 * answer comes back here and in the WhatsApp thread.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Clock, Send } from "lucide-react";
import type { CaseDetail, Ticket } from "@/lib/types";
import { askCaptain } from "@/lib/residency";
import { formatDate } from "@/lib/format";

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function CaptainQuestions({
  caseId,
  by,
  captain,
  qualification,
  tickets,
  topics = [],
}: {
  /** Open questions on the case, offered as suggested questions: a tap fills the box. */
  topics?: CaseDetail["topics"];
  caseId: number;
  by: string;
  captain: string;
  qualification?: string | null;
  tickets: Ticket[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = captain.split(" ")[0];
  const open = tickets.filter((t) => t.status === "open").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const answered = tickets.filter((t) => t.status === "resolved").sort((a, b) => (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""));

  const asked = new Set(tickets.map((t) => t.question));
  const suggestions = topics
    .filter((t) => t.status !== "resolved")
    .map((t) => `Where do we stand on my ${/^[A-Z][a-z]/.test(t.title) ? t.title.charAt(0).toLowerCase() + t.title.slice(1) : t.title}?`)
    .filter((q) => !asked.has(q))
    .slice(0, 3);

  async function send(question = text) {
    if (!question.trim()) {
      setError("Write your question first");
      return;
    }
    setBusy(true);
    try {
      await askCaptain(caseId, question.trim(), by);
      setText("");
      toast.success(`Sent to ${first}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-captain" className="rounded-[14px] border bg-card">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span aria-hidden className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
          {initials(captain)}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-primary">
              <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />
            </span>
          </span>
        </span>
        <div className="min-w-0">
          <h2 id="h-captain" className="text-[15px] font-semibold text-foreground">{captain}</h2>
          <p className="text-[12.5px] text-muted-foreground">Your expert{qualification ? ` · ${qualification}` : ""} · usually replies within 1 business day</p>
        </div>
      </header>

      <div className="px-5 py-4">
        <label htmlFor="ask" className="text-[12px] font-medium text-muted-foreground">Ask {first} about your case</label>
        <div className="mt-1.5 flex gap-2">
          <textarea
            id="ask"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            rows={text.length > 60 ? 3 : 1}
            placeholder="Why am I RNOR next year and not resident?"
            className="min-h-[40px] min-w-0 flex-1 resize-y rounded-lg border bg-background px-3 py-2 text-[13.5px] outline-none focus:border-primary"
          />
          <button onClick={() => send()} disabled={busy} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground disabled:opacity-60">
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </div>
        {error && <p className="mt-1.5 text-[12.5px] text-rose-700">{error}</p>}
        {suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.map((q) => (
              <button
                key={q}
                // A suggestion fills the box to read and edit; only Send sends (nothing goes on one tap).
                onClick={() => {
                  setText(q);
                  setError(null);
                  document.getElementById("ask")?.focus();
                }}
                disabled={busy}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-left text-[12.5px] text-primary hover:bg-primary/10 disabled:opacity-60"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">Kiyos drafts an answer from your record; {first} checks it before you get it.</p>
      </div>

      {(open.length > 0 || answered.length > 0) && (
        <div className="border-t">
          <p className="px-5 pb-1 pt-3 text-[12.5px] font-medium text-muted-foreground">Your questions</p>
          <ul>
            {/* Waiting questions are with the expert: neutral, never the "needs you" amber. */}
            {open.map((t) => (
              <li key={t.id} className="px-5 py-2.5">
                <p className="text-[13.5px] font-medium text-foreground">{t.question}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> With {first}
                  {t.sla_due_at ? ` · answer expected by ${formatDate(t.sla_due_at, { day: "numeric", month: "short" })}` : ""}
                </p>
              </li>
            ))}
            {/* Answered ones fold to one line each; the answer opens in place. */}
            {answered.map((t) => (
              <li key={t.id} className="px-5 py-1.5">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-2 py-1 text-[13px] text-foreground/80 [&::-webkit-details-marker]:hidden">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">{t.question}</span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">{formatDate(t.resolved_at, { day: "numeric", month: "short" })}</span>
                    <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mb-1.5 mt-1 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-foreground">{t.resolution}</p>
                  <p className="mb-1 text-[11.5px] text-muted-foreground">{t.resolved_by ?? first} answered</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
