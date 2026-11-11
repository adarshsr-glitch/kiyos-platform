"use client";

import type { ActionItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, User } from "lucide-react";

const COLUMNS: { key: "open" | "blocked" | "done"; label: string; icon: React.ReactNode; cls: string }[] = [
  { key: "open",    label: "Open",        icon: <Clock className="h-3.5 w-3.5" />,       cls: "border-slate-300" },
  { key: "blocked", label: "Blocked",     icon: <AlertCircle className="h-3.5 w-3.5" />, cls: "border-amber-300" },
  { key: "done",    label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "border-emerald-300" },
];

function isOverdue(due: string | null, status: string): boolean {
  if (!due || status === "done") return false;
  return new Date(due) < new Date();
}

export function ActionBoard({ items }: { items: ActionItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <div className={cn("flex items-center justify-between border-b pb-2", col.cls)}>
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                {col.icon}
                {col.label}
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {colItems.length}
              </span>
            </div>
            {colItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">— nothing here —</p>
            )}
            <div className="space-y-2">
              {colItems.map((i) => (
                <div
                  key={i.id}
                  className="rounded-md border bg-card p-3 text-xs space-y-2 hover:bg-muted/40 transition-colors"
                >
                  <p className="font-medium text-foreground leading-snug">{i.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border",
                      i.assignee === "customer" && "bg-blue-50 text-blue-800 border-blue-200",
                      i.assignee === "advisor" && "bg-primary/10 text-primary border-primary/20",
                      i.assignee === "kiyos" && "bg-slate-100 text-slate-700 border-slate-200",
                    )}>
                      {i.assignee}
                    </span>
                    {i.owner && (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <User className="h-3 w-3" />
                        {i.owner}
                      </span>
                    )}
                    {i.due_date && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 tabular-nums",
                          isOverdue(i.due_date, i.status)
                            ? "text-rose-700 font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {i.due_date}
                        {isOverdue(i.due_date, i.status) && " · overdue"}
                      </span>
                    )}
                  </div>
                  {i.notes && (
                    <p className="text-[10px] text-muted-foreground italic">
                      {i.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
