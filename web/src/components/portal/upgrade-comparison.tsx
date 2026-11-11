"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  free: boolean;
  premium: boolean;
}

const ROWS: ComparisonRow[] = [
  { feature: "Initial tax position assessment", free: true, premium: true },
  { feature: "High-level residency analysis", free: true, premium: true },
  { feature: "Identification of reporting obligations", free: true, premium: true },
  { feature: "Comprehensive document review", free: false, premium: true },
  { feature: "Detailed DTAA treaty analysis", free: false, premium: true },
  { feature: "Full FTC optimisation plan", free: false, premium: true },
  { feature: "India ITR + US 1040 filing", free: false, premium: true },
  { feature: "FBAR + FATCA compliance", free: false, premium: true },
  { feature: "Dedicated case captain", free: false, premium: true },
  { feature: "Year-round advisor support", free: false, premium: true },
  { feature: "Quarterly advisor calls", free: false, premium: true },
];

export function UpgradeComparison() {
  return (
    <div className="rounded-xl border overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px] border-b bg-muted/40">
        <div className="px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Feature
          </span>
        </div>
        <div className="px-3 py-3 text-center border-l">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Free
          </span>
        </div>
        <div className="px-3 py-3 text-center border-l bg-primary/5">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Premium
          </span>
        </div>
      </div>

      {/* Rows */}
      {ROWS.map((row, i) => (
        <div
          key={row.feature}
          className={cn(
            "grid grid-cols-[1fr_100px_100px]",
            i < ROWS.length - 1 && "border-b"
          )}
        >
          <div className="px-4 py-2.5 text-sm text-foreground">{row.feature}</div>
          <div className="px-3 py-2.5 flex items-center justify-center border-l">
            {row.free ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/30" />
            )}
          </div>
          <div className="px-3 py-2.5 flex items-center justify-center border-l bg-primary/5">
            <Check className="h-4 w-4 text-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}
