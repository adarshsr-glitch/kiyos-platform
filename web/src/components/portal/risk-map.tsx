import Link from "next/link";
import { PdfAttachment } from "./pdf-attachment";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { FreeUsage, InitialScan } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Section, PageHeader, inr } from "./kit";
import { whatsappHref, whatsappTarget } from "@/lib/whatsapp";
import { ResidencyClock } from "@/components/charts/residency-clock";
import { RangeBars } from "@/components/charts/range-bars";
import { MoneyChart } from "@/components/charts/money-chart";
import { CrossBorderMap } from "./assessment/cross-border-map";
import type { Holding, Residency } from "@/lib/residency";

const CONFIDENCE: Record<string, { label: string; tone: "green" | "amber" | "red"; note: string }> = {
  medium: { label: "Medium", tone: "green", note: "You answered every question. An expert still confirms it." },
  partial: { label: "Partial", tone: "amber", note: "A few answers were 'not sure' — fine for a first scan." },
  low: { label: "Low", tone: "red", note: "Several unknowns. An expert would fill these in first." },
};

/** The free five-minute assessment: bounded, evidence-linked, priced — never a personal position. */
export function RiskMap({
  scan,
  usage,
  residency,
  holdings,
}: {
  scan: InitialScan | null;
  usage: FreeUsage | null;
  residency?: Residency | null;
  holdings?: Holding[];
}) {
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
  const left = usage ? Math.max(usage.generic_limit - usage.generic_used, 0) : 5;

  return (
    <div>
      <PageHeader
        eyebrow={`Initial scan · ${formatDate(scan.created_at, { day: "numeric", month: "short", year: "numeric" })}`}
        title="Your India–US assessment"
        meta={
          <>
            Preliminary, from your {answered} answers on WhatsApp.{" "}
            <span className="text-foreground">A first look, not a personal tax position.</span>
          </>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
          <PdfAttachment variant="button" label="Download PDF" />
          <Link
            href="/portal/plans"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Compare plans <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl bg-card px-6 py-7 shadow-[0_0_0_1px_hsl(var(--border))] sm:px-8">
            <CrossBorderMap scan={scan} />
          </section>
          {residency && residency.india.length > 0 && residency.stays.length + residency.facts.length > 0 ? (
            <Section title="Your residency, year by year">
              <ResidencyClock data={residency} />
            </Section>
          ) : (
            <Link
              href="/portal/onboarding"
              className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 hover:bg-primary/10"
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">Add your travel and money details</span>
                <span className="block text-[13px] text-muted-foreground">
                  Your trips decide your residency in each country. Kiyos calculates it year by year from them.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          )}


          {holdings && holdings.length > 0 && (
            <Section title="Where your money sits">
              {holdings.some((h) => typeof h.amount === "number") ? <MoneyChart holdings={holdings} /> : <RangeBars holdings={holdings} />}
            </Section>
          )}
        </div>

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
              href="/portal/plans"
              className="mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              See what each plan covers <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Section>

          <Section title="How sure this is">
            <p className="text-[14px] font-medium text-foreground">{conf.label} confidence</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{conf.note}</p>
          </Section>

          <div className="flex gap-3 rounded-2xl border border-dashed px-4 py-3">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#00a884]" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{left} of {usage?.generic_limit ?? 5} free questions left.</span> Ask anything general
              on WhatsApp, like “What is RNOR?”. Questions about your own situation need a plan — an expert checks every
              personal answer.
              <Link href={whatsappHref} target={whatsappTarget} className="mt-2 flex items-center gap-1 font-semibold text-primary">
                Ask on WhatsApp <ArrowRight className="h-3.5 w-3.5" />
              </Link>
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
