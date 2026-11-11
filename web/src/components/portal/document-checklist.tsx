"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/lib/types";
import { useCustomer } from "@/lib/customer-context";
import { uploadDocument } from "@/lib/api";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = /\.(pdf|jpe?g|png)$/i;

const STATUS_LABEL: Record<string, string> = {
  received: "Received · awaiting review",
  uploaded: "Received · awaiting review",
  review: "In review",
  extracted: "Reviewed",
};

const REQUIRED_DOCS = [
  { type: "W-2", label: "W-2 (US wages)", free: true },
  { type: "form_16", label: "Form 16 (India salary)", free: true },
  { type: "passport", label: "Passport (travel history)", free: true },
  { type: "401k_statement", label: "401(k) / IRA statement", free: false },
  { type: "rental_agreement", label: "Rental agreements", free: false },
  { type: "pan_card", label: "PAN card copy", free: false },
  { type: "pay_stub", label: "Pay stubs (last 3 months)", free: false },
  { type: "brokerage_statement", label: "Brokerage statements", free: false },
];

/** Required documents (for the customer's plan) not yet received. */
export function missingRequiredDocs(documents: DocumentItem[], premium: boolean) {
  return REQUIRED_DOCS.filter((r) => premium || r.free).filter(
    (r) =>
      !documents.some(
        (d) =>
          d.doc_type?.toLowerCase() === r.type.toLowerCase() ||
          d.filename.toLowerCase().includes(r.type.toLowerCase().replace("_", ""))
      )
  );
}

export function DocumentChecklist({
  caseId,
  documents,
}: {
  caseId: number;
  documents: DocumentItem[];
}) {
  const { tier } = useCustomer();
  const router = useRouter();
  const isPremium = tier === "premium";
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Which checklist item the file picker was opened for (null = general dropzone).
  const pendingType = useRef<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const visibleDocs = isPremium
    ? REQUIRED_DOCS
    : REQUIRED_DOCS.filter((d) => d.free);

  const lockedDocs = isPremium ? [] : REQUIRED_DOCS.filter((d) => !d.free);

  const matchFor = (type: string) =>
    documents.find(
      (d) =>
        d.doc_type?.toLowerCase() === type.toLowerCase() ||
        d.filename.toLowerCase().includes(type.toLowerCase().replace("_", ""))
    );
  const matchedIds = new Set(
    REQUIRED_DOCS.map((r) => matchFor(r.type)?.id).filter((id) => id !== undefined)
  );
  const otherDocs = documents.filter((d) => !matchedIds.has(d.id));

  const openPicker = (docType: string | null) => {
    pendingType.current = docType;
    fileInputRef.current?.click();
  };

  const upload = async (files: FileList | null, docType: string | null) => {
    if (!files?.length) return;
    setUploading(docType ?? "__dropzone");
    let ok = 0;
    for (const file of Array.from(files)) {
      if (!ACCEPTED.test(file.name)) {
        toast.error(`${file.name}: upload a PDF, JPG or PNG`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: files must be 25 MB or smaller`);
        continue;
      }
      try {
        await uploadDocument(caseId, file, docType);
        ok += 1;
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error && "detail" in e ? (e as { detail: string }).detail : "upload failed"}`);
      }
    }
    setUploading(null);
    if (ok > 0) {
      toast.success(`${ok} document${ok > 1 ? "s" : ""} received — stored securely in your workspace`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          upload(files, pendingType.current).finally(() => {
            if (fileInputRef.current) fileInputRef.current.value = "";
          });
        }}
      />

      <div className="space-y-2">
        {visibleDocs.map((req) => {
          const match = matchFor(req.type);
          const uploaded = !!match;
          const status = match?.status;

          return (
            <div
              key={req.type}
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-3",
                uploaded ? "bg-emerald-50/50 border-emerald-200" : "bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                {uploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {req.label}
                  </p>
                  {match && (
                    <p className="text-[11px] text-muted-foreground">
                      {match.filename} · {STATUS_LABEL[status ?? ""] ?? status}
                    </p>
                  )}
                </div>
              </div>
              {uploaded ? (
                <span
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                    status === "extracted" ? "text-emerald-700" : "text-amber-700"
                  )}
                >
                  {status !== "extracted" && <Clock className="h-3 w-3" />}
                  {status === "extracted" ? "Reviewed" : "Received"}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 rounded-full"
                  disabled={uploading !== null}
                  onClick={() => openPicker(req.type)}
                >
                  {uploading === req.type ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  {uploading === req.type ? "Uploading" : "Add"}
                </Button>
              )}
            </div>
          );
        })}

        {otherDocs.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Other documents received
            </p>
            {otherDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                <p className="text-sm text-foreground truncate">{d.filename}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Locked premium documents */}
        {lockedDocs.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Available with premium
            </p>
            {lockedDocs.map((req) => (
              <div
                key={req.type}
                className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{req.label}</p>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Premium
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload dropzone */}
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 py-10 px-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
        onClick={() => uploading === null && openPicker(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (uploading === null) upload(e.dataTransfer.files, null);
        }}
      >
        {uploading === "__dropzone" ? (
          <Loader2 className="h-8 w-8 text-primary mb-3 animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground/50 mb-3" />
        )}
        <p className="text-sm font-medium text-foreground">
          Drop files here or click to upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, JPG, PNG — max 25 MB per file
        </p>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Goes straight to your secure workspace — never send documents in chat.
        </p>
      </div>
    </div>
  );
}
