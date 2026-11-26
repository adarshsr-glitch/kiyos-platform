"use client";

/**
 * "Your tax this year": only what the expert has entered. Per country, what is left to pay
 * (or due back), the liability and what is already paid, the next payment, and who entered
 * it and when. Below it, the expert's ways to save: each an option set in law, with their
 * reason, what it could save and by when, and a way to ask them about it. Kiyos works none
 * of this out; until the expert enters a figure, the customer sees that it is coming.
 */

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, MessageCircleQuestion } from "lucide-react";
import { askCaptain, type Saving } from "@/lib/residency";
import { balanceOf, balanceText, type TaxEstimate } from "@/lib/position";
import { formatDate, formatMoneyCompact } from "@/lib/format";
import { Cite } from "@/components/source/cite";
import { cn } from "@/lib/utils";

type Code = "IN" | "US";
const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const TONE = { owed: "text-amber-800", refund: "text-emerald-700", neutral: "text-foreground" } as const;
const d = (s: string | null | undefined) => (s ? formatDate(s, { day: "numeric", month: "short", year: "numeric" }) : null);

export function TaxAndSavings({
  caseId,
  customer,
  captain,
  estimates,
  savings,
}: {
  caseId: number;
  customer: string;
  captain: string;
  estimates: Partial<Record<Code, TaxEstimate>>;
  savings: Saving[];
}) {
  const first = captain.split(" ")[0];
  const total = (cur: "INR" | "USD") => savings.filter((s) => s.currency === cur && s.amount).reduce((a, s) => a + (s.amount ?? 0), 0);
  return (
    <div className="rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))]">
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x">
        {(["IN", "US"] as Code[]).map((c, i) => (
          <Estimate key={c} code={c} e={estimates[c] ?? null} first={first} className={cn(i === 1 && "border-t md:border-t-0")} />
        ))}
      </div>

      <section id="h-save" aria-labelledby="h-save-title" className="border-t px-6 py-6 sm:px-8">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="h-save-title" className="text-[16px] font-semibold text-foreground">Ways to save, from {first}</h3>
          {savings.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              Could save about {[total("INR") && formatMoneyCompact(total("INR"), "INR"), total("USD") && formatMoneyCompact(total("USD"), "USD")].filter(Boolean).join(" and ")}
            </p>
          )}
        </header>
        {savings.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted-foreground">
            {first} adds these once your income is reviewed: each an option set in law, with what it could save you and by when.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {savings.map((s) => (
              <SavingRow key={s.id} s={s} caseId={caseId} customer={customer} first={first} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Estimate({ code, e, first, className }: { code: Code; e: TaxEstimate | null; first: string; className?: string }) {
  const b = e ? balanceText(e) : null;
  return (
    <section aria-label={`Tax this year in ${NAME[code]}`} className={cn("min-w-0 px-6 py-6 sm:px-8", className)}>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[16px] font-semibold text-foreground">
          <span aria-hidden>{FLAG[code]}</span> {NAME[code]}
          {e && <span className="font-normal text-muted-foreground"> · {e.year}</span>}
        </span>
        {e && <span className="text-[12px] text-muted-foreground">{e.form}</span>}
      </p>
      {e && b ? (
        <>
          <p className="mt-3 flex items-baseline gap-2">
            <span className={cn("font-serif text-[36px] leading-none tabular-nums", TONE[b.tone])}>{b.amount}</span>
            <span className={cn("text-[15px] font-medium", TONE[b.tone])}>{b.label}</span>
            <Cite
              node={{
                title: `Tax this year · ${NAME[code]} · ${e.year}`,
                value: `${b.amount} ${b.label}`,
                parts: [
                  { label: "Liability", value: formatMoneyCompact(e.liability, e.currency) ?? "", node: { title: "Liability", value: formatMoneyCompact(e.liability, e.currency), evidence: e.evidence } },
                  { label: code === "IN" ? "Paid so far (TDS, advance tax)" : "Paid or withheld", value: formatMoneyCompact(e.withheld, e.currency) ?? "", node: { title: "Paid so far", value: formatMoneyCompact(e.withheld, e.currency), evidence: e.evidence } },
                  { label: balanceOf(e) >= 0 ? "Left to pay" : "Due back", value: b.amount },
                ],
                note: `Entered by ${e.enteredBy ?? first}${e.enteredOn ? ` on ${d(e.enteredOn)}` : ""}. Kiyos doesn't work out tax; this is your expert's figure.`,
              }}
            />
          </p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            of {formatMoneyCompact(e.liability, e.currency)} liability · {formatMoneyCompact(e.withheld, e.currency)} paid so far
          </p>
          {e.nextPayment && (
            <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              Next payment {formatMoneyCompact(e.nextPayment.amount, e.currency)} by {d(e.nextPayment.date)}
            </p>
          )}
          {e.basis && <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{e.basis}</p>}
          <p className="mt-2 text-[12px] text-muted-foreground">
            {e.status === "reviewed" ? "Reviewed" : "Estimate"} from {e.enteredBy ?? first}
            {e.enteredOn ? ` · ${d(e.enteredOn)}` : ""}
            {e.illustrative ? " · demo figure" : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-serif text-[30px] leading-none text-muted-foreground">Not yet</p>
          <p className="mt-2 text-[13px] text-muted-foreground">{first} enters this once your income documents for the year are reviewed.</p>
        </>
      )}
    </section>
  );
}

export function SavingRow({ s, caseId, customer, first }: { s: Saving; caseId: number; customer: string; first: string }) {
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  async function ask() {
    setBusy(true);
    try {
      await askCaptain(caseId, `About "${s.title}": what would I need to do, and is it still right for me?`, customer);
      setAsked(true);
      toast.success(`Sent to ${first}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-foreground">
          <span aria-hidden>{FLAG[s.country]}</span> {s.title}
        </p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">{s.law}</p>
        {s.why && <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-foreground/85" title={s.why}>{s.why}</p>}
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          From {s.author} · {d(s.date)}
        </p>
      </div>
      <div className="flex items-start gap-4 sm:flex-col sm:items-end sm:gap-1.5">
        {s.amount != null && s.currency && (
          <p className="flex items-center text-right">
            <span>
              <span className="block text-[11.5px] text-muted-foreground">could save about</span>
              <span className="block text-[18px] font-semibold tabular-nums text-foreground">{formatMoneyCompact(s.amount, s.currency)}</span>
            </span>
            <Cite node={{ title: s.title, value: formatMoneyCompact(s.amount, s.currency), evidence: { kind: "expert", by: s.author, at: s.date } }} />
          </p>
        )}
        {s.deadline && <p className="text-[12.5px] text-amber-800">Act by {d(s.deadline)}</p>}
        <button
          onClick={ask}
          disabled={busy || asked}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {asked ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <MessageCircleQuestion className="h-3.5 w-3.5" />}
          {asked ? `Sent to ${first}` : `Ask ${first} about this`}
        </button>
      </div>
    </li>
  );
}


/** Ways to save on their own (Overview): the expert's options, or what to expect. */
export function WaysToSave({ caseId, customer, captain, savings }: { caseId: number; customer: string; captain: string; savings: Saving[] }) {
  const first = captain.split(" ")[0];
  if (!savings.length) {
    return <p className="px-6 py-5 text-[14px] text-muted-foreground">{first} adds ways to save once your income is reviewed: each an option set in law, with what it could save and by when.</p>;
  }
  return (
    <ul className="divide-y px-6">
      {savings.map((s) => (
        <SavingRow key={s.id} s={s} caseId={caseId} customer={customer} first={first} />
      ))}
    </ul>
  );
}
