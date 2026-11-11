"use client";

import { useState } from "react";
import type { TaxTopic } from "@/lib/types";
import { ConfidenceBadge } from "./confidence-badge";
import { ChevronDown, ChevronRight, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function TopicRow({ topic }: { topic: TaxTopic }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border bg-card overflow-hidden transition-colors">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{topic.title}</p>
          {topic.next_action && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
              Next: {topic.next_action}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge level={topic.confidence} />
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            STATUS_STYLES[topic.status]
          )}>
            {STATUS_LABEL[topic.status]}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/30 px-4 py-4 space-y-4 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            {topic.india_position && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                  India position
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  {topic.india_position}
                </p>
              </div>
            )}
            {topic.us_position && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                  US position
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  {topic.us_position}
                </p>
              </div>
            )}
          </div>
          {topic.conclusion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground mb-1">
                Conclusion
              </p>
              <p className="text-foreground leading-relaxed">{topic.conclusion}</p>
            </div>
          )}
          <div className="flex items-center gap-4 text-muted-foreground pt-1">
            {topic.owner && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {topic.owner}
              </span>
            )}
            {topic.due_date && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {topic.due_date}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
