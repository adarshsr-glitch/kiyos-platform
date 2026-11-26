"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, MessageCircleQuestion, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY, Pill } from "./kit";
import { TaskSheet, dueText, taskKey, type Task } from "./task-sheet";

export interface Todo {
  id: string;
  title: string;
  /** What exactly is asked, e.g. the value to confirm or why a copy was rejected. */
  detail?: string | null;
  why?: string | null;
  due: string | null;
  country?: keyof typeof COUNTRY | null;
  /** What it relates to, e.g. "US investments". */
  category?: string | null;
  rejected?: boolean;
  cta: string;
  /** Finishes in the task sheet. */
  task?: Task;
  /** Otherwise a link, e.g. WhatsApp. */
  href?: string | null;
}

const VISIBLE = 5;

/** Review 02 CD-02/CD-03: Home's primary list; every reason in full, every action finished in place. */
export function NeedsYou({ todos, caseId, by, lead, compact }: { todos: Todo[]; caseId: number; by: string; lead: string; /** Title, due date and action only; detail lives in the sheet. */ compact?: boolean }) {
  const [open, setOpen] = useState<Task | null>(null);
  const [all, setAll] = useState(false);
  const tasks = todos.flatMap((t) => (t.task ? [t.task] : []));
  const next = open ? tasks.find((t) => taskKey(t) !== taskKey(open)) ?? null : null;
  const shown = all ? todos : todos.slice(0, VISIBLE);

  if (todos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
        <p className="text-[14px] text-emerald-950">
          <span className="font-semibold">Nothing needs you right now.</span> When something does, it appears here and we message you on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className={cn("divide-y overflow-hidden", compact ? "rounded-xl border bg-card" : "rounded-2xl border bg-card")}>
        {shown.map((t, i) => {
          if (compact) return <CompactRow key={t.id} t={t} onOpen={() => t.task && setOpen(t.task)} />;
          const Icon = t.task?.kind === "confirm" ? PenLine : t.task?.kind === "message" || !t.task ? MessageCircleQuestion : FileUp;
          const overdue = !!t.due && t.due < today();
          const flag = t.rejected || overdue;
          const primary = i === 0;
          return (
            <li key={t.id} className={cn("relative flex", compact ? "items-center gap-3.5 px-5 py-3.5" : "flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5", flag && !compact && "bg-amber-50/40")}>
              {flag && !compact && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-amber-500" />}
              <span className={cn("hidden shrink-0 items-center justify-center rounded-full", compact ? "h-9 w-9 sm:flex" : "h-10 w-10 sm:flex", flag ? "bg-rose-50 text-rose-700" : "bg-primary/10 text-primary")}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {compact ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold leading-snug text-foreground">{t.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {[t.rejected ? "Your copy couldn't be used" : t.task?.kind === "confirm" ? "Check and confirm" : t.task ? "Send a document" : `Reply to ${lead.split(" ")[0]}`, t.category].filter(Boolean).join(" · ")}
                    {t.due && <span className={cn(overdue ? "font-semibold text-rose-700" : "")}> · {dueText(t.due)}</span>}
                  </p>
                </div>
              ) : (
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted-foreground">
                  {[
                    t.country ? `${COUNTRY[t.country].flag} ${t.country === "BOTH" ? "India and US" : COUNTRY[t.country].name}` : null,
                    t.category ?? null,
                  ]
                    .filter(Boolean)
                    .map((x, k) => (
                      <span key={k}>{k > 0 && "· "}{x}</span>
                    ))}
                  {t.due && <span className={cn(overdue && "font-semibold text-amber-800")}>{t.country || t.category ? "· " : ""}{dueText(t.due)}</span>}
                  {t.rejected && <Pill tone="amber">Needs a new copy</Pill>}
                </p>
                <p className={cn("mt-0.5 font-semibold leading-snug text-foreground", compact ? "text-[14px]" : "text-[15px]")}>{t.title}</p>
                {!compact && t.detail && <p className="mt-1 text-[13px] text-foreground">{t.detail}</p>}
                {!compact && t.why && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.why}</p>}
              </div>
              )}
              {t.task ? (
                <button
                  onClick={() => setOpen(t.task!)}
                  className={cn(
                    "inline-flex shrink-0 items-center self-start rounded-lg font-semibold sm:self-center",
                    compact ? "min-h-9 px-3 text-[13px]" : "min-h-11 px-4 text-sm",
                    primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-primary/40 text-primary hover:bg-primary/5"
                  )}
                >
                  {compact ? (t.task?.kind === "confirm" ? "Review" : t.rejected ? "Send again" : "Upload") : t.cta}
                </button>
              ) : t.href ? (
                <a
                  href={t.href}
                  className={cn(
                    "inline-flex shrink-0 items-center self-start rounded-lg font-semibold sm:self-center",
                    compact ? "min-h-9 px-3 text-[13px]" : "min-h-11 px-4 text-sm",
                    primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-primary/40 text-primary hover:bg-primary/5"
                  )}
                >
                  {compact ? "Reply" : t.cta}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      {todos.length > VISIBLE && (
        <button onClick={() => setAll(!all)} className="mt-1 min-h-11 text-sm font-semibold text-primary">
          {all ? "Show fewer" : `Show all ${todos.length}`}
        </button>
      )}
      <TaskSheet task={open} next={next} caseId={caseId} by={by} lead={lead} onClose={() => setOpen(null)} onNext={setOpen} />
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Overview: one line per to-do (what, when, one button). The button always opens the side panel,
 * where the detail and the action live: upload, confirm, or reply.
 */
function CompactRow({ t, onOpen }: { t: Todo; onOpen: () => void }) {
  const overdue = !!t.due && t.due < today();
  const verb = t.task?.kind === "confirm" ? "Review" : t.task?.kind === "message" ? "Reply" : t.rejected ? "Send again" : "Upload";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{t.title}</span>
      {t.due && (
        <span className={cn("shrink-0 text-[12.5px] tabular-nums", overdue ? "font-medium text-rose-700" : "text-muted-foreground")}>
          {overdue ? "overdue · " : ""}
          {new Date(t.due + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        disabled={!t.task}
        aria-haspopup="dialog"
        className="inline-flex min-h-8 shrink-0 items-center rounded-lg border px-3 text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        {verb}
      </button>
    </li>
  );
}
