/**
 * Where the engagement stands, as dated milestones from the case record: what's done,
 * where things are now, and what's next. Only real dates appear; nothing is projected
 * or estimated, and there is no percentage.
 */

import { Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Milestone = { date: string; label: string; sub?: string; kind: "done" | "next" };

export function EngagementTrack({ milestones, now }: { milestones: Milestone[]; now: string }) {
  const done = milestones.filter((m) => m.kind === "done").sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
  const next = milestones.filter((m) => m.kind === "next").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  if (!done.length && !next.length) return null;
  const items: (Milestone | { kind: "now" })[] = [...done, { kind: "now" }, ...next];

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start" aria-label="Your engagement so far and what's next">
      {items.map((m, i) => {
        const last = i === items.length - 1;
        const isNow = m.kind === "now";
        // Phones: the latest completed step, now, and the next two. Wider screens: everything.
        const doneIdx = i;
        const nextIdx = i - done.length - 1;
        const phoneHidden = (m.kind === "done" && doneIdx < done.length - 1) || (m.kind === "next" && nextIdx > 1);
        return (
          <li key={i} className={cn("relative flex gap-3 pb-4 sm:flex-1 sm:flex-col sm:gap-2 sm:pb-0 sm:pr-3", isNow && "sm:flex-[1.3]", phoneHidden && "hidden sm:flex")}>
            {/* connector */}
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[9px] top-5 h-[calc(100%-12px)] w-px sm:left-5 sm:top-[9px] sm:h-px sm:w-[calc(100%-12px)]",
                  m.kind === "done" ? "bg-primary/60" : "bg-border",
                  m.kind === "next" && nextIdx >= 1 && "hidden sm:block"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full",
                m.kind === "done" && "bg-primary text-primary-foreground",
                isNow && "bg-background ring-[5px] ring-primary/15",
                m.kind === "next" && "border-2 border-border bg-background"
              )}
            >
              {m.kind === "done" && <Check className="h-3 w-3" />}
              {isNow && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0">
              {isNow ? (
                <>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">Now</span>
                  <span className="block text-[13px] font-medium text-foreground">{now}</span>
                </>
              ) : (
                <>
                  <span className="block text-[11px] tabular-nums text-muted-foreground">
                    {formatDate((m as Milestone).date, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className={cn("block text-[13px]", m.kind === "done" ? "text-foreground" : "font-medium text-foreground")}>{(m as Milestone).label}</span>
                  {(m as Milestone).sub && <span className="block text-[12px] text-muted-foreground">{(m as Milestone).sub}</span>}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
