/** Evidence coverage: for each fact the assessment relies on, how far its proof has got. */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type EvidenceRow = { label: string; told: boolean; requested: boolean; received: boolean; read: boolean; accepted: boolean; document: string | null };

const STEPS = [
  { k: "told", label: "Told us" },
  { k: "requested", label: "Requested" },
  { k: "received", label: "Received" },
  { k: "read", label: "Read" },
  { k: "accepted", label: "Accepted" },
] as const;

export function EvidenceMatrix({ rows }: { rows: EvidenceRow[] }) {
  if (!rows.length) return null;
  const done = rows.filter((r) => r.accepted).length;
  const pct = Math.round((done / rows.length) * 100);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12px] font-medium tabular-nums">{done}/{rows.length} backed by accepted documents</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[12.5px]">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              <th className="pb-2 text-left font-medium">Fact</th>
              {STEPS.map((s) => <th key={s.k} className="pb-2 text-center font-medium">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const reached = STEPS.filter((s) => r[s.k]).length;
              return (
                <tr key={r.label} className="border-t">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{r.label}</p>
                    {r.document && <p className="truncate text-[11px] text-muted-foreground">{r.document}</p>}
                  </td>
                  {STEPS.map((s, i) => (
                    <td key={s.k} className="relative py-2 text-center">
                      {i > 0 && <span className={cn("absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2", i < reached ? "bg-primary" : "bg-muted")} />}
                      {i < STEPS.length - 1 && <span className={cn("absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2", i + 1 < reached ? "bg-primary" : "bg-muted")} />}
                      <span className={cn("relative mx-auto flex h-5 w-5 items-center justify-center rounded-full", r[s.k] ? "bg-primary text-primary-foreground" : "border-2 border-muted bg-background")}>
                        {r[s.k] && <Check className="h-3 w-3" />}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
