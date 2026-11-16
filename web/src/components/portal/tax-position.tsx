"use client";

import { useState } from "react";
import { BadgeCheck, ChevronDown, CircleDashed, CircleDot, CheckCircle2 } from "lucide-react";
import type { CaseDetail, InitialScan, TaxTopic } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Pill, Section } from "./kit";

const CONFIDENCE: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" }> = {
  confirmed: { label: "Confirmed", tone: "green" },
  likely: { label: "Likely", tone: "blue" },
  incomplete: { label: "Incomplete", tone: "amber" },
  review_needed: { label: "Expert review", tone: "red" },
};

const STATUS = {
  resolved: { icon: CheckCircle2, className: "text-emerald-600", label: "Settled" },
  in_progress: { icon: CircleDot, className: "text-amber-500", label: "In progress" },
  open: { icon: CircleDashed, className: "text-muted-foreground", label: "Not started" },
} as const;

/** PRD §6 tax topic: position in each country, conclusion, confidence, owner — reviewed. */
export function TaxPosition({ caseData, scan }: { caseData: CaseDetail; scan: InitialScan | null }) {
  const signed = caseData.assessments.filter((a) => a.status === "signed_off");
  const india = caseData.reviewers?.find((r) => r.country === "IN");
  const us = caseData.reviewers?.find((r) => r.country === "US");
  const order: TaxTopic["status"][] = ["in_progress", "open", "resolved"];
  const topics = [...caseData.topics].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div>
      <PageHeader
        eyebrow={`Tax position${caseData.tax_year ? ` · FY ${caseData.tax_year}` : ""}`}
        title="Where you stand, and why"
        meta={
          india && us
            ? `Reviewed by ${india.name} (${india.qualification}, India) and ${us.name} (${us.qualification}, US). ${caseData.case_captain} owns your case.`
            : `${caseData.case_captain} owns your case.`
        }
      />

      {signed.length > 0 && (
        <div className="mb-5 space-y-2">
          {signed.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-foreground">{a.headline}</p>
                <p className="mt-0.5 text-xs text-emerald-900/80">
                  Signed off by {caseData.case_captain} · {formatDate(a.updated_at, { day: "numeric", month: "short", year: "numeric" })}
                  {a.derivation_trail?.length ? ` · ${a.derivation_trail.length} rule${a.derivation_trail.length > 1 ? "s" : ""} applied` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Section title="Your tax questions" count={topics.length} flush>
        {topics.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {caseData.case_captain} is turning your initial scan into a list of questions to settle. You&apos;ll see each
            one here with its owner and next update.
          </p>
        ) : (
          <ul className="divide-y">
            {topics.map((t) => (
              <TopicRow key={t.id} topic={t} />
            ))}
          </ul>
        )}
      </Section>

      {scan && (
        <p className="mt-4 text-xs text-muted-foreground">
          Started from your initial scan on {formatDate(scan.created_at, { day: "numeric", month: "short" })} —{" "}
          {Object.keys(scan.answers).length} answers on WhatsApp.
        </p>
      )}
    </div>
  );
}

function TopicRow({ topic: t }: { topic: TaxTopic }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[t.status];
  const c = CONFIDENCE[t.confidence] ?? CONFIDENCE.incomplete;
  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-muted/30">
        <s.icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.className)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-medium text-foreground">{t.title}</p>
            <Pill tone={c.tone}>{c.label}</Pill>
          </div>
          {t.conclusion && <p className={cn("mt-0.5 text-[13px] text-muted-foreground", !open && "line-clamp-1")}>{t.conclusion}</p>}
        </div>
        <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
          <p className={s.className}>{s.label}</p>
          {t.owner && <p>{t.owner}</p>}
        </div>
        <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 px-5 pb-4 pl-12 md:grid-cols-2">
          <Position flag="🇮🇳" country="India" text={t.india_position} />
          <Position flag="🇺🇸" country="United States" text={t.us_position} />
          {t.next_action && t.status !== "resolved" && (
            <p className="text-[13px] text-foreground md:col-span-2">
              <span className="text-muted-foreground">Next: </span>
              {t.next_action}
              {t.owner && <span className="text-muted-foreground"> · {t.owner}</span>}
              {t.due_date && <span className="text-muted-foreground"> · by {formatDate(t.due_date, { day: "numeric", month: "short", year: "numeric" })}</span>}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Position({ flag, country, text }: { flag: string; country: string; text: string | null }) {
  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3">
      <p className="text-[11px] font-semibold text-muted-foreground">
        <span aria-hidden>{flag}</span> {country}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-foreground">{text ?? "No position yet."}</p>
    </div>
  );
}
