/**
 * A move year at a glance: the calendar year split at the move date, with the salary
 * earned on each side. Replaces a sentence explaining why there are two salaries.
 */

import { ArrowRight } from "lucide-react";
import type { MoveYear } from "@/lib/financial-picture";
import { formatDate } from "@/lib/format";

/** `bare`: no frame or caption, for use inside a larger section that already explains the move. */
export function MoveYearBand({ move, bare }: { move: MoveYear; bare?: boolean }) {
  const d = new Date(move.date);
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const split = Math.min(0.9, Math.max(0.1, (d.getTime() - start) / (end - start)));
  const when = formatDate(move.date, { day: "numeric", month: "short" });

  const side = (flag: string, where: string, period: string, employer: string | null, amount: string | null) => (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] text-muted-foreground">
        <span aria-hidden>{flag}</span> {where} · {period}
      </p>
      <p className="truncate text-[15px] font-semibold tabular-nums text-foreground">{amount ?? "—"}</p>
      {employer && <p className="truncate text-[12px] text-muted-foreground">{employer}</p>}
    </div>
  );

  return (
    <figure className={bare ? "" : "rounded-xl border bg-card p-4"} aria-label={`Moved to India on ${when} ${year}: salary in the US before, in India after`}>
      <figcaption className={bare ? "sr-only" : "mb-3 flex items-center gap-1.5 text-[12px] font-medium text-foreground"}>
        {year} is your move year <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">a salary in each country, each taxed where it was earned</span>
      </figcaption>
      <div className="relative mb-3 flex h-2.5 gap-[2px]">
        <span className="rounded-l-full bg-slate-400" style={{ width: `${split * 100}%` }} />
        <span className="flex-1 rounded-r-full bg-primary" />
        <span className="absolute -top-1 h-[18px] w-[2px] rounded bg-foreground" style={{ left: `${split * 100}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {side("🇺🇸", "US", `Jan – ${when}`, move.us.employer, move.us.salary.value)}
        <div className="border-l pl-4">{side("🇮🇳", "India", `${when} – Dec`, move.in.employer, move.in.salary.value)}</div>
      </div>
    </figure>
  );
}
