"use client";

/**
 * Documents the customer sent that the expert hasn't decided on: what was read from each,
 * anything that disagrees with what the customer told us, and the decision. Accepting or
 * asking for a new copy updates the customer's Documents page and tells them.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Eye, FileText, RotateCcw } from "lucide-react";
import { PdfViewer } from "@/components/source/pdf-viewer";
import { mockFromReading } from "@/lib/mock-documents";
import type { PdfDoc } from "@/lib/mock-pdf";
import { reviewDocument, type DocReading } from "@/lib/residency";
import { relativeDays } from "@/lib/format";

const DONE = new Set(["reviewed", "rejected"]);

export function DocumentsToReview({ readings, advisor }: { readings: DocReading[]; advisor: string }) {
  const pending = readings.filter((r) => !DONE.has(r.status));
  const decided = readings.filter((r) => DONE.has(r.status)).length;
  return (
    <section aria-labelledby="d-h" className="rounded-xl border bg-card">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h3 id="d-h" className="text-[14px] font-semibold">Documents to review</h3>
        <span className="text-[12px] text-muted-foreground">{pending.length} waiting · {decided} decided</span>
      </header>
      {pending.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <ul className="divide-y">
          {pending.map((r) => (
            <Doc key={r.id} r={r} advisor={advisor} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Doc({ r, advisor, holder }: { r: DocReading; advisor: string; holder?: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const x = r.extraction;
  // Stored readings carry `field_list` (label, value, confidence) and `fields` as a map.
  const raw: unknown = x?.field_list ?? x?.fields;
  const fields: { label: string; value: string }[] = Array.isArray(raw)
    ? (raw as { label: string; value: string }[]).slice(0, 5)
    : raw && typeof raw === "object"
      ? Object.entries(raw as Record<string, string>).slice(0, 5).map(([label, value]) => ({ label, value: String(value) }))
      : [];

  // The document itself, so the expert reads what the customer sent before deciding.
  function open() {
    if (!x) return;
    const all = x.field_list ?? Object.entries(x.fields ?? {}).map(([label, value]) => ({ label, value: String(value), confidence: 1 }));
    const who = holder ?? all.find((f) => /holder|employee|name|recipient|participant/i.test(f.label))?.value ?? "";
    setPdf(mockFromReading({ title: x.title, issuer: x.issuer, period: x.period, pages: x.pages, fields: all }, who));
  }

  async function decide(decision: "accept" | "reject") {
    if (decision === "reject" && !reason.trim()) {
      setError("Say what's wrong so the customer can fix it");
      return;
    }
    setBusy(true);
    try {
      await reviewDocument(r.id, decision, advisor, reason.trim() || undefined);
      toast.success(decision === "accept" ? "Accepted. The customer has been told." : "New copy requested");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setBusy(false);
    }
  }

  return (
    <li className="space-y-2.5 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-foreground">{x?.title ?? r.filename}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {r.filename} · sent {relativeDays(r.created_at)}
            {x?.synthetic ? " · synthetic sample" : ""}
          </p>
        </div>
        {x && (
          <button onClick={open} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium text-foreground hover:bg-muted">
            <Eye className="h-3.5 w-3.5" /> View document
          </button>
        )}
      </div>
      {fields.length > 0 ? (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[12.5px]">
          {fields.map((f) => (
            <div key={f.label} className="contents">
              <dt className="truncate text-muted-foreground">{f.label}</dt>
              <dd className="text-right font-medium tabular-nums text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">Still being read.</p>
      )}
      {x?.mismatch && (
        <p className="flex gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b className="font-semibold">{x.mismatch.title}.</b> Told us {x.mismatch.stated}; document shows {x.mismatch.found}.
          </span>
        </p>
      )}
      {rejecting && (
        <input
          autoFocus
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          placeholder="Pages 2–3 are missing"
          className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] outline-none focus:border-primary"
        />
      )}
      {error && <p className="text-[12px] text-rose-700">{error}</p>}
      <div className="flex gap-2">
        {!rejecting ? (
          <>
            <button onClick={() => decide("accept")} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button onClick={() => setRejecting(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] text-foreground hover:bg-muted">
              <RotateCcw className="h-3.5 w-3.5" /> Ask for a new copy
            </button>
          </>
        ) : (
          <>
            <button onClick={() => decide("reject")} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-60">
              Send request
            </button>
            <button onClick={() => setRejecting(false)} className="h-8 rounded-lg border px-3 text-[12.5px] text-muted-foreground">Cancel</button>
          </>
        )}
      </div>
      <PdfViewer doc={pdf} onClose={() => setPdf(null)} />
    </li>
  );
}
