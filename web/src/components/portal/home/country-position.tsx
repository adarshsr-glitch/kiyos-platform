/**
 * Your position: India and US side by side. Each country follows the same chain:
 * status this year → where it comes from (travel record, expert review, or not yet
 * reviewed) → the return and its date → how many of its documents are accepted →
 * money confirmed by documents. Nothing here is estimated: missing pieces say so.
 */

import Link from "next/link";
import { ArrowRight, Check, CircleDashed, CircleDot } from "lucide-react";
import type { CaseDetail, DocumentRequest } from "@/lib/types";
import type { Holding, Residency, ResidencyYear } from "@/lib/residency";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Code = "IN" | "US";

const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };

const LONG: Record<string, string> = {
  NR: "Non-resident",
  RNOR: "Resident but not ordinarily resident",
  ROR: "Resident and ordinarily resident",
  RESIDENT: "Resident",
  DUAL: "Resident for part of the year",
  NONRESIDENT: "Non-resident",
};
const SHORT: Record<string, string> = { NR: "NR", RNOR: "RNOR", ROR: "ROR", RESIDENT: "Resident", DUAL: "Dual-status", NONRESIDENT: "Non-resident" };
const TONE: Record<string, string> = {
  NR: "bg-sky-100 text-sky-900", NONRESIDENT: "bg-sky-100 text-sky-900",
  RNOR: "bg-violet-100 text-violet-900", DUAL: "bg-violet-100 text-violet-900",
  ROR: "bg-emerald-100 text-emerald-900", RESIDENT: "bg-emerald-100 text-emerald-900",
};

export function CountryPosition({
  caseData,
  residency,
  requests,
  expert,
}: {
  caseData: CaseDetail;
  residency: Residency | null;
  requests: DocumentRequest[];
  /** Expert view: same content, without links into the customer's workspace. */
  expert?: boolean;
  /** No longer drawn here (assets have their own section); kept for callers. */
  holdings?: Holding[];
}) {
  const hasRecord = !!residency && (residency.stays.length > 0 || residency.facts.length > 0);
  return (
    // Both columns share six rows (header, status, review, return, documents, link), so
    // each row lines up across India and the US whatever its content.
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border bg-card md:grid-cols-2 md:grid-rows-[repeat(6,auto)] md:gap-y-4 md:divide-x">
      {(["IN", "US"] as const).map((code, i) => (
        <Country
          key={code}
          code={code}
          caseData={caseData}
          years={hasRecord ? (code === "IN" ? residency!.india : residency!.us) : []}
          reviewed={residency?.reviewed[code]}
          requests={requests.filter((r) => r.country === code || r.country === "BOTH")}
          expert={expert}
          className={cn(i === 1 && "border-t md:border-t-0")}
        />
      ))}
    </div>
  );
}

function Country({
  code,
  caseData,
  years,
  reviewed,
  requests,
  expert,
  className,
}: {
  expert?: boolean;
  code: Code;
  caseData: CaseDetail;
  years: ResidencyYear[];
  reviewed?: { by: string; on: string | null; stale?: boolean };
  requests: DocumentRequest[];
  className?: string;
}) {
  const cs = caseData.country_status?.[code];
  const current = years.find((y) => y.current) ?? years[0];
  // The year that matters next: the first projected year with a different status, if any.
  const next = years.find((y) => y.projected && !y.current && current && y.status !== current.status);
  const headline = current ? current.status : cs?.status ?? null;
  const yearLabel = current ? current.year : cs?.year;

  // One expert owns the case: provenance says whether it was reviewed, not by which specialist.
  const reviewBy = reviewed?.by ?? cs?.reviewed_by;
  const on = reviewed?.on ? ` · ${formatDate(reviewed.on, { day: "numeric", month: "short" })}` : "";
  const provenance = reviewed?.stale
    ? { tone: "amber", text: `Expert-reviewed${on}. Being rechecked after your latest change` }
    : reviewBy
      ? { tone: "green", text: `Expert-reviewed${on}` }
      : current
        ? { tone: "amber", text: "Calculated from your travel record. Not yet reviewed by an expert" }
        : cs?.status
          ? { tone: "amber", text: "Set by your expert. Final review pending" }
          : null;

  const docs = requests.map((r) => ({
    id: r.id,
    title: r.title,
    state: r.status === "reviewed" ? "accepted" : r.status === "received" ? "checking" : r.status === "rejected" ? "redo" : "needed",
  }));
  const accepted = docs.filter((d) => d.state === "accepted").length;

  return (
    <section className={cn("flex min-w-0 flex-col gap-4 p-5 sm:p-6 md:row-span-6 md:grid md:grid-rows-subgrid md:gap-y-4", className)} aria-label={NAME[code]}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <span aria-hidden className="text-lg leading-none">{FLAG[code]}</span>
          {NAME[code]}
        </h3>
        {yearLabel && <span className="text-[12px] text-muted-foreground">{code === "IN" ? "Financial year" : "Tax year"} {yearLabel.replace(/^(FY|Tax year)\s+/i, "")}</span>}
      </header>

      {headline ? (
        <div>
          <p className="font-serif text-[26px] leading-tight text-foreground">{SHORT[headline] ?? headline}</p>
          {(() => {
            const long = current ? LONG[headline] : cs?.label ?? LONG[headline];
            return long && long !== (SHORT[headline] ?? headline) ? <p className="text-[13px] text-muted-foreground">{long}</p> : null;
          })()}
          {years.length > 1 && (
            <ol className="mt-3 flex gap-1.5" aria-label="Status by year">
              {years.map((y) => (
                <li key={y.year} className={cn("min-w-0 flex-1 rounded-md px-2 py-1.5", TONE[y.status], y.projected && !y.current && "opacity-70")} title={`${y.year}: ${y.label}, ${y.days} days`}>
                  <span className="block truncate text-[10.5px] font-medium opacity-80">{y.year.replace("FY ", "")}{y.current ? " · now" : y.projected ? " · ahead" : ""}</span>
                  <span className="block truncate text-[12px] font-semibold">{SHORT[y.status]}</span>
                </li>
              ))}
            </ol>
          )}
          {next && (
            <p className="mt-2 text-[12.5px] text-foreground">
              Becomes <b>{SHORT[next.status]}</b> in {next.year}, from your planned return.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[14px] text-muted-foreground">
          Not worked out yet. {caseData.case_captain.split(" ")[0]} sets out your {NAME[code]} position once your travel dates and documents are in.
        </p>
      )}

      {!provenance ? <div aria-hidden /> : (
        <p className={cn("flex items-start gap-1.5 text-[12.5px]", provenance.tone === "green" ? "text-emerald-800" : "text-amber-800")}>
          {provenance.tone === "green" ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {provenance.text}
        </p>
      )}

      {!cs?.filing ? <div aria-hidden /> : (
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 border-t pt-4 text-[13px]">
          <dt className="text-muted-foreground">Return</dt>
          <dd className="text-foreground">{cs.filing}</dd>
          <dt className="text-muted-foreground">Due</dt>
          <dd className="text-foreground">{formatDate(cs.due, { day: "numeric", month: "short", year: "numeric" })}</dd>
          {cs.state && (
            <>
              <dt className="text-muted-foreground">Stage</dt>
              <dd className="text-foreground">{cs.state}</dd>
            </>
          )}
        </dl>
      )}

      {docs.length === 0 ? <div aria-hidden /> : (
        <p className="flex items-center justify-between gap-3 border-t pt-4 text-[13px]">
          <span className="flex items-center gap-1.5 text-foreground">
            {accepted === docs.length ? <Check className="h-4 w-4 text-emerald-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
            <span className="tabular-nums">{accepted} of {docs.length}</span> documents accepted
          </span>
          {!expert && <Link href="/portal/documents" className="shrink-0 font-medium text-primary hover:underline">View documents</Link>}
        </p>
      )}

      {!headline || expert ? <div aria-hidden /> : <Link href="/portal/tax-position" className="mt-auto inline-flex items-center gap-1 self-start text-[13px] font-medium text-primary hover:underline md:mt-0">
        How this was worked out <ArrowRight className="h-3.5 w-3.5" />
      </Link>}
    </section>
  );
}
