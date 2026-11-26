"use client";

/**
 * Upload-and-read for a requested document. In this prototype the "files" are
 * synthetic samples generated for the customer (no Finder dialog), and reading is
 * simulated by the API. What's shown is what the API returned: the fields read
 * from the document, how sure Kiyos is of each, and what changed on the case.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, FileText, Loader2, ScanText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { listSamples, uploadSample, type Reading, type SampleFile } from "@/lib/residency";

type Stage = "pick" | "uploading" | "scanning" | "reading" | "done" | "error";

export function DocumentReader({
  caseId,
  docType,
  requestId,
  by = "customer",
  onDone,
}: {
  caseId: number;
  docType: string | null;
  requestId?: number | null;
  by?: string;
  onDone?: (r: Reading) => void;
}) {
  const [files, setFiles] = useState<SampleFile[] | null>(null);
  const [chosen, setChosen] = useState<SampleFile | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [result, setResult] = useState<Reading | null>(null);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSamples(caseId, docType).then(setFiles).catch(() => setFiles([]));
  }, [caseId, docType]);

  // Reveal the fields the API returned one by one, as they're "read" off the page.
  useEffect(() => {
    if (stage !== "reading" || !result) return;
    if (shown >= result.fields.length) {
      const t = setTimeout(() => setStage("done"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), 260);
    return () => clearTimeout(t);
  }, [stage, shown, result]);

  async function go(file: SampleFile) {
    setChosen(file);
    setStage("uploading");
    try {
      const r = await uploadSample(caseId, file.doc_type, requestId, by);
      setResult(r);
      setShown(0);
      // The file is checked for malware before anything reads it (S3 + GuardDuty in the product).
      setStage("scanning");
      setTimeout(() => setStage("reading"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload didn't finish");
      setStage("error");
    }
  }

  useEffect(() => {
    if (stage === "done" && result) onDone?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (stage === "pick") {
    return (
      <div className="space-y-3">
        <p className="text-[13px] font-medium text-foreground">Choose the file</p>
        {!files ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your files…</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.filename}>
                <button onClick={() => go(f)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <span className="flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-rose-50 text-[9px] font-bold text-rose-700 ring-1 ring-rose-200">
                    <FileText className="h-4 w-4" />PDF
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.filename}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{f.title} · {f.pages} page{f.pages > 1 ? "s" : ""} · {f.size_kb} KB</span>
                  </span>
                  <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground">Upload</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" /> Prototype: sample documents stand in for your own files, and reading them is simulated.
        </p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
        <p className="font-semibold">That didn&apos;t work</p>
        <p className="mt-1">{error}</p>
        <button onClick={() => setStage("pick")} className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
        {[
          { k: "uploading", label: "Uploaded" },
          { k: "scanning", label: stage === "scanning" ? "Scanning for malware" : stage === "reading" || stage === "done" ? "Scanned · clean" : "Malware scan" },
          { k: "reading", label: `Reading ${result?.pages ?? ""} page${(result?.pages ?? 2) > 1 ? "s" : ""}` },
          { k: "done", label: "Checked against your details" },
        ].map((s, i) => {
          const order = ["uploading", "scanning", "reading", "done"];
          const at = order.indexOf(stage);
          const done = at > i || stage === "done";
          return (
            <li key={s.k} className={cn("flex items-center gap-1.5", done ? "text-foreground" : at === i ? "font-medium text-foreground" : "text-muted-foreground")}>
              {done ? <Check className="h-3.5 w-3.5 text-primary" /> : at === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border" />}
              {s.label}
            </li>
          );
        })}
      </ol>

      <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b bg-[#fafaf7] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{result?.issuer ?? chosen?.issuer}</p>
            <p className="truncate text-sm font-semibold">{result?.title ?? chosen?.title}</p>
            {result && <p className="text-[11.5px] text-muted-foreground">{result.period}</p>}
          </div>
          <ScanText className={cn("h-5 w-5 shrink-0 text-primary", stage === "reading" && "animate-pulse")} />
        </div>
        {stage === "uploading" ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading {chosen?.filename}…</div>
        ) : (
          <dl className="divide-y">
            {result?.fields.map((f, i) => (
              <div key={f.label} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-[13px] transition-all duration-300", i < shown ? "opacity-100" : "opacity-15", i === shown - 1 && stage === "reading" && "bg-primary/5")}>
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="flex items-center gap-2 text-right font-medium tabular-nums">
                  {f.value}
                  {i < shown && (
                    <span className={cn("rounded px-1 text-[10px] font-medium", f.confidence >= 0.95 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")} title="How sure Kiyos is of this reading">
                      {Math.round(f.confidence * 100)}%
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {stage === "done" && result && (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold">What Kiyos did with it</p>
          <ul className="space-y-1.5">
            {result.effects.map((e) => (
              <li key={e} className="flex gap-2 text-[13px]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {e}</li>
            ))}
          </ul>
          {result.mismatch && (
            <div className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-950">
              <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> {result.mismatch.title} doesn&apos;t match</p>
              <p className="mt-1">You told us {result.mismatch.stated.replace(/ \(.*\)$/, "")}. The document shows {result.mismatch.found.replace(/ \(.*\)$/, "")}.</p>
              <p className="mt-1 text-amber-900/80">{result.mismatch.effect}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
