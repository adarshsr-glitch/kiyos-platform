"use client";

/**
 * A PDF sent in the WhatsApp thread, shown as WhatsApp shows a document: icon, file name,
 * pages and size. Opening it renders the document (the customer's initial assessment) from
 * their saved scan, with the PDF to open or download.
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import { getInitialScan } from "@/lib/api";
import { assessmentPdf } from "@/lib/mock-documents";
import type { PdfDoc } from "@/lib/mock-pdf";
import { PdfViewer } from "@/components/source/pdf-viewer";
import { useCustomerMaybe } from "@/lib/customer-context";

export function PdfAttachment({ caseId, name, label, variant = "whatsapp" }: { caseId?: number; name?: string; label: string; variant?: "whatsapp" | "button" }) {
  const customer = useCustomerMaybe();
  caseId = caseId ?? customer?.caseData.id;
  name = name ?? customer?.caseData.client_name;
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [busy, setBusy] = useState(false);
  async function open() {
    if (!caseId) return;
    setBusy(true);
    try {
      const scan = await getInitialScan(caseId);
      if (scan) setDoc(assessmentPdf(scan, name ?? "You"));
    } finally {
      setBusy(false);
    }
  }
  if (variant === "button") {
    return (
      <>
        <button onClick={open} disabled={busy || !caseId} className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-[14px] font-medium text-foreground hover:bg-muted disabled:opacity-60">
          <FileText className="h-4 w-4" /> {busy ? "Opening…" : label}
        </button>
        <PdfViewer doc={doc} onClose={() => setDoc(null)} />
      </>
    );
  }
  return (
    <>
      <button
        onClick={open}
        disabled={busy || !caseId}
        className="wa-bubble mt-0.5 flex w-full items-center gap-3 rounded-lg bg-[var(--wa-in)] px-3 py-2.5 text-left transition-colors hover:bg-[#f5f6f6] disabled:opacity-70"
      >
        <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-[#e5533d] text-[9px] font-bold text-white">PDF</span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-[var(--wa-text)]">{label}</span>
          <span className="block text-[11.5px] text-[var(--wa-meta)]">2 pages · PDF · {busy ? "opening…" : "tap to open"}</span>
        </span>
        <FileText className="ml-auto h-4 w-4 shrink-0 text-[var(--wa-meta)]" />
      </button>
      <PdfViewer doc={doc} onClose={() => setDoc(null)} />
    </>
  );
}
