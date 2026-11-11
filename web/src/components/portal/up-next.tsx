"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import type { CustomerTier } from "@/lib/customer-context";
import type { CaseDetail } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  detail: string | null;
  due: string | null;
  href: string;
  cta: string;
  emphasis?: boolean;
}

const UPLOAD_HINT = /upload|share|send|export|statement|document|copy|form/i;

/** Everything waiting on the customer, most urgent first. */
export function buildTasks(caseData: CaseDetail, tier: CustomerTier): Task[] {
  const tasks: Task[] = [];

  if (tier === "free") {
    tasks.push({
      id: "upgrade",
      title: "Get your full assessment",
      detail: "Your answers so far cover the basics. A plan adds your documents, a full assessment and a named advisor.",
      due: null,
      href: "/portal/upgrade",
      cta: "See plans",
      emphasis: true,
    });
  }

  if (!caseData.profile_confirmed_at && caseData.facts.length > 0) {
    tasks.push({
      id: "verify",
      title: "Confirm your details",
      detail: `${caseData.facts.length} facts pre-filled from your documents — check and confirm`,
      due: null,
      href: "/portal/verify",
      cta: "Review",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  caseData.action_items
    .filter((i) => i.assignee === "customer" && i.status !== "done")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .forEach((i) => {
      const upload = UPLOAD_HINT.test(i.title);
      tasks.push({
        id: `item-${i.id}`,
        title: i.title,
        detail: i.status === "blocked" ? "Waiting on something else first" : i.notes,
        due: i.due_date,
        href: upload ? "/portal/documents" : "/portal/chat",
        cta: upload ? "Upload" : "Ask",
        emphasis: !!i.due_date && i.due_date < today,
      });
    });

  const signedOff = caseData.assessments.find((a) => a.status === "signed_off");
  if (signedOff && tier === "premium") {
    tasks.push({
      id: "assessment",
      title: "Read your reviewed assessment",
      detail: signedOff.headline,
      due: null,
      href: "/portal/assessment",
      cta: "Open",
    });
  }

  return tasks;
}

export function UpNext({ tasks, limit = 4 }: { tasks: Task[]; limit?: number }) {
  const shown = tasks.slice(0, limit);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Up next
          {tasks.length > 0 && (
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {tasks.length}
            </span>
          )}
        </h2>
      </header>

      {shown.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <CircleCheck className="h-4 w-4 text-emerald-600" />
          Nothing needs you right now. We&apos;ll message you when it does.
        </div>
      ) : (
        <ul className="divide-y">
          {shown.map((t) => {
            const overdue = !!t.due && t.due < today;
            return (
              <li key={t.id}>
                <Link
                  href={t.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                    t.emphasis && t.id === "upgrade" && "bg-primary/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      overdue ? "bg-rose-500" : t.emphasis ? "bg-primary" : "bg-amber-400"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {(t.detail || t.due) && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {t.due && (
                          <span className={cn("font-medium", overdue ? "text-rose-600" : "text-foreground/70")}>
                            {overdue ? "Overdue" : "Due"} {formatDate(t.due, { day: "numeric", month: "short" })}
                            {!overdue && relativeDays(t.due) ? ` (${relativeDays(t.due)})` : ""}
                            {t.detail ? " · " : ""}
                          </span>
                        )}
                        {t.detail}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      t.id === "upgrade"
                        ? "bg-primary text-primary-foreground"
                        : "text-primary group-hover:bg-primary/10"
                    )}
                  >
                    {t.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length > limit && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          +{tasks.length - limit} more after these
        </p>
      )}
    </section>
  );
}
