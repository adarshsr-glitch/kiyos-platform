/**
 * The customer's tax position per country, read from the case record:
 *   - residency status: the calculated year from the residency engine when there is a
 *     travel record, otherwise the expert's country status;
 *   - the return, its due date and stage (country status);
 *   - the tax estimate for the year (liability, tax already paid or withheld), when one
 *     exists. The balance is liability minus withheld: positive is owed, negative is a refund.
 * Nothing is invented: a missing piece is null and the UI says it is pending.
 */

import type { CaseDetail, Evidence, Fact } from "./types";
import type { Residency, ResidencyYear } from "./residency";
import { formatMoneyCompact, type Currency } from "./format";

export type Code = "IN" | "US";

export const COUNTRY_NAME: Record<Code, string> = { IN: "India", US: "United States" };
export const COUNTRY_SHORT: Record<Code, string> = { IN: "India", US: "US" };
export const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };

export const STATUS_SHORT: Record<string, string> = {
  NR: "Non-resident",
  RNOR: "RNOR",
  ROR: "Resident (ROR)",
  RESIDENT: "Resident",
  DUAL: "Dual-status",
  NONRESIDENT: "Non-resident",
};
export const STATUS_LONG: Record<string, string> = {
  NR: "Non-resident",
  RNOR: "Resident but not ordinarily resident",
  ROR: "Resident and ordinarily resident",
  RESIDENT: "Resident",
  DUAL: "Dual-status: resident for part of the year",
  NONRESIDENT: "Non-resident",
};

export type TaxEstimate = {
  country: Code;
  year: string;
  form: string;
  currency: Currency;
  liability: number;
  withheld: number;
  due: string | null;
  status: "estimate" | "reviewed";
  basis: string | null;
  illustrative: boolean;
  /** Who entered it and when: tax figures only ever come from the expert. */
  enteredBy: string | null;
  enteredOn: string | null;
  nextPayment: { date: string; amount: number } | null;
  evidence: Evidence | null;
};

export function estimatesOf(facts: Fact[]): Partial<Record<Code, TaxEstimate>> {
  const out: Partial<Record<Code, TaxEstimate>> = {};
  for (const f of facts) {
    if (!f.key.startsWith("tax_estimate:")) continue;
    try {
      const e = JSON.parse(f.value);
      if (typeof e.liability !== "number" || (e.country !== "IN" && e.country !== "US")) continue;
      out[e.country as Code] = {
        country: e.country,
        year: e.year ?? "",
        form: e.form ?? "",
        currency: e.currency === "INR" ? "INR" : "USD",
        liability: e.liability,
        withheld: typeof e.withheld === "number" ? e.withheld : 0,
        due: e.due ?? null,
        status: e.status === "reviewed" ? "reviewed" : "estimate",
        basis: e.basis ?? null,
        illustrative: f.source === "illustrative",
        enteredBy: e.entered_by ?? (f.evidence?.kind === "expert" ? f.evidence.by : null),
        enteredOn: e.entered_on ?? (f.evidence?.kind === "expert" ? f.evidence.at : null),
        nextPayment: e.next_payment?.date && typeof e.next_payment.amount === "number" ? e.next_payment : null,
        evidence: f.evidence ?? null,
      };
    } catch {
      /* unreadable estimate: treated as missing */
    }
  }
  return out;
}

/** Positive: still to pay. Negative: refund due. */
export const balanceOf = (e: TaxEstimate) => e.liability - e.withheld;

export function balanceText(e: TaxEstimate): { amount: string; label: "to pay" | "refund" | "settled"; tone: "owed" | "refund" | "neutral" } {
  const b = balanceOf(e);
  if (Math.abs(b) < 1) return { amount: formatMoneyCompact(0, e.currency)!, label: "settled", tone: "neutral" };
  return b > 0
    ? { amount: formatMoneyCompact(b, e.currency)!, label: "to pay", tone: "owed" }
    : { amount: formatMoneyCompact(-b, e.currency)!, label: "refund", tone: "refund" };
}

export type CountryPositionData = {
  code: Code;
  status: string | null;
  statusLabel: string | null;
  year: string | null;
  source: "calculated" | "expert" | null;
  reviewedBy: string | null;
  /** The review predates a change to the facts it rests on; the expert is rechecking it. */
  reviewStale: boolean;
  filing: string | null;
  due: string | null;
  stage: string | null;
  estimate: TaxEstimate | null;
  current: ResidencyYear | null;
};

export function positionOf(caseData: CaseDetail, residency: Residency | null | undefined, code: Code): CountryPositionData {
  const cs = caseData.country_status?.[code];
  const hasRecord = !!residency && (residency.stays.length > 0 || residency.facts.length > 0);
  const years = hasRecord ? (code === "IN" ? residency!.india : residency!.us) : [];
  const current = years.find((y) => y.current) ?? null;
  const estimate = estimatesOf(caseData.facts)[code] ?? null;
  const status = current?.status ?? cs?.status ?? null;
  return {
    code,
    status,
    statusLabel: status ? (current ? STATUS_LONG[status] : cs?.label ?? STATUS_LONG[status]) ?? status : null,
    year: current?.year ?? cs?.year ?? estimate?.year ?? null,
    source: current ? "calculated" : cs?.status ? "expert" : null,
    reviewedBy: residency?.reviewed[code]?.by ?? cs?.reviewed_by ?? null,
    reviewStale: residency?.reviewed[code]?.stale ?? false,
    filing: cs?.filing ?? estimate?.form ?? null,
    due: cs?.due ?? estimate?.due ?? null,
    stage: cs?.state ?? null,
    estimate,
    current,
  };
}
