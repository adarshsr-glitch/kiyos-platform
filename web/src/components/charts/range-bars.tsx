/**
 * Where money sits, as the ranges the customer gave. Each holding is a bar from the
 * bottom to the top of its range on a log scale, one scale per currency. Nothing is
 * totalled or converted, because the inputs are ranges.
 */

import { cn } from "@/lib/utils";
import { bandRange, type Holding } from "@/lib/residency";

const SCALE = {
  INR: { min: 1e5, max: 4e7, ticks: [[1e5, "₹1L"], [5e5, "₹5L"], [2.5e6, "₹25L"], [1e7, "₹1Cr"], [4e7, "₹4Cr"]] },
  USD: { min: 1e3, max: 1e6, ticks: [[1e3, "$1k"], [1e4, "$10k"], [5e4, "$50k"], [2.5e5, "$250k"], [1e6, "$1M"]] },
} as const;

export function RangeBars({ holdings }: { holdings: Holding[] }) {
  const groups = (["INR", "USD"] as const).map((cur) => ({ cur, items: holdings.filter((h) => h.currency === cur) })).filter((g) => g.items.length);
  if (!groups.length) return null;
  return (
    <div className="space-y-6">
      {groups.map(({ cur, items }) => {
        const s = SCALE[cur];
        const x = (v: number) => ((Math.log10(Math.min(Math.max(v, s.min), s.max)) - Math.log10(s.min)) / (Math.log10(s.max) - Math.log10(s.min))) * 100;
        return (
          <div key={cur}>
            <p className="mb-2 text-[12px] font-medium text-muted-foreground">{cur === "INR" ? "🇮🇳 In India (₹)" : "🇺🇸 In the US ($)"}</p>
            <ul className="space-y-2.5">
              {items.map((h) => {
                const { lo, hi } = bandRange(h.band);
                const left = lo <= 0 ? 0 : x(lo);
                const right = hi === null ? 100 : x(hi);
                return (
                  <li key={h.id} className="grid grid-cols-[minmax(0,150px)_1fr] items-center gap-3 sm:grid-cols-[200px_1fr]">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13px] font-medium">{h.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {h.kind === "income" ? "Income / yr" : "Value"} · {h.band}
                      </p>
                    </div>
                    <div className="relative h-5 rounded bg-muted/60">
                      <div
                        className={cn(
                          "absolute inset-y-0.5 rounded",
                          h.kind === "income" ? "bg-emerald-500/70" : "bg-sky-500/70",
                          lo <= 0 && "bg-gradient-to-r from-transparent",
                          hi === null && "bg-gradient-to-l from-transparent"
                        )}
                        style={{ left: `${left}%`, width: `${Math.max(right - left, 2)}%` }}
                        title={`${h.label}: ${h.band}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="relative ml-[162px] mt-1 h-4 sm:ml-[212px]">
              {s.ticks.map(([v, label]) => (
                <span key={label} className="absolute -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${x(v)}%` }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded bg-emerald-500/70" /> Income per year</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded bg-sky-500/70" /> Value held</span>
        <span>Ranges you gave us. We don&apos;t add them up or convert currencies.</span>
      </p>
    </div>
  );
}
