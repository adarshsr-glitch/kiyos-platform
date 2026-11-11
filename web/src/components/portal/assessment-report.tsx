import type { Assessment, TaxTopic } from "@/lib/types";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RULE_ID_RE = /\b[A-Z]{2,4}-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g;

function ruleChips(text: string): React.ReactNode {
  const parts: (string | { rule: string })[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(RULE_ID_RE);
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ rule: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return text;
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <span
        key={i}
        className="inline-flex items-center rounded border border-primary/20 bg-primary/5 px-1 py-0 font-mono text-[10px] text-primary mx-0.5"
      >
        {p.rule}
      </span>
    )
  );
}

export function AssessmentReport({
  assessments,
  topics,
}: {
  assessments: Assessment[];
  topics: TaxTopic[];
}) {
  const confirmedTopics = topics.filter(
    (t) => t.confidence === "confirmed" || t.confidence === "likely"
  );

  return (
    <div className="space-y-6">
      {assessments.map((a) => (
        <div key={a.id} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h3 className="font-serif text-lg font-medium text-foreground leading-snug">
              {a.headline}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] shrink-0",
                a.status === "signed_off" &&
                  "border-emerald-300 text-emerald-800",
                a.status === "in_review" && "border-amber-300 text-amber-800",
                a.status === "draft" && "border-slate-300 text-slate-700"
              )}
            >
              {a.status.replace("_", " ")}
            </Badge>
          </div>
          {a.amount != null && (
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {a.currency === "INR" ? "₹" : "$"}
              {a.amount.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">
                {a.currency}
              </span>
            </p>
          )}
          {a.derivation_trail && a.derivation_trail.length > 0 && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              {ruleChips(
                a.derivation_trail.map((s) => s.summary).join(". ") + "."
              )}
            </p>
          )}
        </div>
      ))}

      {confirmedTopics.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Key findings
          </h3>
          <ul className="space-y-2">
            {confirmedTopics.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <ConfidenceBadge
                  level={t.confidence}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t.title}
                  </p>
                  {t.conclusion && (
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {t.conclusion}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
