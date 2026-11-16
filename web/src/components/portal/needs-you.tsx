"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, MessageCircleQuestion, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY, Pill, Section } from "./kit";
import { TaskSheet, dueText, taskKey, type Task } from "./task-sheet";

export interface Todo {
  id: string;
  title: string;
  /** What exactly is asked, e.g. the value to confirm or why a copy was rejected. */
  detail?: string | null;
  why?: string | null;
  due: string | null;
  country?: keyof typeof COUNTRY | null;
  rejected?: boolean;
  cta: string;
  /** Finishes in the task sheet. */
  task?: Task;
  /** Otherwise a link, e.g. WhatsApp. */
  href?: string | null;
}

const VISIBLE = 5;

/** Review 02 CD-02/CD-03: Home's primary list; every reason in full, every action finished in place. */
export function NeedsYou({ todos, caseId, by, lead }: { todos: Todo[]; caseId: number; by: string; lead: string }) {
  const [open, setOpen] = useState<Task | null>(null);
  const [all, setAll] = useState(false);
  const tasks = todos.flatMap((t) => (t.task ? [t.task] : []));
  const next = open ? tasks.find((t) => taskKey(t) !== taskKey(open)) ?? null : null;
  const shown = all ? todos : todos.slice(0, VISIBLE);

  return (
    <Section title="Needs you" count={todos.length} flush>
      {todos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <p className="text-[15px] font-semibold text-foreground">Nothing needs you right now</p>
          <p className="text-sm text-muted-foreground">When something does, it appears here and we message you on WhatsApp with a link.</p>
        </div>
      ) : (
        <ul className="divide-y">
          {shown.map((t) => {
            const Icon = t.task?.kind === "confirm" ? PenLine : t.task ? FileUp : MessageCircleQuestion;
            return (
              <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <span
                  className={cn(
                    "hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex",
                    t.rejected ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[15px] font-semibold text-foreground">{t.title}</p>
                  {(t.rejected || t.due || t.country) && (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                      {t.rejected && <Pill tone="amber">Needs a new copy</Pill>}
                      {t.due && <span className={cn(t.due < today() && "font-medium text-rose-700")}>{dueText(t.due)}</span>}
                      {t.country && <span>· {COUNTRY[t.country].name}</span>}
                    </p>
                  )}
                  {t.detail && <p className="text-[13px] text-foreground">{t.detail}</p>}
                  {t.why && <p className="text-[13px] text-muted-foreground">Why: {t.why}</p>}
                </div>
                {t.task ? (
                  <button
                    onClick={() => setOpen(t.task!)}
                    className="inline-flex min-h-11 shrink-0 items-center self-start rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 sm:self-center"
                  >
                    {t.cta}
                  </button>
                ) : t.href ? (
                  <a
                    href={t.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center self-start rounded-lg border px-4 text-sm font-semibold text-foreground hover:bg-muted sm:self-center"
                  >
                    {t.cta}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {todos.length > VISIBLE && (
        <button onClick={() => setAll(!all)} className="min-h-11 px-5 text-sm font-semibold text-primary">
          {all ? "Show fewer" : `Show all ${todos.length}`}
        </button>
      )}
      <TaskSheet task={open} next={next} caseId={caseId} by={by} lead={lead} onClose={() => setOpen(null)} onNext={setOpen} />
    </Section>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
