/**
 * The case's tax questions for the expert, grouped by where they stand, with the India
 * and US positions inline so the expert reads the reasoning without opening anything.
 */

import type { TaxTopic } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const GROUPS: { key: TaxTopic["status"]; label: string; dot: string }[] = [
  { key: "in_progress", label: "In progress", dot: "bg-amber-500" },
  { key: "open", label: "Not started", dot: "bg-muted-foreground/50" },
  { key: "resolved", label: "Settled", dot: "bg-emerald-600" },
];
const CONF: Record<string, string> = { confirmed: "Confirmed", likely: "Likely", incomplete: "Incomplete", review_needed: "Needs review" };

export function TopicBoard({ topics }: { topics: TaxTopic[] }) {
  if (!topics.length) return <p className="text-[13px] text-muted-foreground">No tax questions opened yet.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {GROUPS.map((g) => {
        const list = topics.filter((t) => t.status === g.key);
        return (
          <div key={g.key} className="min-w-0 space-y-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", g.dot)} /> {g.label} · {list.length}
            </p>
            {list.map((t) => (
              <details key={t.id} className="group rounded-lg border bg-card">
                <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="block text-[13px] font-medium text-foreground">{t.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {CONF[t.confidence] ?? t.confidence}
                    {t.due_date && t.status !== "resolved" ? ` · next by ${formatDate(t.due_date, { day: "numeric", month: "short" })}` : ""}
                  </span>
                </summary>
                <div className="space-y-1.5 border-t px-3 py-2.5 text-[12.5px] leading-relaxed">
                  {t.conclusion && <p className="text-foreground">{t.conclusion}</p>}
                  <p><span className="font-medium text-muted-foreground">India: </span>{t.india_position ?? "No position yet"}</p>
                  <p><span className="font-medium text-muted-foreground">US: </span>{t.us_position ?? "No position yet"}</p>
                  {t.next_action && t.status !== "resolved" && <p className="text-primary">Next: {t.next_action}</p>}
                </div>
              </details>
            ))}
          </div>
        );
      })}
    </div>
  );
}
