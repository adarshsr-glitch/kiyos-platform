"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { initials } from "@/lib/format";
import { BookCallDialog, formatSlot } from "./book-call-dialog";

/** The named advisor, kept in the page header rather than competing with tasks. */
export function CaptainChip({
  caseId,
  captain,
  clientName,
}: {
  caseId: number;
  captain: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [booked, setBooked] = useState<Date | null>(null);

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {initials(captain)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-foreground">{captain}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {booked ? `Call requested · ${formatSlot(booked)}` : "Your case captain"}
        </p>
      </div>
      {!booked && (
        <button
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          title="Your plan includes a 30-minute call each quarter"
        >
          <Phone className="h-3 w-3" />
          Book call
        </button>
      )}
      <BookCallDialog
        open={open}
        onOpenChange={setOpen}
        caseId={caseId}
        captain={captain}
        clientName={clientName}
        onBooked={setBooked}
      />
    </div>
  );
}
