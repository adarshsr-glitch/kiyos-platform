"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewAssessment } from "@/lib/api";
import type { Assessment, CaseEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-800",
  changes_requested: "bg-rose-100 text-rose-800",
  signed_off: "bg-emerald-100 text-emerald-800",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** M5.8 review and sign-off: each decision is written to the case audit trail. */
export function AssessmentReview({
  assessments,
  events,
  reviewer,
}: {
  assessments: Assessment[];
  events: CaseEvent[];
  reviewer: string;
}) {
  if (assessments.length === 0) {
    return <p className="text-sm italic text-muted-foreground">No assessments yet.</p>;
  }
  return (
    <div className="space-y-3">
      {assessments.map((a) => (
        <AssessmentRow
          key={a.id}
          assessment={a}
          reviewer={reviewer}
          lastDecision={events.find(
            (e) => e.target_type === "assessment" && e.target_id === a.id
          )}
        />
      ))}
    </div>
  );
}

function AssessmentRow({
  assessment: a,
  reviewer,
  lastDecision,
}: {
  assessment: Assessment;
  reviewer: string;
  lastDecision?: CaseEvent;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const signedOff = a.status === "signed_off";

  async function act(action: "sign_off" | "request_changes") {
    setBusy(true);
    try {
      await reviewAssessment(a.id, action, reviewer, note || undefined);
      toast.success(action === "sign_off" ? "Assessment signed off" : "Changes requested");
      setChanging(false);
      setNote("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  const decisionNote = lastDecision?.detail?.note as string | undefined;

  return (
    <div className="rounded-md border bg-primary/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{a.headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                STATUS_STYLE[a.status] ?? "bg-muted"
              )}
            >
              {a.status.replace(/_/g, " ")}
            </span>
            {lastDecision && (
              <span>
                {lastDecision.actor} · {when(lastDecision.created_at)}
              </span>
            )}
            {a.derivation_trail?.length ? (
              <span className="font-mono">
                {a.derivation_trail.map((s) => s.rule_id).join(", ")}
              </span>
            ) : null}
          </div>
          {decisionNote && (
            <p className="mt-1.5 text-xs text-foreground/80">“{decisionNote}”</p>
          )}
        </div>
        {!signedOff && !changing && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setChanging(true)}
              disabled={busy}
            >
              <PencilLine className="h-3 w-3" />
              Request changes
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => act("sign_off")}
              disabled={busy}
            >
              <CheckCircle2 className="h-3 w-3" />
              Sign off
            </Button>
          </div>
        )}
      </div>
      {changing && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What needs to change before sign-off?"
            className="min-h-[64px] text-sm bg-background"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setChanging(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={busy || !note.trim()}
              onClick={() => act("request_changes")}
            >
              Send back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
