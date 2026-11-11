"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

/** M6.6: who the customer's named advisor is, and how to book the included quarterly call. */
export function CaseCaptainCard({
  caseId,
  captain,
  clientName,
}: {
  caseId: number;
  captain: string;
  clientName: string;
}) {
  const slots = useMemo(() => upcomingSlots(), []);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Date | null>(null);
  const [booked, setBooked] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const initials = captain
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const firstName = captain.split(" ")[0];

  async function book() {
    if (!picked) return;
    setBusy(true);
    try {
      await requestAdvisorCall(caseId, localIso(picked), clientName);
      setBooked(picked);
      setOpen(false);
      toast.success(`Call requested — ${firstName} will send the invite`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request the call");
    } finally {
      setBusy(false);
    }
  }

  const fmt = (d: Date) =>
    d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your case captain</p>
            <p className="text-sm font-semibold text-foreground">{captain}</p>
            <p className="text-xs text-muted-foreground">
              {booked
                ? `Call requested for ${fmt(booked)}`
                : "Reviews every answer before it's final. Includes a 30-minute call each quarter."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Link href="/portal/chat">
              <MessageCircle className="h-3.5 w-3.5" />
              Message
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-full" disabled={!!booked}>
                {booked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                {booked ? "Call requested" : "Book a call"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Book your quarterly call with {firstName}</DialogTitle>
                <DialogDescription>
                  30 minutes, included in your plan. Pick a time and {firstName} will confirm the invite.
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
                    {fmt(s)}
                  </button>
                ))}
              </div>
              <Button onClick={book} disabled={!picked || busy} className="w-full rounded-full">
                Request this time
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
