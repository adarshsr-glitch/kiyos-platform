"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestAdvisorCall } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Next few weekday slots at 10:30 and 17:00 local time. */
function upcomingSlots(count = 6): Date[] {
  const slots: Date[] = [];
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  while (slots.length < count) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (const [h, m] of [[10, 30], [17, 0]]) {
      const s = new Date(day);
      s.setHours(h, m);
      slots.push(s);
    }
  }
  return slots.slice(0, count);
}

function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function formatSlot(d: Date) {
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Book the plan's included quarterly 30-minute call with the case captain. */
export function BookCallDialog({
  open,
  onOpenChange,
  caseId,
  captain,
  clientName,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
  captain: string;
  clientName: string;
  onBooked?: (slot: Date) => void;
}) {
  const slots = useMemo(() => upcomingSlots(), []);
  const [picked, setPicked] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const firstName = captain.split(" ")[0];

  async function book() {
    if (!picked) return;
    setBusy(true);
    try {
      await requestAdvisorCall(caseId, localIso(picked), clientName);
      onBooked?.(picked);
      onOpenChange(false);
      toast.success(`Call requested for ${formatSlot(picked)} — ${firstName} will send the invite`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request the call");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Call with {firstName}</DialogTitle>
          <DialogDescription>
            Your plan includes one 30-minute call each quarter. Pick a time and {firstName} will
            confirm the invite.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => (
            <button
              key={s.toISOString()}
              onClick={() => setPicked(s)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                picked?.getTime() === s.getTime()
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              {formatSlot(s)}
            </button>
          ))}
        </div>
        <Button onClick={book} disabled={!picked || busy} className="w-full rounded-full">
          Request this time
        </Button>
      </DialogContent>
    </Dialog>
  );
}
