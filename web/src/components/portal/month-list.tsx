"use client";

/**
 * Year at a glance, the dates as a list: what's coming as date tiles (amber when it needs the
 * customer), and what already happened folded behind a count. Every row opens the side panel
 * with the full detail (one-panel rule). Several documents sent in one month read as one row.
 */

import { useState } from "react";
import { ArrowLeftRight, BadgeCheck, CalendarClock, FileCheck2, FileUp, MessageCircleQuestion, Plane, Stamp } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/side-sheet";
import { Avatar, CountryCode, DateTile } from "./visual";

export type Kind = "travel" | "move" | "document" | "question" | "due" | "filing" | "expert";
export type YearEvent = { date: string; kind: Kind; title: string; sub?: string | null; country?: "IN" | "US" | "BOTH" | null; names?: string[]; /** Not finished yet: never shown as done. */ open?: boolean };

const ICON = { travel: Plane, move: ArrowLeftRight, document: FileCheck2, question: MessageCircleQuestion, due: FileUp, filing: Stamp, expert: BadgeCheck };
const KIND: Record<Kind, string> = { travel: "Travel", move: "Your move", document: "Documents", question: "Your question", due: "Due from you", filing: "Return", expert: "From your expert" };
const full = (s: string) => formatDate(s, { day: "numeric", month: "long", year: "numeric" });

export function EventTiles({ upcoming, past, today, customer, expert }: { upcoming: YearEvent[]; past: YearEvent[]; today: string; customer: string; expert: string }) {
  const [open, setOpen] = useState<YearEvent | null>(null);

  const row = (e: YearEvent, i: number) => {
    const Icon = ICON[e.kind] ?? CalendarClock;
    const yours = e.kind === "due" || e.kind === "question";
    const late = !!e.open && e.date < today;
    return (
      <li key={`${e.date}-${i}`}>
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(e)} className="flex w-full items-center gap-3.5 border-t py-2.5 text-left hover:bg-muted/30">
          <DateTile date={e.date} act={e.kind === "due" && !late} late={late} />
          <Icon className={cn("h-4 w-4 shrink-0", e.kind === "due" ? "text-[#7A3F06]" : "text-muted-foreground")} aria-hidden />
          <span className="min-w-0 flex-1 text-[14px] text-foreground">
            {e.title}
            <span className="sr-only">, {full(e.date)}</span>
          </span>
          {e.country && e.country !== "BOTH" && <CountryCode code={e.country} />}
          {yours ? <Avatar name={customer} who="customer" /> : e.kind === "expert" ? <Avatar name={expert} who="expert" /> : null}
        </button>
      </li>
    );
  };

  return (
    <>
      {upcoming.length > 0 ? (
        <ul>{upcoming.map(row)}</ul>
      ) : (
        <p className="border-t py-3 text-[13.5px] text-muted-foreground">Nothing dated is coming up in this period.</p>
      )}
      {past.length > 0 && (
        <details className="border-t pt-2.5" open={upcoming.length === 0}>
          <summary className="cursor-pointer list-none text-[13px] font-medium text-primary [&::-webkit-details-marker]:hidden">Show what already happened · {past.length}</summary>
          <ul className="mt-1 opacity-80">{past.map(row)}</ul>
        </details>
      )}

      <SideSheet open={!!open} onClose={() => setOpen(null)} eyebrow={open ? `${KIND[open.kind]} · ${full(open.date)}` : undefined} title={open?.title ?? ""}>
        {open && (
          <div className="space-y-4 text-[14px]">
            {open.sub && <p className="leading-relaxed text-foreground">{open.sub}</p>}
            {open.names && (
              <ul className="divide-y rounded-lg border text-[13.5px]">
                {open.names.map((n) => (
                  <li key={n} className="px-3.5 py-2 text-foreground">
                    {n}
                  </li>
                ))}
              </ul>
            )}
            {open.country && <p className="text-muted-foreground">{open.country === "BOTH" ? "India and the US" : open.country === "IN" ? "India" : "United States"}</p>}
            <p className="text-[13px] text-muted-foreground">{open.open ? (open.date < today ? "Overdue." : "Coming up.") : open.date > today ? "Coming up." : "Done."}</p>
          </div>
        )}
      </SideSheet>
    </>
  );
}
