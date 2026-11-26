"use client";

/**
 * Overview: what needs the customer, one row each: the date as a tile, what it is, what happens
 * after they act (three chips), and one button that opens the side panel where the action
 * finishes. Below it, folded, what is with the expert, so "is it moving?" has an answer
 * without a paragraph. Nothing is sent on one click.
 */

import { useState } from "react";
import { FileUp, MessageCircleQuestion, PenLine } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskSheet, taskKey, type Task } from "../task-sheet";
import type { Todo } from "../needs-you";
import { AfterFlow, Avatar, DateTile } from "../visual";

export type NeedItem = Todo & { after: string[] };
export type ExpertItem = { id: number; title: string; due: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const VISIBLE = 4;

export function NeedsNow({ items, withExpert, caseId, by, lead }: { items: NeedItem[]; withExpert: ExpertItem[]; caseId: number; by: string; lead: string }) {
  const [open, setOpen] = useState<Task | null>(null);
  const [all, setAll] = useState(false);
  const tasks = items.flatMap((t) => (t.task ? [t.task] : []));
  const next = open ? tasks.find((t) => taskKey(t) !== taskKey(open)) ?? null : null;
  const shown = all ? items : items.slice(0, VISIBLE);
  const first = lead.split(" ")[0];

  return (
    <section id="h-todo" aria-labelledby="h-needs" className="min-w-0 scroll-mt-20 overflow-hidden rounded-[14px] border bg-card">
      <div className="flex items-baseline gap-2 px-[22px] pb-1 pt-4">
        <h2 id="h-needs" className="text-[16px] font-semibold text-foreground">
          Needs you
        </h2>
        {items.length > 0 && <span className="text-[13px] tabular-nums text-muted-foreground">{items.length}</span>}
      </div>

      {items.length === 0 && <p className="border-t px-[22px] py-4 text-[13.5px] text-muted-foreground">Nothing needs you right now. When something does, it shows here and on WhatsApp.</p>}

      <ul>
        {shown.map((t, i) => {
          const late = !!t.due && t.due < today();
          const Icon = t.task?.kind === "confirm" ? PenLine : t.task?.kind === "message" ? MessageCircleQuestion : FileUp;
          const verb = t.task?.kind === "confirm" ? "Review" : t.task?.kind === "message" ? "Reply" : t.rejected ? "Send again" : "Upload";
          return (
            <li key={t.id} className="flex items-center gap-4 border-t px-[22px] py-3.5">
              {t.due ? <DateTile date={t.due} act late={late} /> : <span aria-hidden className="h-[46px] w-11 shrink-0" />}
              <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                <p className="flex items-center gap-2 text-[15px] font-medium leading-snug text-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-[#7A3F06]" aria-hidden />
                  <span className="min-w-0">{t.title}</span>
                  {t.due && <span className="sr-only">, {late ? "overdue since" : "due"} {formatDate(t.due, { day: "numeric", month: "long" })}</span>}
                </p>
                {t.detail && <p className={cn("text-[12.5px]", t.rejected ? "text-rose-800" : "text-muted-foreground")}>{t.detail}</p>}
                <AfterFlow steps={t.after} />
              </div>
              <button
                type="button"
                onClick={() => t.task && setOpen(t.task)}
                disabled={!t.task}
                aria-haspopup="dialog"
                className={cn(
                  "inline-flex min-h-[34px] shrink-0 items-center rounded-lg px-3.5 text-[13px] font-medium disabled:opacity-50",
                  i === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-card text-foreground hover:bg-muted"
                )}
              >
                {verb}
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > VISIBLE && (
        <button type="button" onClick={() => setAll(!all)} className="min-h-11 w-full border-t px-[22px] text-left text-[13px] font-medium text-primary">
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}

      {withExpert.length > 0 && (
        <details className="border-t bg-[#FCFBF8]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-[22px] py-3 text-[13px] [&::-webkit-details-marker]:hidden">
            <Avatar name={lead} who="expert" />
            <span className="font-semibold text-foreground">With {first}</span>
            <span className="tabular-nums text-muted-foreground">{withExpert.length}</span>
            <span className="text-muted-foreground">· nothing needed from you</span>
          </summary>
          <ul className="flex flex-col gap-2 px-[22px] pb-3 text-[13px] text-foreground/80">
            {withExpert.map((w) => (
              <li key={w.id} className="flex items-center gap-2.5">
                {w.due && (
                  <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-muted px-2 text-[12.5px] font-medium text-foreground">
                    {formatDate(w.due, { day: "numeric", month: "short" })}
                  </span>
                )}
                <span className="min-w-0">{w.title}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <TaskSheet task={open} next={next} caseId={caseId} by={by} lead={lead} onClose={() => setOpen(null)} onNext={setOpen} />
    </section>
  );
}
