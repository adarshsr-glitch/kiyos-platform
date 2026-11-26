"use client";

/**
 * Messages, the rail's first block: what is open with the customer, answered where they are.
 * A question from the expert is answered in place, into the same conversation as WhatsApp;
 * a document opens the usual upload. Nothing is sent until the customer presses Send.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Loader2, MessageCircleQuestion } from "lucide-react";
import { sendMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { DocumentRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskSheet, type Task } from "./task-sheet";

export type OpenItem = { key: string; kind: "question"; title: string; due: string | null } | { key: string; kind: "upload"; title: string; due: string | null; request: DocumentRequest };

const today = () => new Date().toISOString().slice(0, 10);
const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });

export function OpenWithYou({ items, conversationId, caseId, by, lead }: { items: OpenItem[]; conversationId: number | null; caseId: number; by: string; lead: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const first = lead.split(" ")[0];
  if (items.length === 0) {
    return (
      <section aria-labelledby="h-open" className="rounded-[14px] border bg-card px-[18px] py-4">
        <h2 id="h-open" className="text-[15px] font-semibold text-foreground">
          Open with you
        </h2>
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Check className="h-4 w-4 text-primary" aria-hidden /> Nothing. {first} has everything they asked for.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="h-open" className="overflow-hidden rounded-[14px] border bg-card">
      <div className="flex items-baseline gap-2 px-[18px] pb-2.5 pt-3.5">
        <h2 id="h-open" className="text-[15px] font-semibold text-foreground">
          Open with you
        </h2>
        <span className="text-[13px] tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <ul>
        {items.map((i) =>
          i.kind === "question" ? (
            <QuestionItem key={i.key} item={i} conversationId={conversationId} first={first} />
          ) : (
            <li key={i.key} className="flex items-center justify-between gap-3 border-t px-[18px] py-3">
              <span className="flex min-w-0 items-center gap-2.5 text-[14px] font-medium text-foreground">
                <FileUp className="h-4 w-4 shrink-0 text-[#7A3F06]" aria-hidden />
                <span className="min-w-0">{i.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {i.due && <DueChip due={i.due} />}
                <button type="button" aria-haspopup="dialog" onClick={() => setTask({ kind: "upload", request: i.request })} className="inline-flex h-[30px] items-center rounded-lg border px-3 text-[12.5px] font-medium text-foreground hover:bg-muted">
                  Upload
                </button>
              </span>
            </li>
          )
        )}
      </ul>
      <TaskSheet task={task} caseId={caseId} by={by} lead={lead} onClose={() => setTask(null)} />
    </section>
  );
}

function DueChip({ due }: { due: string }) {
  const late = due < today();
  return <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[12px] font-medium", late ? "bg-rose-50 text-rose-800" : "bg-[#FBEFD9] text-[#7A3F06]")}>{late ? `Overdue · ${short(due)}` : `Due ${short(due)}`}</span>;
}

/** The expert's question with its answer box, in place. The question goes with the answer so the thread reads on its own. */
function QuestionItem({ item, conversationId, first }: { item: Extract<OpenItem, { kind: "question" }>; conversationId: number | null; first: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `answer-${item.key}`;

  async function send() {
    if (!text.trim()) return setError("Write your answer first");
    if (!conversationId) return setError("Your conversation isn't open yet. Reply on WhatsApp instead.");
    setBusy(true);
    setError(null);
    try {
      await sendMessage(conversationId, `About “${item.title}”: ${text.trim()}`);
      setSent(true);
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't send. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2.5 border-t bg-[#FFFBF3] px-[18px] py-3">
      <p className="flex items-start gap-2.5 text-[14px] font-medium leading-snug text-foreground">
        <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-[#7A3F06]" aria-hidden />
        <span>{item.title}</span>
      </p>
      {sent ? (
        <p className="flex items-center gap-2 text-[13px] text-primary">
          <Check className="h-4 w-4" aria-hidden /> Sent. {first} sees it in your conversation.
        </p>
      ) : (
        <>
          <label htmlFor={id} className="sr-only">
            Your answer to {first}
          </label>
          <textarea
            id={id}
            rows={2}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Your answer"
            className="resize-y rounded-lg border border-[#EBCFA3] bg-card px-2.5 py-2 text-[13.5px] outline-none focus:border-primary"
          />
          {error && <p className="text-[12.5px] text-rose-700">{error}</p>}
          <span className="flex items-center justify-between gap-2">
            {item.due ? <DueChip due={item.due} /> : <span />}
            <button type="button" onClick={send} disabled={busy} className="inline-flex h-[30px] items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {busy ? "Sending…" : "Send answer"}
            </button>
          </span>
        </>
      )}
    </li>
  );
}
