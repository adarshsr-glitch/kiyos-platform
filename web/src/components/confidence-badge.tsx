import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/types";

const STYLES: Record<Confidence, { label: string; cls: string }> = {
  confirmed: {
    label: "Confirmed",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  likely: {
    label: "Likely",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  },
  review_needed: {
    label: "Review needed",
    cls: "bg-rose-50 text-rose-800 border-rose-200",
  },
  incomplete: {
    label: "Incomplete",
    cls: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export function ConfidenceBadge({
  level,
  className,
}: {
  level: Confidence;
  className?: string;
}) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        s.cls,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          level === "confirmed" && "bg-emerald-500",
          level === "likely" && "bg-amber-500",
          level === "review_needed" && "bg-rose-500",
          level === "incomplete" && "bg-slate-400"
        )}
      />
      {s.label}
    </span>
  );
}
