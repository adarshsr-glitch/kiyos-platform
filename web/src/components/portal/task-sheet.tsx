"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Check, CircleAlert, Loader2, MessageCircle, Upload, X } from "lucide-react";
import { decideProfileChange, uploadDocument } from "@/lib/api";
import type { DocumentRequest, ProfileChange } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COUNTRY, Pill } from "./kit";
import { profileLabel } from "./profile-labels";

export type Task = { kind: "upload"; request: DocumentRequest } | { kind: "confirm"; change: ProfileChange };

export const taskKey = (t: Task) => (t.kind === "upload" ? `req-${t.request.id}` : `change-${t.change.id}`);

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = /\.(pdf|jpe?g|png)$/i;

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
    <Dialog.Root open={!!task} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-xl focus:outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:px-6 sm:pt-6"
        >
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border sm:hidden" />
          {task && (
            <TaskBody
              key={taskKey(task)}
              task={task}
              next={next ?? null}
              caseId={caseId}
              by={by}
              lead={lead}
              fromWhatsApp={fromWhatsApp}
              onClose={onClose}
              onNext={onNext}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TaskBody({
  task,
  next,
  caseId,
  by,
  lead,
  fromWhatsApp,
  onClose,
  onNext,
}: {
  task: Task;
  next: Task | null;
  caseId: number;
  by: string;
  lead: string;
  fromWhatsApp?: boolean;
  onClose: () => void;
  onNext?: (t: Task) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "ready" });

  const header = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {fromWhatsApp ? "From your WhatsApp link" : task.kind === "upload" ? "Upload a document" : "Confirm a change to your details"}
        </p>
        <Dialog.Title className="mt-0.5 text-xl font-semibold leading-snug text-foreground">
          {task.kind === "upload" ? task.request.title : profileLabel(task.change.fact_key)}
        </Dialog.Title>
      </div>
      <Dialog.Close className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </Dialog.Close>
    </div>
  );

  if (phase.name === "done") {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {task.kind === "upload" ? "Received" : "Saved"}
          </Dialog.Title>
          <p className="text-sm text-muted-foreground">{phase.text}</p>
        </div>
        {next && onNext && (
          <div className="space-y-2 rounded-xl border p-4">
            <p className="text-xs font-medium text-muted-foreground">Next thing that needs you</p>
            <p className="text-[15px] font-semibold text-foreground">
              {next.kind === "upload" ? next.request.title : `Confirm: ${profileLabel(next.change.fact_key)}`}
            </p>
            {next.kind === "upload" && next.request.due_date && (
              <p className="text-[13px] text-muted-foreground">{dueText(next.request.due_date)}</p>
            )}
            <button
              onClick={() => onNext(next)}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {next.kind === "upload" ? "Upload it now" : "Review change"}
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
      {header}
      {task.kind === "upload" ? (
        <UploadBody
          request={task.request}
          lead={lead}
          phase={phase}
          onUpload={async (file) => {
            const problem = checkFile(file);
            if (problem) return setPhase({ name: "error", ...problem });
            setPhase({ name: "busy", file: file.name });
            try {
              await uploadDocument(caseId, file, task.request.doc_type, task.request.id);
              setPhase({ name: "done", text: `${file.name}. ${lead} will check it, and we'll confirm on WhatsApp once it's accepted. Nothing else is needed for this item.` });
              router.refresh();
            } catch (e) {
              const detail = e instanceof Error && "detail" in e ? String((e as { detail: unknown }).detail) : null;
              setPhase({ name: "error", title: "The upload didn't finish", text: detail || "Nothing was saved. Check your connection and try again." });
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

function UploadBody({
  request: r,
  lead,
  phase,
  onUpload,
}: {
  request: DocumentRequest;
  lead: string;
  phase: Phase;
  onUpload: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const busy = phase.name === "busy";
  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        {r.status === "rejected" && <Pill tone="amber">Needs a new copy</Pill>}
        {r.due_date && <span>{dueText(r.due_date)}</span>}
        {r.country && <span>· {COUNTRY[r.country].name}</span>}
      </div>

      {r.status === "rejected" && r.rejection_reason && (
        <p className="rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-950">{r.rejection_reason}</p>
      )}

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">Why we need it</dt>
          <dd className="mt-0.5 text-foreground">{r.why}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">What happens next</dt>
          <dd className="mt-0.5 text-foreground">{lead} checks it, and we confirm on WhatsApp when it&apos;s accepted.</dd>
        </div>
      </dl>

      {phase.name === "error" && <ErrorBox title={phase.title} text={phase.text} />}

      {busy ? (
        <div role="status" className="flex items-center gap-3 rounded-xl border p-4 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground">{phase.file}</span>
            <span className="text-muted-foreground">Uploading… keep this page open until it finishes.</span>
          </span>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            take(e.dataTransfer.files);
          }}
          className={cn("space-y-2 rounded-xl sm:border-2 sm:border-dashed sm:p-4", dragging ? "sm:border-primary sm:bg-primary/5" : "sm:border-border")}
        >
          <p className="hidden text-center text-sm text-muted-foreground sm:block">Drop the file here, or</p>
          <button
            onClick={() => cameraInput.current?.click()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground sm:hidden"
          >
            <Camera className="h-4 w-4" /> Take a photo
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary text-sm font-semibold text-primary sm:bg-primary sm:text-primary-foreground"
          >
            <Upload className="h-4 w-4" /> Choose a file
          </button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        PDF, JPG or PNG, up to 25 MB. It goes to your Kiyos workspace, never to WhatsApp.
      </p>
      <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => take(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => take(e.target.files)} />
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

function checkFile(file: File) {
  if (!ACCEPTED.test(file.name)) {
    return { title: "This file type can't be uploaded", text: `${file.name} isn't a PDF, JPG or PNG. Save or export it as one of those and try again.` };
  }
  if (file.size > MAX_BYTES) {
    const mb = Math.ceil(file.size / (1024 * 1024));
    return {
      title: "This file is too large to upload",
      text: `${file.name} is ${mb} MB. Files can be up to 25 MB. Try a lower-resolution scan, or a photo of each page.`,
    };
  }
  return null;
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
