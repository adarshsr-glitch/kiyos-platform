"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveTicket } from "@/lib/api";
import type { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

function relative(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs}m` : abs < 48 * 60 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return mins >= 0 ? `due in ${text}` : `${text} overdue`;
}

/** M5.7 expert gate: questions the agent routed instead of answering. */
export function TicketList({ tickets, advisor }: { tickets: Ticket[]; advisor: string }) {
  const open = tickets.filter((t) => t.status === "open");
  const resolved = tickets.filter((t) => t.status === "resolved");

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground italic">
          No tickets. Questions Kiyos can&apos;t answer with confidence land here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {open.length === 0 && (
          <p className="text-sm text-muted-foreground">All tickets resolved.</p>
        )}
        {open.map((t) => (
          <OpenTicket key={t.id} ticket={t} advisor={advisor} />
        ))}
      </div>
      {resolved.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resolved
          </p>
          <div className="space-y-2">
            {resolved.map((t) => (
              <div key={t.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{t.question}</p>
                {t.resolution && (
                  <p className="mt-1 text-xs text-muted-foreground">{t.resolution}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t.resolved_by} ·{" "}
                  {t.resolved_at && new Date(t.resolved_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpenTicket({ ticket: t, advisor }: { ticket: Ticket; advisor: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(t.draft_answer ?? "");
  const [busy, setBusy] = useState(false);
  const overdue = t.sla_due_at ? new Date(t.sla_due_at).getTime() < Date.now() : false;

  async function resolve(reply: boolean) {
    setBusy(true);
    try {
      await resolveTicket(t.id, advisor, reply ? answer : null, reply ? undefined : "Closed without reply");
      toast.success(reply ? "Answer sent to the customer" : "Ticket closed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn(overdue && "border-rose-300")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer asked</p>
            <p className="mt-0.5 text-sm font-medium">{t.question}</p>
          </div>
          <div className="shrink-0 text-right text-[11px]">
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800 tabular-nums">
              {Math.round(t.confidence * 100)}% confidence
            </span>
            {t.sla_due_at && (
              <p className={cn("mt-1 flex items-center justify-end gap-1", overdue ? "text-rose-700" : "text-muted-foreground")}>
                <Clock className="h-3 w-3" />
                {relative(t.sla_due_at)}
              </p>
            )}
          </div>
        </div>
        {t.reason && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why routed:</span> {t.reason}
          </p>
        )}
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Your answer {t.draft_answer ? "(pre-filled with Kiyos's unreviewed draft)" : ""}
          </p>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="min-h-[80px] text-sm"
            placeholder="Write the reviewed answer the customer will see…"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Owner: {t.owner ?? "unassigned"}</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => resolve(false)}>
              <CheckCircle2 className="h-3 w-3" />
              Close without reply
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy || !answer.trim()} onClick={() => resolve(true)}>
              <Send className="h-3 w-3" />
              Send answer &amp; resolve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
