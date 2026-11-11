import type { CaseDetail } from "@/lib/types";
import { Jurisdictions } from "./country-chip";
import { Calendar, Briefcase, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function residencyFromCase(c: CaseDetail): string | null {
  const t = c.topics.find(
    (x) => x.topic_key === "rnor" || x.topic_key === "ind_residency"
  );
  if (!t) return null;
  if (t.conclusion?.toLowerCase().includes("rnor")) return "RNOR";
  if (t.conclusion?.toLowerCase().includes(" nr")) return "NR";
  if (t.conclusion?.toLowerCase().includes("ror")) return "ROR";
  return null;
}

function nextDeadline(c: CaseDetail): { label: string; date: string } | null {
  const candidates: { label: string; date: string }[] = [];
  for (const i of c.action_items) {
    if (i.status !== "done" && i.due_date)
      candidates.push({ label: i.title, date: i.due_date });
  }
  for (const n of c.notices) {
    if (n.status !== "resolved" && n.deadline)
      candidates.push({ label: `Notice: ${n.subject}`, date: n.deadline });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return candidates[0];
}

export function CaseHero({ caseData }: { caseData: CaseDetail }) {
  const residency = residencyFromCase(caseData);
  const nextD = nextDeadline(caseData);
  const openItems = caseData.action_items.filter((i) => i.status !== "done").length;
  const openTopics = caseData.topics.filter((t) => t.status !== "resolved").length;

  return (
    <div className="border-b bg-gradient-to-b from-muted/40 to-background px-6 py-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-2">
            {caseData.tax_year ? `Tax year ${caseData.tax_year}` : "Case"}
          </p>
          <h1 className="font-serif text-3xl font-medium leading-tight text-foreground">
            {caseData.client_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{caseData.name}</p>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {residency && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  residency === "RNOR" && "bg-emerald-100 text-emerald-800",
                  residency === "NR" && "bg-blue-100 text-blue-800",
                  residency === "ROR" && "bg-amber-100 text-amber-800"
                )}
              >
                {residency}
              </span>
            )}
            <Jurisdictions value={caseData.jurisdictions} />
            {caseData.arrival_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Arrival {caseData.arrival_date}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              {caseData.case_captain}
            </span>
          </div>
        </div>

        <div className="flex items-stretch gap-3 flex-wrap">
          <HeroStat label="Open topics" value={openTopics} tone="primary" />
          <HeroStat label="Open items" value={openItems} tone="amber" />
          {nextD ? (
            <div className="rounded-lg border bg-card px-4 py-3 min-w-[220px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Next deadline
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{nextD.date}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {nextD.label}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card px-4 py-3 min-w-[220px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Next deadline
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground italic">None pending</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 min-w-[110px]",
        tone === "primary" && "border-primary/30 bg-primary/5",
        tone === "amber" && "border-amber-300 bg-amber-50"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-2xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "amber" && "text-amber-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
