/**
 * What the case captain is doing for the customer right now: each item says what is
 * happening, who owns it and when the customer will hear next. Built from the expert's
 * open work and the tax questions being settled, never a generic activity feed.
 */

import { CircleDot, Search } from "lucide-react";
import type { CaseDetail } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Item = { id: string; title: string; detail: string | null; when: string | null; kind: "work" | "topic" };

export function CaseWork({ caseData, limit = 4, compact }: { caseData: CaseDetail; limit?: number; compact?: boolean }) {
  const lead = caseData.case_captain;
  const first = lead.split(" ")[0];
  const items: Item[] = [
    ...caseData.action_items
      .filter((a) => a.assignee !== "customer" && a.status !== "done")
      .map((a) => ({ id: `a-${a.id}`, title: a.title, detail: a.notes && a.notes !== "clarification" ? a.notes : null, when: a.due_date, kind: "work" as const })),
    ...caseData.topics
      .filter((t) => t.status === "in_progress")
      .map((t) => ({ id: `t-${t.id}`, title: t.title, detail: t.next_action, when: t.due_date, kind: "topic" as const })),
  ].sort((a, b) => (a.when ?? "9999").localeCompare(b.when ?? "9999"));

  return (
    <section aria-labelledby="h-work" className="rounded-2xl border bg-card">
      <header className="flex items-baseline justify-between gap-3 border-b px-5 py-4">
        <h2 id="h-work" className="text-[15px] font-semibold text-foreground">{first} is working on</h2>
        <span className="text-[12px] text-muted-foreground">{items.length} open</span>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-[13.5px] text-muted-foreground">Nothing open right now. {first} picks up the next step as soon as something comes in.</p>
      ) : (
        <ul className="divide-y">
          {items.slice(0, limit).map((i) => (
            <li key={i.id} className={compact ? "flex items-center gap-3 px-5 py-2.5" : "flex gap-3 px-5 py-3.5"} title={compact && i.detail ? i.detail : undefined}>
              {i.kind === "work" ? <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-foreground">{i.title}</p>
                {!compact && i.detail && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{i.detail}</p>}
              </div>
              {i.when && (
                <p className="shrink-0 text-right text-[11.5px] text-muted-foreground">
                  next by
                  <span className="block text-[12.5px] font-medium tabular-nums text-foreground">{formatDate(i.when, { day: "numeric", month: "short" })}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
