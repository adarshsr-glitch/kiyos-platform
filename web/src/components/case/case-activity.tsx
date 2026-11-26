/**
 * One timeline for the case, shared by both sides: what the customer did, what the agent
 * did and what the expert did, in plain words. Internal-only events never appear here.
 */

import type { CaseEvent } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const VERB: Record<string, string> = {
  "ticket.created": "asked",
  "ticket.resolved": "answered",
  "document.uploaded": "sent a document",
  "document.accepted": "accepted",
  "document.rejected": "asked for a new copy of",
  "documents.requested": "requested documents",
  "clarification.requested": "asked the customer",
  "plan.activated": "joined",
  "profile.confirmed": "confirmed their profile",
  "profile.change_confirmed": "confirmed a change",
  "review.status_changed": "moved the review to",
  "onboarding.completed": "completed onboarding",
  "scan.completed": "completed the scan",
};
const HIDDEN = new Set(["note.added", "conversation.takeover", "conversation.handback", "workspace.signed_in"]);
const STATUS: Record<string, string> = { in_review: "in review", awaiting_customer: "waiting on the customer", ready_for_signoff: "ready for sign-off" };

export function CaseActivity({ events, customer, limit = 14 }: { events: CaseEvent[]; customer: string; limit?: number }) {
  const rows = events
    .filter((e) => !HIDDEN.has(e.action))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  if (!rows.length) return <p className="text-[13px] text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="relative space-y-3.5 border-l pl-4">
      {rows.map((e) => {
        const label = (e.detail?.label as string | undefined) ?? (e.detail?.to ? STATUS[e.detail.to as string] ?? String(e.detail.to) : null);
        const who = e.actor === "agent" ? "Kiyos" : e.actor === "customer" ? customer : e.actor;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary/70 ring-4 ring-background" />
            <p className="text-[12.5px] leading-snug text-foreground">
              <span className="font-medium">{who}</span> {VERB[e.action] ?? e.action.replace(/[._]/g, " ")}
              {label ? <span className="text-muted-foreground"> · {label}</span> : null}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatDate(e.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
          </li>
        );
      })}
    </ol>
  );
}
