"use client";

/**
 * Documents, one group per return. Each group shows its count as blocks (2 of 3 accepted) and
 * whose turn it is; each document shows where it is in four steps (asked, sent, checked,
 * accepted), one state, and one action. Why the expert asked folds away; a document that
 * needs a new copy says why in full. Only "needs you" is coloured, so colour always means act.
 * Only documents someone asked for are listed by return; anything else the customer shared
 * sits under "Other documents you shared".
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronLeft, CircleAlert, FileText, Home, Landmark, LineChart, PiggyBank, Plane, ReceiptText, Search, ShieldCheck, Upload, type LucideIcon } from "lucide-react";
import type { CaseDetail, DocumentRequest } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hasCaptain } from "@/lib/captain";
import { TaskSheet, type Task } from "./task-sheet";
import { SideSheet } from "@/components/side-sheet";
import { listReadings, type DocReading } from "@/lib/residency";
import { PdfBody, pdfEyebrow } from "@/components/source/pdf-viewer";
import { mockFromReading } from "@/lib/mock-documents";
import type { PdfDoc } from "@/lib/mock-pdf";
import { CountryCode, Segs, TurnChip } from "./visual";

type Group = "fix" | "needed" | "checking" | "accepted";
type Bucket = "IN" | "US" | "BOTH";

const KIND: Record<string, { icon: LucideIcon; label: string }> = {
  "W-2": { icon: Briefcase, label: "Salary" },
  form_16: { icon: Briefcase, label: "Salary" },
  payslip: { icon: Briefcase, label: "Salary" },
  brokerage_statement: { icon: LineChart, label: "Investments" },
  portfolio_export: { icon: LineChart, label: "Investments" },
  mf_cas: { icon: LineChart, label: "Mutual funds" },
  "401k_statement": { icon: PiggyBank, label: "Retirement" },
  bank_statement: { icon: Landmark, label: "Bank" },
  interest_certificate: { icon: Landmark, label: "Interest" },
  rental_agreement: { icon: Home, label: "Rent" },
  property_document: { icon: Home, label: "Property" },
  passport: { icon: Plane, label: "Travel" },
  travel_history: { icon: Plane, label: "Travel" },
  prior_returns: { icon: ReceiptText, label: "Past returns" },
};
const kindOf = (t: string | null) => KIND[t ?? ""] ?? { icon: FileText, label: "Document" };

const groupOf = (r: DocumentRequest): Group => (r.status === "rejected" ? "fix" : r.status === "pending" ? "needed" : r.status === "received" ? "checking" : "accepted");
const ORDER: Record<Group, number> = { fix: 0, needed: 1, checking: 2, accepted: 3 };
const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });
const FOLD = 5;

export function DocumentRequests({ caseData, requests }: { caseData: CaseDetail; requests: DocumentRequest[] }) {
  const search = useSearchParams();
  const focus = Number(search.get("request"));
  const lead = hasCaptain(caseData.case_captain) ? caseData.case_captain : "Kiyos";
  const captain = lead.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);

  const open = requests.filter((r) => r.status === "pending" || r.status === "rejected");
  // A WhatsApp deep link (?request=ID) opens straight into that item's upload sheet.
  const linkedRequest = open.find((r) => r.id === focus);
  const [sheet, setSheet] = useState<Task | null>(linkedRequest ? { kind: "upload", request: linkedRequest } : null);
  const [fromLink, setFromLink] = useState(!!linkedRequest);
  const sheetId = sheet?.kind === "upload" ? sheet.request.id : null;
  const nextRequest = open.find((r) => r.id !== sheetId);
  const upload = (r: DocumentRequest) => {
    setFromLink(false);
    setSheet({ kind: "upload", request: r });
  };

  const [viewing, setViewing] = useState<DocReading | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [readings, setReadings] = useState<DocReading[]>([]);
  // A source link (?doc=ID) opens straight into what Kiyos read from that document.
  const docLink = Number(search.get("doc"));
  useEffect(() => {
    listReadings(caseData.id)
      .then((rs) => {
        setReadings(rs);
        const linked = docLink ? rs.find((x) => x.id === docLink) : null;
        if (linked) setViewing(linked);
      })
      .catch(() => setReadings([]));
  }, [caseData.id, requests, docLink]);
  const readingFor = (r: DocumentRequest) => readings.find((x) => x.id === r.document_id || (!!r.filename && x.filename === r.filename)) ?? null;
  const others = readings.filter((x) => !requests.some((r) => r.document_id === x.id || (!!r.filename && r.filename === x.filename)));

  // Built to grow: a search box once there are more than 8 documents, and accepted documents
  // fold after 5 per return (anything that needs the customer always shows in full).
  const [query, setQuery] = useState("");
  const [unfolded, setUnfolded] = useState<Bucket[]>([]);
  const q = query.trim().toLowerCase();
  const matches = (r: DocumentRequest) => !q || [r.title, r.filename, kindOf(r.doc_type).label].some((x) => x?.toLowerCase().includes(q));

  const bucketOf = (r: DocumentRequest): Bucket => (r.country === "IN" || r.country === "US" ? r.country : "BOTH");
  const buckets = (["IN", "US", "BOTH"] as Bucket[]).filter((b) => requests.some((r) => bucketOf(r) === b));
  const accepted = requests.filter((r) => r.status === "reviewed").length;
  const checking = requests.filter((r) => r.status === "received").length;

  const headline = [
    open.length ? `${open.length} ${open.length === 1 ? "needs" : "need"} you` : null,
    checking ? `${checking} with ${captain}` : null,
    `${accepted} accepted`,
    others.length ? `${others.length} more you shared` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">Documents</h1>
          <p className="mt-1.5 text-[15px]">
            {requests.length === 0 ? (
              <span className="text-muted-foreground">Nothing asked for yet.</span>
            ) : (
              headline.map((h, i) => (
                <span key={h} className={cn(i === 0 && open.length ? "font-semibold text-[#7A3F06]" : "text-muted-foreground")}>
                  {i > 0 && " · "}
                  {h}
                </span>
              ))
            )}
          </p>
        </div>
        {requests.length > 8 && (
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Find a document</span>
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a document, e.g. payslip" className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-[14px]" />
          </label>
        )}
      </section>

      {requests.length === 0 && (
        <p className="rounded-[14px] border bg-card px-5 py-6 text-[14px] text-muted-foreground">
          {captain} asks for each document with a note on why, and you upload it here. New asks also appear on your Overview.
        </p>
      )}

      {buckets.map((b) => {
        const all = requests.filter((r) => bucketOf(r) === b);
        const shown = all.filter(matches).sort((x, y) => ORDER[groupOf(x)] - ORDER[groupOf(y)]);
        if (!shown.length) return null;
        const done = all.filter((r) => r.status === "reviewed").length;
        const yours = all.some((r) => r.status === "pending" || r.status === "rejected");
        const cs = b === "BOTH" ? null : caseData.country_status?.[b];
        const acceptedRows = shown.filter((r) => groupOf(r) === "accepted");
        const folds = !q && !unfolded.includes(b) && acceptedRows.length > FOLD;
        const rows = folds ? shown.filter((r) => groupOf(r) !== "accepted").concat(acceptedRows.slice(0, FOLD)) : shown;
        return (
          <section key={b} aria-labelledby={`g-${b}`} className="overflow-hidden rounded-[14px] border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-4">
              <h2 id={`g-${b}`} className="flex flex-wrap items-center gap-2.5 text-[15px] font-semibold text-foreground">
                {b === "BOTH" ? "For both returns" : <CountryCode code={b} />}
                {cs?.filing?.split(" + ")[0] ?? (b === "IN" ? "India" : b === "US" ? "United States" : "")}
                {cs && (
                  <span className="text-[13px] font-normal text-muted-foreground">
                    {[cs.year, cs.due ? `due ${formatDate(cs.due, { day: "numeric", month: "short", year: "numeric" })}` : null].filter(Boolean).join(" · ")}
                  </span>
                )}
              </h2>
              <span className="flex flex-wrap items-center gap-3">
                <Segs done={done} total={all.length} pendingTone={yours ? "amber" : "none"} />
                <span className="text-[13px] tabular-nums text-foreground">
                  <b>
                    {done} of {all.length}
                  </b>{" "}
                  accepted
                </span>
                {yours ? <TurnChip yours name={caseData.client_name} /> : <TurnChip yours={false} name={lead} label={done === all.length ? "Nothing needed from you" : `With ${captain}`} />}
              </span>
            </div>
            <ul>
              {rows.map((r) => (
                <Row key={r.id} r={r} today={today} focused={r.id === focus} reading={readingFor(r)} captain={captain} onUpload={() => upload(r)} onView={setViewing} />
              ))}
            </ul>
            {folds && (
              <button type="button" onClick={() => setUnfolded((u) => [...u, b])} className="min-h-11 w-full border-t px-[22px] text-left text-[13px] font-medium text-primary">
                Show all {acceptedRows.length} accepted
              </button>
            )}
          </section>
        );
      })}
      {q && !requests.some(matches) && <p className="text-[13.5px] text-muted-foreground">No document matches “{query}”.</p>}

      {others.length > 0 && !q && (
        <section aria-labelledby="g-other" className="overflow-hidden rounded-[14px] border bg-card">
          <div className="px-[22px] py-3.5">
            <h2 id="g-other" className="text-[14px] font-semibold text-foreground">
              Other documents you shared
            </h2>
          </div>
          <ul>
            {others.map((x) => {
              const k = kindOf(x.doc_type);
              return (
                <li key={x.id} className="flex items-center gap-4 border-t px-[22px] py-3 opacity-85">
                  <k.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-foreground">{x.filename}</span>
                    {x.created_at && <span className="block text-[12px] text-muted-foreground">Shared {short(x.created_at)}</span>}
                  </span>
                  {x.extraction && (
                    <button type="button" aria-haspopup="dialog" onClick={() => setViewing(x)} className="inline-flex h-[30px] items-center rounded-lg border px-3 text-[12.5px] font-medium text-foreground hover:bg-muted">
                      View
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-[11.5px] text-muted-foreground">PDF, JPG or PNG up to 25 MB. Uploads go straight to your case; never send documents on WhatsApp.</p>

      {/* What Kiyos read, then the document itself, in the same panel with a Back link (one-panel rule). */}
      <SideSheet
        open={!!viewing}
        onClose={() => (setViewing(null), setPdf(null))}
        wide={!!pdf}
        eyebrow={pdf ? pdfEyebrow(pdf) : viewing?.extraction?.issuer ?? "What Kiyos read"}
        title={pdf ? pdf.title : viewing?.extraction?.title ?? viewing?.filename}
      >
        {pdf ? (
          <div className="space-y-4">
            <button onClick={() => setPdf(null)} className="-mt-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> What Kiyos read
            </button>
            <PdfBody doc={pdf} />
          </div>
        ) : (
          viewing?.extraction && (
            <div className="space-y-4 text-sm">
              {viewing.extraction.scan && (
                <p className={cn("flex items-center gap-1.5 text-[12.5px]", viewing.extraction.scan.status === "threat" ? "text-rose-700" : "text-emerald-700")}>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {viewing.extraction.scan.status === "threat" ? "Threat detected" : "Scanned · clean"} · {viewing.extraction.scan.engine}
                </p>
              )}
              <dl className="divide-y rounded-xl border">
                {(viewing.extraction.field_list ?? Object.entries(viewing.extraction.fields ?? {}).map(([label, value]) => ({ label, value: String(value), confidence: 1 }))).map((f, i) => (
                  <div key={i} className="flex justify-between gap-3 px-3 py-2 text-[13px]">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {f.value}
                      {typeof (f as { page?: number }).page === "number" ? <span className="ml-2 text-[11.5px] font-normal text-muted-foreground">p. {(f as { page?: number }).page}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              {viewing.extraction.effects?.length ? (
                <ul className="space-y-1.5">
                  {viewing.extraction.effects.map((e) => (
                    <li key={e} className="flex gap-2 text-[13px]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {e}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                onClick={() => {
                  const ex = viewing.extraction!;
                  const fields = ex.field_list ?? Object.entries(ex.fields ?? {}).map(([label, value]) => ({ label, value: String(value), confidence: 1 }));
                  setPdf(mockFromReading({ title: ex.title, issuer: ex.issuer, period: ex.period, pages: ex.pages, fields }, caseData.client_name));
                }}
                className="text-[14px] font-medium text-foreground hover:underline"
              >
                View the document →
              </button>
              {viewing.extraction.synthetic && <p className="text-[11.5px] text-muted-foreground">Prototype: sample document, reading simulated.</p>}
            </div>
          )
        )}
      </SideSheet>
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

/* ================================================================ one document */

const STEPS = ["Asked", "Sent", "Checked", "Accepted"] as const;

/** Where a document is in its four steps: filled is done, a ring is now, hollow is next. */
function Lifecycle({ group }: { group: Group }) {
  const now = group === "fix" || group === "needed" ? 1 : group === "checking" ? 2 : 4;
  return (
    <ol aria-label={`Progress: ${group === "accepted" ? "accepted" : `${(STEPS as readonly string[])[now]} next`}`} className="grid w-full grid-cols-4">
      {STEPS.map((s, i) => {
        const state = i < now ? "done" : i === now ? "now" : "next";
        const lineDone = i + 1 < now;
        return (
          <li key={s} className="relative pr-1 pt-[18px] text-[11.5px] text-muted-foreground">
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-[3px] z-[1] h-2.5 w-2.5 rounded-full border-2 bg-card",
                state === "done" && "border-primary bg-primary",
                state === "now" && (group === "fix" ? "border-rose-600 bg-rose-50" : group === "needed" ? "border-[#C9822B] bg-[#FBEFD9]" : "border-[#CFCABD] bg-muted"),
                state === "next" && "border-[#CFCABD]"
              )}
            />
            {i < STEPS.length - 1 && <span aria-hidden className={cn("absolute left-2.5 right-0 top-[7px] h-0.5", lineDone ? "bg-primary" : "bg-border")} />}
            {s}
          </li>
        );
      })}
    </ol>
  );
}

function Row({
  r,
  today,
  focused,
  reading,
  captain,
  onUpload,
  onView,
}: {
  r: DocumentRequest;
  today: string;
  focused: boolean;
  reading: DocReading | null;
  captain: string;
  onUpload: () => void;
  onView: (d: DocReading) => void;
}) {
  const group = groupOf(r);
  const k = kindOf(r.doc_type);
  const needsUpload = group === "fix" || group === "needed";
  const late = needsUpload && !!r.due_date && r.due_date < today;

  const pill =
    group === "fix" ? (
      <span className="inline-flex h-6 items-center rounded-md bg-rose-50 px-2 text-[12.5px] font-semibold text-rose-800">Needs a new copy</span>
    ) : group === "needed" ? (
      <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[12.5px] font-semibold", late ? "bg-rose-50 text-rose-800" : "bg-[#FBEFD9] text-[#7A3F06]")}>
        {late ? `Overdue · ${short(r.due_date!)}` : r.due_date ? `Your turn · ${short(r.due_date)}` : "Your turn"}
      </span>
    ) : group === "checking" ? (
      <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[12.5px] font-medium text-foreground">With {captain}</span>
    ) : (
      <span className="inline-flex h-6 items-center rounded-md bg-primary/10 px-2 text-[12.5px] font-medium text-primary">Accepted</span>
    );

  return (
    <li
      className={cn(
        "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t px-[22px] py-3 md:grid-cols-[24px_minmax(0,1fr)_260px_160px_96px]",
        group === "accepted" && "opacity-85",
        focused && "bg-[#25d366]/[0.07] shadow-[inset_3px_0_0_#25d366]"
      )}
    >
      <k.icon className={cn("h-[18px] w-[18px]", needsUpload ? "text-[#7A3F06]" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium leading-snug text-foreground">{r.title}</p>
        {group === "fix" && r.rejection_reason ? (
          <p className="mt-1 flex gap-1.5 text-[12.5px] text-rose-800">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {r.rejection_reason}
          </p>
        ) : (
          r.why && (
            <details className="mt-0.5">
              <summary className="cursor-pointer list-none text-[12px] font-medium text-primary [&::-webkit-details-marker]:hidden">Why {captain} asked</summary>
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{r.why}</p>
            </details>
          )
        )}
      </div>
      <div className="hidden md:block">
        <Lifecycle group={group} />
      </div>
      <div className="hidden md:block">{pill}</div>
      <div className="flex justify-end">
        {needsUpload ? (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onUpload}
            aria-label={group === "fix" ? `Upload a new copy of ${r.title}` : `Upload ${r.title}`}
            className={cn(
              "inline-flex h-[30px] items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium",
              group === "fix" || focused || r.due_date ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border text-foreground hover:bg-muted"
            )}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {group === "fix" ? "New copy" : "Upload"}
          </button>
        ) : reading?.extraction ? (
          <button type="button" aria-haspopup="dialog" onClick={() => onView(reading)} aria-label={`What Kiyos read from ${r.title}`} className="inline-flex h-[30px] items-center rounded-lg border px-3 text-[12.5px] font-medium text-foreground hover:bg-muted">
            View
          </button>
        ) : null}
      </div>
      {/* On phones the state sits under the title. */}
      <div className="col-start-2 md:hidden">{pill}</div>
    </li>
  );
}
