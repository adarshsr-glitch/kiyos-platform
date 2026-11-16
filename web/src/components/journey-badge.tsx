import type { Journey } from "@/lib/types";
import { JOURNEY_LABEL } from "@/lib/tier";
import { cn } from "@/lib/utils";

const TONE: Record<Journey, string> = {
  intake: "bg-sky-50 text-sky-800 ring-sky-600/15",
  signup: "bg-violet-50 text-violet-800 ring-violet-600/15",
  free: "bg-slate-100 text-slate-700 ring-slate-500/15",
  payment_pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
};

/** The customer's funnel stage, as the expert workspace shows it. */
export function JourneyBadge({ journey, className }: { journey: Journey; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE[journey],
        className
      )}
    >
      {JOURNEY_LABEL[journey]}
    </span>
  );
}
