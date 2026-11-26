"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SideSheet } from "@/components/side-sheet";
import { Check, CircleAlert, Loader2, MessageCircle } from "lucide-react";
import { decideProfileChange, sendMessage } from "@/lib/api";
import { askCaptain } from "@/lib/residency";
import { DocumentReader } from "@/components/document-reader";
import type { DocumentRequest, ProfileChange } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { profileLabel } from "./profile-labels";

/**
 * A message the customer writes in the panel: a reply to the expert's question (goes into their
 * WhatsApp conversation, as if typed in Messages), or a question to the expert (becomes a
 * ticket with a draft). Always shown, editable and sent with an explicit Send: never on one click.
 */
export type MessageTask = {
  kind: "message";
  key: string;
  send: "reply" | "ask";
  /** Panel title: the question being answered, or what the question is about. */
  title: string;
  /** What the expert asked, shown as a quote above the box. */
  quote?: string | null;
  prefill?: string;
  conversationId?: number | null;
};

export type Task = { kind: "upload"; request: DocumentRequest } | { kind: "confirm"; change: ProfileChange } | MessageTask;

export const taskKey = (t: Task) => (t.kind === "upload" ? `req-${t.request.id}` : t.kind === "confirm" ? `change-${t.change.id}` : t.key);
const taskTitle = (t: Task) => (t.kind === "upload" ? t.request.title : t.kind === "confirm" ? profileLabel(t.change.fact_key) : t.title);

type Phase = { name: "ready" } | { name: "busy"; file?: string } | { name: "done"; text: string } | { name: "error"; title: string; text: string };

/**
 * Review 02 CD-02: one sheet that finishes an upload or a profile confirmation where it was opened
 * (Home, Documents, Profile, or a WhatsApp deep link). Bottom sheet on phones, side sheet from sm.
 */
export function TaskSheet({
  task,
  next,
  caseId,
  by,
  lead,
  fromWhatsApp,
  onClose,
  onNext,
}: {
  task: Task | null;
  next?: Task | null;
  caseId: number;
  by: string;
  lead: string;
  fromWhatsApp?: boolean;
  onClose: () => void;
  onNext?: (t: Task) => void;
}) {
  return (
    // The same right-hand panel as every other detail on the customer side (one-panel rule).
    <SideSheet
      open={!!task}
      onClose={onClose}
      eyebrow={
        fromWhatsApp
          ? "From your WhatsApp link"
          : task?.kind === "upload"
            ? "Upload a document"
            : task?.kind === "confirm"
              ? "Confirm a change to your details"
              : task?.send === "reply"
                ? `Reply to ${lead.split(" ")[0]}`
                : `Ask ${lead.split(" ")[0]}`
      }
      title={task ? taskTitle(task) : ""}
    >
      {task && (
        <TaskBody
          key={taskKey(task)}
          task={task}
          next={next ?? null}
          caseId={caseId}
          by={by}
          lead={lead}
          onClose={onClose}
          onNext={onNext}
        />
      )}
    </SideSheet>
  );
}

function TaskBody({
  task,
  next,
  caseId,
  by,
  lead,
  onClose,
  onNext,
}: {
  task: Task;
  next: Task | null;
  caseId: number;
  by: string;
  lead: string;
  onClose: () => void;
  onNext?: (t: Task) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "ready" });


  if (phase.name === "done") {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <p className="text-xl font-semibold text-foreground">
            {task.kind === "upload" ? "Received" : task.kind === "message" ? "Sent" : "Saved"}
          </p>
          <p className="text-sm text-muted-foreground">{phase.text}</p>
        </div>
        {next && onNext && (
          <div className="space-y-2 rounded-xl border p-4">
            <p className="text-xs font-medium text-muted-foreground">Next thing that needs you</p>
            <p className="text-[15px] font-semibold text-foreground">
              {next.kind === "confirm" ? `Confirm: ${taskTitle(next)}` : taskTitle(next)}
            </p>
            {next.kind === "upload" && next.request.due_date && (
              <p className="text-[13px] text-muted-foreground">{dueText(next.request.due_date)}</p>
            )}
            <button
              onClick={() => onNext(next)}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {next.kind === "upload" ? "Upload it now" : next.kind === "confirm" ? "Review change" : next.send === "reply" ? "Reply now" : "Write it now"}
            </button>
          </div>
        )}
        <button onClick={onClose} className="flex min-h-12 w-full items-center justify-center rounded-lg border text-sm font-semibold text-foreground hover:bg-muted">
          Done for now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {task.kind === "upload" ? (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">{task.request.why}</p>
          <DocumentReader
            caseId={caseId}
            docType={task.request.doc_type}
            requestId={task.request.id}
            onDone={() => router.refresh()}
          />
          <button onClick={onClose} className="flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-semibold text-foreground hover:bg-muted">
            Close
          </button>
        </div>
      ) : task.kind === "message" ? (
        <MessageBody
          task={task}
          lead={lead}
          phase={phase}
          onSend={async (text) => {
            setPhase({ name: "busy" });
            try {
              if (task.send === "reply") {
                if (!task.conversationId) throw new Error("Your conversation isn't open yet. Reply on WhatsApp instead.");
                await sendMessage(task.conversationId, text);
              } else {
                await askCaptain(caseId, text, by);
              }
              const first = lead.split(" ")[0];
              setPhase({
                name: "done",
                text:
                  task.send === "reply"
                    ? `${first} sees it in your conversation. It's in your Messages and on WhatsApp too.`
                    : `${first} has it, with your file. You'll get the answer in Messages and on WhatsApp.`,
              });
              router.refresh();
            } catch (e) {
              setPhase({ name: "error", title: "That didn't send", text: e instanceof Error ? e.message : "Try again in a moment." });
            }
          }}
        />
      ) : (
        <ConfirmBody
          change={task.change}
          lead={lead}
          phase={phase}
          onDecide={async (decision) => {
            setPhase({ name: "busy" });
            try {
              await decideProfileChange(task.change.id, decision, by);
              setPhase({
                name: "done",
                text:
                  decision === "confirm"
                    ? `${lead} has been told and will recheck anything this affects. The old value stays in your change history.`
                    : "We've kept what was on file. If something else is wrong, tell us on WhatsApp.",
              });
              router.refresh();
            } catch (e) {
              setPhase({ name: "error", title: "That didn't save", text: e instanceof Error ? e.message : "Try again in a moment." });
            }
          }}
        />
      )}
    </div>
  );
}

function MessageBody({ task, lead, phase, onSend }: { task: MessageTask; lead: string; phase: Phase; onSend: (text: string) => void }) {
  const [text, setText] = useState(task.prefill ?? "");
  const busy = phase.name === "busy";
  const first = lead.split(" ")[0];
  return (
    <>
      {task.quote && (
        <p className="flex gap-2 rounded-lg border px-3 py-2.5 text-[13.5px] text-foreground">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            “{task.quote}” <span className="text-muted-foreground">· {first}</span>
          </span>
        </p>
      )}
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">{task.send === "reply" ? "Your reply" : `Your question to ${first}`}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          autoFocus
          placeholder={task.send === "reply" ? "Write your answer" : "What would you like to know?"}
          className="mt-1 w-full rounded-lg border bg-background p-3 text-[14px] leading-relaxed"
        />
      </label>
      {phase.name === "error" && <ErrorBox title={phase.title} text={phase.text} />}
      <button
        onClick={() => onSend(text.trim())}
        disabled={busy || !text.trim()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Sending…" : `Send to ${first}`}
      </button>
      <p className="text-center text-xs text-muted-foreground">It appears in your Messages and on WhatsApp.</p>
    </>
  );
}

function ConfirmBody({
  change: c,
  lead,
  phase,
  onDecide,
}: {
  change: ProfileChange;
  lead: string;
  phase: Phase;
  onDecide: (decision: "confirm" | "reject") => void;
}) {
  const busy = phase.name === "busy";
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted px-3 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground">On file now</p>
          <p className="mt-0.5 text-[17px] font-semibold text-muted-foreground line-through decoration-1">{pretty(c.previous_value)}</p>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-2.5">
          <p className="text-xs font-semibold text-primary">You told us</p>
          <p className="mt-0.5 text-[17px] font-semibold text-foreground">{pretty(c.proposed_value)}</p>
        </div>
      </div>
      {c.quote && (
        <p className="flex gap-2 rounded-lg border px-3 py-2.5 text-[13px] text-foreground">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            “{c.quote}” <span className="text-muted-foreground">· WhatsApp, {formatDate(c.created_at, { day: "numeric", month: "short" })}</span>
          </span>
        </p>
      )}
      <dl className="space-y-3 text-sm">
        {c.affects && (
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">What it changes</dt>
            <dd className="mt-0.5 text-foreground">{c.affects}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">What happens next</dt>
          <dd className="mt-0.5 text-foreground">{lead} rechecks anything it affects and tells you on WhatsApp if your position changes.</dd>
        </div>
      </dl>
      {phase.name === "error" && <ErrorBox title={phase.title} text={phase.text} />}
      <div className="space-y-2">
        <button
          onClick={() => onDecide("confirm")}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm {pretty(c.proposed_value)}
        </button>
        <button
          onClick={() => onDecide("reject")}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center rounded-lg border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          That&apos;s not right
        </button>
        <p className="text-center text-xs text-muted-foreground">The old value stays in your change history.</p>
      </div>
    </>
  );
}

function ErrorBox({ title, text }: { title: string; text: string }) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
      <span>
        <span className="block font-semibold text-amber-950">{title}</span>
        <span className="text-amber-950">{text}</span>
      </span>
    </div>
  );
}

export function dueText(date: string) {
  const overdue = date < new Date().toISOString().slice(0, 10);
  return overdue
    ? `Overdue since ${formatDate(date, { day: "numeric", month: "short" })}`
    : `Due ${formatDate(date, { day: "numeric", month: "short" })} · ${relativeDays(date)}`;
}

function pretty(v: string | null) {
  return (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, { day: "numeric", month: "long", year: "numeric" }) : v) ?? "—";
}
