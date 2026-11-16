import Link from "next/link";
import { ArrowRight, CircleHelp, MessageCircle } from "lucide-react";
import type { FreeUsage, InitialScan, RiskRow } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { COUNTRY, Pill, Section, PageHeader, inr } from "./kit";

const GROUPS: { code: RiskRow["country"]; title: string }[] = [
  { code: "BOTH", title: "Across both countries" },
  { code: "IN", title: "India" },
  { code: "US", title: "United States" },
];

const CONFIDENCE: Record<string, { label: string; tone: "green" | "amber" | "red"; note: string }> = {
  medium: { label: "Medium", tone: "green", note: "You answered every question. An expert still confirms it." },
  partial: { label: "Partial", tone: "amber", note: "A few answers were 'not sure' — fine for a first scan." },
  low: { label: "Low", tone: "red", note: "Several unknowns. An expert would fill these in first." },
};

/** The free five-minute assessment: bounded, evidence-linked, priced — never a personal position. */
export function RiskMap({ scan, usage }: { scan: InitialScan | null; usage: FreeUsage | null }) {
  if (!scan) {
    return (
      <PageHeader
        title="Your risk map"
        meta="Finish the five-minute check on WhatsApp and your risk map appears here."
      />
    );
  }
  const conf = CONFIDENCE[scan.confidence] ?? CONFIDENCE.partial;
  const answered = Object.keys(scan.answers).length;
  const extras = scan.rows.filter((r) => r.priced_separately);
  const left = usage ? Math.max(usage.generic_limit - usage.generic_used, 0) : 3;

  return (
    <div>
      <PageHeader
        eyebrow={`Initial scan · ${formatDate(scan.created_at, { day: "numeric", month: "short", year: "numeric" })}`}
        title="Your India–US risk map"
        meta={
          <>
            {scan.rows.length} areas to look at, from your {answered} answers on WhatsApp.{" "}
            <span className="text-foreground">A first scan, not a personal tax opinion.</span>
          </>
        }
        actions={
          <Link
            href="/portal/upgrade"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Compare plans <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Section title="What likely needs attention" count={scan.rows.length} flush>
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_84px] gap-4 border-b px-5 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Area</span>
            <span>Your answer</span>
            <span className="text-right">Confidence</span>
          </div>
          {GROUPS.map((g) => {
            const rows = scan.rows.filter((r) => r.country === g.code);
            if (!rows.length) return null;
            return (
              <div key={g.code}>
                <p className="flex items-center gap-1.5 bg-muted/40 px-5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span aria-hidden>{COUNTRY[g.code].flag}</span>
                  {g.title}
                </p>
                <ul className="divide-y">
                  {rows.map((r) => (
                    <li key={r.area} className="grid gap-2 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_170px_84px] md:gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{r.area}</p>
                        <p className="mt-0.5 text-[15px] font-medium leading-snug text-foreground">{r.finding}</p>
                        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{r.why}</p>
                      </div>
                      <div className="text-[13px]">
                        <p className="text-[11px] text-muted-foreground md:hidden">Your answer</p>
                        <p className="rounded-md bg-muted/60 px-2 py-1 text-foreground" title={r.input_question}>
                          “{r.input}”
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{r.input_question}</p>
                      </div>
                      <div className="md:text-right">
                        <Pill tone={r.confidence === "likely" ? "green" : "amber"}>
                          {r.confidence === "likely" ? "Likely" : "Needs detail"}
                        </Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Section>

        <div className="space-y-5">
          <Section title="Indicative price">
            <p className="font-serif text-[26px] font-medium tabular-nums text-foreground">
              {inr(scan.price_low_inr)}–{inr(scan.price_high_inr)}
            </p>
            <p className="text-xs text-muted-foreground">
              {scan.household === "couple" ? "Couple" : "Individual"} · incl. 18% GST · one India and one US filing cycle
            </p>
            {extras.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {extras.map((e) => sentenceCase(e.area)).join(" and ")} work is quoted separately by an expert after a
                short review — never added silently.
              </p>
            )}
            <Link
              href="/portal/upgrade"
              className="mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              See what each plan covers <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Section>

          <Section title="Still unknown" count={scan.missing.length}>
            <ul className="space-y-2">
              {scan.missing.map((m) => (
                <li key={m} className="flex gap-2 text-[13px] text-foreground">
                  <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {m}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t pt-3">
              <Pill tone={conf.tone}>Confidence: {conf.label}</Pill>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{conf.note}</p>
          </Section>

          <div className="flex gap-3 rounded-2xl border border-dashed px-4 py-3">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#00a884]" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{left} of 3 free questions left.</span> Ask anything general
              on WhatsApp, like “What is RNOR?”. Questions about your own situation need a plan — an expert checks every
              personal answer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Indian property" stays capitalised; "Retirement accounts" becomes "retirement accounts". */
function sentenceCase(area: string) {
  return /^(Indian|US|India)\b/.test(area) ? area : area.charAt(0).toLowerCase() + area.slice(1);
}
