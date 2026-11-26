"use client";

/**
 * How the case picture was worked out: residency counted from the travel record, and which
 * facts are backed by documents. Folded away by default; the actions it implies are in
 * "Up next".
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Brief, Residency } from "@/lib/residency";
import { ResidencyClock } from "@/components/charts/residency-clock";
import { EvidenceMatrix } from "@/components/charts/evidence-matrix";

export function WorkingDetails({ brief, residency }: { brief: Brief; residency: Residency | null }) {
  const [open, setOpen] = useState(false);
  const backed = brief.evidence.filter((e) => e.accepted).length;
  const stale = !!residency && Object.values(residency.reviewed ?? {}).some((r) => r?.stale);
  return (
    <section className="rounded-xl border bg-card">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="block text-[14px] font-semibold text-foreground">How the residency was worked out</span>
          <span className="block text-[12px] text-muted-foreground">
            Days counted from the travel record · {backed} of {brief.evidence.length} facts backed by an accepted document{stale ? " · recheck pending" : ""}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-5 border-t px-4 py-4">
          {residency && residency.india.length > 0 && <ResidencyClock data={residency} namedReviewers />}
          {brief.evidence.length > 0 && (
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-foreground">Evidence behind it</h3>
              <EvidenceMatrix rows={brief.evidence} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
