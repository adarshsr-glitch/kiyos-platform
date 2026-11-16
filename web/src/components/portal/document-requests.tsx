"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, Clock, FileText, Loader2, Upload } from "lucide-react";
import { uploadDocument } from "@/lib/api";
import type { CaseDetail, DocumentRequest } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountryTag, PageHeader, Pill, Section } from "./kit";
import { TaskSheet, type Task } from "./task-sheet";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = /\.(pdf|jpe?g|png)$/i;

const STATE = {
  pending: { label: "Needed", tone: "amber" as const },
  rejected: { label: "Needs a new copy", tone: "red" as const },
  received: { label: "Received · checking", tone: "blue" as const },
  reviewed: { label: "Reviewed", tone: "green" as const },
};

/** PRD §5 stage 6 + §8: one secure upload task per item, each saying why it's needed. */
export function DocumentRequests({ caseData, requests }: { caseData: CaseDetail; requests: DocumentRequest[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const focus = Number(search.get("request"));
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<DocumentRequest | null>(null);
  const [uploading, setUploading] = useState<number | "other" | null>(null);

  const open = requests.filter((r) => r.status === "pending" || r.status === "rejected");
  const done = requests.filter((r) => r.status === "received" || r.status === "reviewed");
  const linked = new Set(requests.map((r) => r.document_id).filter(Boolean));
  const other = caseData.documents.filter((d) => !linked.has(d.id));

  // CD-02: a WhatsApp deep link (?request=ID) opens straight into that item's upload sheet.
  const linkedRequest = open.find((r) => r.id === focus);
  const [sheet, setSheet] = useState<Task | null>(linkedRequest ? { kind: "upload", request: linkedRequest } : null);
  const [fromLink, setFromLink] = useState(!!linkedRequest);
  const sheetId = sheet?.kind === "upload" ? sheet.request.id : null;
  const nextRequest = open.find((r) => r.id !== sheetId);

  function openSheet(r: DocumentRequest) {
    setFromLink(false);
    setSheet({ kind: "upload", request: r });
  }

  function pick(r: DocumentRequest | null) {
    target.current = r;
    input.current?.click();
  }

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED.test(file.name)) return toast.error("Upload a PDF, JPG or PNG");
    if (file.size > MAX_BYTES) return toast.error("Files must be 25 MB or smaller");
    const r = target.current;
    setUploading(r?.id ?? "other");
    try {
      await uploadDocument(caseData.id, file, r?.doc_type ?? null, r?.id ?? null);
      toast.success(r ? `${r.title} received — we'll confirm on WhatsApp once it's checked` : "Received");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error && "detail" in e ? String((e as { detail: string }).detail) : "Upload failed");
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => upload(e.target.files)} />
      <PageHeader
        eyebrow="Documents"
        title={open.length ? `${open.length} document${open.length > 1 ? "s" : ""} still needed` : "You're all caught up"}
        meta="Upload them here, never on WhatsApp. Each one says why we need it."
        actions={
          <button onClick={() => pick(null)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-foreground hover:bg-muted">
            {uploading === "other" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload something else
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section title="Needed from you" count={open.length} flush>
          {open.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Nothing outstanding. We&apos;ll ask on WhatsApp if anything new comes up.
            </p>
          ) : (
            <ul className="divide-y">
              {open.map((r) => {
                const s = STATE[r.status];
                const overdue = !!r.due_date && r.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <li
                    key={r.id}
                    className={cn("px-5 py-4", r.id === focus && "bg-[#25d366]/[0.07] shadow-[inset_3px_0_0_#25d366]")}
                  >
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-medium text-foreground">{r.title}</p>
                          <Pill tone={s.tone}>{s.label}</Pill>
                          {r.id === focus && <Pill tone="green">From WhatsApp</Pill>}
                        </div>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">Why: </span>
                          {r.why}
                        </p>
                        {r.status === "rejected" && r.rejection_reason && (
                          <p className="mt-2 flex gap-1.5 text-[13px] text-rose-700">
                            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {r.rejection_reason}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                          <CountryTag code={r.country} />
                          {r.due_date && (
                            <span className={cn("inline-flex items-center gap-1", overdue && "text-rose-600")}>
                              <Clock className="h-3 w-3" />
                              {overdue ? "Overdue" : `Due ${formatDate(r.due_date, { day: "numeric", month: "short" })} (${relativeDays(r.due_date)})`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openSheet(r)}
                        disabled={uploading !== null}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium",
                          r.id === focus || r.status === "rejected"
                            ? "bg-primary text-primary-foreground"
                            : "border text-foreground hover:bg-muted"
                        )}
                      >
                        <Upload className="h-4 w-4" />
                        {r.status === "rejected" ? "Upload new copy" : "Upload"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="space-y-5">
          <Section title="Received" count={done.length} flush>
            {done.length === 0 ? (
              <p className="px-5 py-3 text-[13px] text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="divide-y">
                {done.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5 px-5 py-2.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{r.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">{r.filename}</p>
                    </div>
                    <Pill tone={STATE[r.status].tone}>{r.status === "reviewed" ? "Reviewed" : "Checking"}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          {other.length > 0 && (
            <Section title="Other files" count={other.length} flush>
              <ul className="divide-y">
                {other.map((d) => (
                  <li key={d.id} className="flex items-center gap-2.5 px-5 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">{d.filename}</p>
                    <span className="text-[11px] text-muted-foreground">{d.status === "review" ? "In review" : "Received"}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
            PDF, JPG or PNG up to 25 MB. Duplicates are spotted automatically.
          </p>
        </div>
      </div>
      <TaskSheet
        task={sheet}
        next={nextRequest ? { kind: "upload", request: nextRequest } : null}
        caseId={caseData.id}
        by={caseData.client_name}
        lead={caseData.case_captain}
        fromWhatsApp={fromLink}
        onClose={() => setSheet(null)}
        onNext={(t) => {
          setFromLink(false);
          setSheet(t);
        }}
      />
    </div>
  );
}
