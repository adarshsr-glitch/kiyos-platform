"use client";

/**
 * Import rules from Kiyos's spreadsheet: upload (.xlsx or .csv), see every row checked, then
 * save the valid rows as a new rule version, pending validation. Imported rules are not used
 * to answer until the tax team validates them.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, Download, Upload } from "lucide-react";
import { SideSheet } from "@/components/side-sheet";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type Row = { row: number; id: string; jurisdiction: string; tax_year: string; category: string; section: string; summary: string; errors: string[] };
type Preview = { filename: string; rows: Row[]; valid: number; invalid: number; already_imported_as: number | null };
export type Version = { version: number; hash: string; created_at: string; source?: string; imported_by?: string; status?: string; rules?: Row[]; skipped?: number };

async function send<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Couldn't read the file");
  return data as T;
}

export function RulesImport({ versions }: { versions: Version[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ filename: string; content_b64: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(f: File) {
    setError(null);
    setPreview(null);
    const buf = new Uint8Array(await f.arrayBuffer());
    let bin = "";
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    const payload = { filename: f.name, content_b64: btoa(bin) };
    setFile(payload);
    setBusy(true);
    try {
      setPreview(await send<Preview>("/rules/import/preview", payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the file");
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!file) return;
    setBusy(true);
    try {
      const r = await send<{ version: number; imported: number; skipped: number }>("/rules/import/commit", { ...file, by: "Kiyos tax team" });
      toast.success(`Version ${r.version}: ${r.imported} rules imported, pending validation`);
      setOpen(false);
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Rule versions</h2>
          <p className="text-[13px] text-muted-foreground">Import Kiyos&apos;s rule spreadsheet. Each import is a new version; rules wait for the tax team&apos;s validation before Kiyos uses them.</p>
        </div>
        <div className="flex gap-2">
          <a href={`${BASE}/rules/import/sample.xlsx`} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] text-foreground hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Sample spreadsheet
          </a>
          <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground">
            <Upload className="h-3.5 w-3.5" /> Import rules
          </button>
        </div>
      </div>
      {versions.length > 0 ? (
        <ul className="divide-y text-[13.5px]">
          {versions.map((v) => (
            <li key={v.version} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="text-foreground">
                Version {v.version} · {v.source} · {v.rules?.length ?? 0} rules
                {v.skipped ? <span className="text-muted-foreground"> ({v.skipped} rows skipped)</span> : null}
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                <span className="mr-2 rounded bg-amber-50 px-1.5 py-px text-amber-900">{v.status === "pending_validation" ? "Pending validation" : v.status}</span>
                {v.imported_by} · {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · #{v.hash}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">No imports yet. The rules below are authored as files.</p>
      )}

      <SideSheet open={open} onClose={() => setOpen(false)} wide eyebrow="Import rules" title="Upload the rule spreadsheet">
        <div className="space-y-4 text-[13.5px]">
          <p className="text-muted-foreground">
            Columns: id, jurisdiction, tax_year, category, section, summary. Excel (.xlsx) or CSV. Every row is checked before anything is saved.
          </p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-muted-foreground hover:bg-muted/50">
            <Upload className="h-4 w-4" /> {file ? file.filename : "Choose a file"}
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          </label>
          {busy && !preview && <p className="text-muted-foreground">Reading the file…</p>}
          {error && <p className="text-rose-700">{error}</p>}
          {preview && (
            <>
              <p className="text-foreground">
                <b>{preview.valid}</b> rows ready to import · <b>{preview.invalid}</b> with problems (skipped)
                {preview.already_imported_as && <span className="text-amber-800"> · already imported as version {preview.already_imported_as}</span>}
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      {["Row", "ID", "Country", "Year", "Category", "Section", "Check"].map((h) => (
                        <th key={h} className="px-2.5 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.row} className={cn("border-t align-top", r.errors.length && "bg-rose-50/60")}>
                        <td className="px-2.5 py-2 tabular-nums">{r.row}</td>
                        <td className="px-2.5 py-2 font-mono">{r.id}</td>
                        <td className="px-2.5 py-2">{r.jurisdiction}</td>
                        <td className="px-2.5 py-2">{r.tax_year}</td>
                        <td className="px-2.5 py-2">{r.category}</td>
                        <td className="px-2.5 py-2">{r.section}</td>
                        <td className="px-2.5 py-2">
                          {r.errors.length ? (
                            <span className="flex gap-1 text-rose-700"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.errors.join("; ")}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={commit} disabled={busy || !preview.valid || !!preview.already_imported_as} className="h-10 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground disabled:opacity-50">
                Import {preview.valid} valid rule{preview.valid === 1 ? "" : "s"} as a new version
              </button>
            </>
          )}
        </div>
      </SideSheet>
    </section>
  );
}
