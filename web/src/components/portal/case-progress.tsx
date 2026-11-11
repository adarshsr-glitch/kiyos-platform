"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, FileText, Lock, Upload } from "lucide-react";
import type { DocumentItem, TaxTopic } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOPIC_STATE: Record<TaxTopic["status"], { label: string; icon: typeof Circle; className: string }> = {
  resolved: { label: "Settled", icon: CheckCircle2, className: "text-emerald-600" },
  in_progress: { label: "In progress", icon: CircleDashed, className: "text-amber-600" },
  open: { label: "Not started", icon: Circle, className: "text-muted-foreground/60" },
};

/** What Kiyos is working through for the customer, in their words. */
export function CaseProgress({ topics, locked }: { topics: TaxTopic[]; locked?: boolean }) {
  const settled = topics.filter((t) => t.status === "resolved").length;
  const order: TaxTopic["status"][] = ["in_progress", "open", "resolved"];
  const sorted = [...topics].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Your tax questions</h2>
        {!locked && topics.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {settled} of {topics.length} settled
          </span>
        )}
      </header>
      {!locked && topics.length > 0 && (
        <div className="flex h-1 w-full overflow-hidden bg-muted" aria-hidden>
          <div className="bg-emerald-500" style={{ width: `${(settled / topics.length) * 100}%` }} />
        </div>
      )}
      {locked ? (
        <LockedNote text="Your full list of cross-border questions — residency, retirement, investments — comes with a plan." />
      ) : topics.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          We&apos;ll list the questions your case raises once your advisor has reviewed it.
        </p>
      ) : (
        <ul className="divide-y">
          {sorted.map((t) => {
            const s = TOPIC_STATE[t.status];
            return (
              <li key={t.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <s.icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.className)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{t.title}</p>
                  {t.status !== "resolved" && t.next_action && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">Next: {t.next_action}</p>
                  )}
                </div>
                <span className={cn("shrink-0 text-[11px] font-medium", s.className)}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const DOC_STATE: Record<string, { label: string; className: string }> = {
  extracted: { label: "Reviewed", className: "text-emerald-700" },
  review: { label: "In review", className: "text-amber-700" },
  received: { label: "Received", className: "text-muted-foreground" },
  uploaded: { label: "Received", className: "text-muted-foreground" },
};

export function DocumentsSummary({
  documents,
  neededCount,
  locked,
}: {
  documents: DocumentItem[];
  neededCount: number;
  locked?: boolean;
}) {
  const shown = documents.slice(0, 5);
  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Documents</h2>
        <Link
          href="/portal/documents"
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Link>
      </header>
      {documents.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Nothing uploaded yet. Start with your W-2 or Form 16.
        </p>
      ) : (
        <ul className="divide-y">
          {shown.map((d) => {
            const s = DOC_STATE[d.status] ?? { label: d.status, className: "text-muted-foreground" };
            return (
              <li key={d.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{d.filename}</p>
                <span className={cn("shrink-0 text-[11px] font-medium", s.className)}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      <footer className="mt-auto border-t px-4 py-2 text-xs text-muted-foreground">
        {locked ? (
          <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Full document review comes with a plan</span>
        ) : neededCount > 0 ? (
          <>
            <span className="font-medium text-foreground">{neededCount} still needed</span> ·{" "}
            <Link href="/portal/documents" className="text-primary hover:underline">see checklist</Link>
          </>
        ) : (
          "Checklist complete"
        )}
      </footer>
    </section>
  );
}

function LockedNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-4 text-sm text-muted-foreground">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        {text}{" "}
        <Link href="/portal/upgrade" className="font-medium text-primary hover:underline">
          See plans
        </Link>
      </p>
    </div>
  );
}
