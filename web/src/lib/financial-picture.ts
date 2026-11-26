/**
 * Turns a case's facts (or, before a case exists, onboarding answers) into a
 * consistent cross-border financial picture: India vs US, income vs holdings.
 * Amounts stay in their own currency — nothing is converted or computed.
 */

import type { Evidence, Fact } from "./types";
import { currencyOf, formatMoney, parseAmount, type Currency } from "./format";

export type Country = "IN" | "US";
export type Section = "income" | "holdings";

export interface PictureItem {
  id: string;
  section: Section;
  country: Country;
  label: string;
  /** Employer, location, period — whatever explains the number */
  detail: string | null;
  /** Formatted value, or null when it hasn't been provided */
  value: string | null;
  source: string | null;
  /** The number behind `value`, in `currency`; null when only a range was given */
  amount?: number | null;
  currency?: Currency;
  /** Asset class or income type, for charts */
  category?: string;
  /** Synthetic demo data: shown, but never presented as confirmed */
  illustrative?: boolean;
  /** Exactly where the value came from, when recorded */
  evidence?: Evidence | null;
  /** Only a range was given (no documented amount) */
  ranged?: boolean;
}

/** Asset classes and income types, in display order. */
export const ASSET_CLASSES = ["Property", "Investments", "Retirement", "Cash & deposits"] as const;
export const INCOME_TYPES = ["Salary & equity", "Rental", "Dividends", "Capital gains", "Interest", "Other"] as const;

export function categoryOf(section: Section, text: string): string {
  const t = text.toLowerCase();
  if (section === "holdings") {
    if (/flat|house|villa|plot|land|property|bungalow|apt/.test(t)) return "Property";
    if (/401|ira|roth|retire|529|pension/.test(t)) return "Retirement";
    if (/savings|deposit|fd|nre|nro|bank|balance|cash/.test(t)) return "Cash & deposits";
    return "Investments";
  }
  if (/salary|rsu|offer|wage|bonus/.test(t)) return "Salary & equity";
  if (/rent/.test(t)) return "Rental";
  if (/dividend/.test(t)) return "Dividends";
  if (/gain/.test(t)) return "Capital gains";
  if (/interest/.test(t)) return "Interest";
  return "Other";
}

export const COUNTRIES: { code: Country; name: string; flag: string }[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
];

// Facts that describe tax mechanics rather than income or holdings.
const EXCLUDE = /tds|exemption|cost_basis|strike|fmv|charitable|_count$|vest_price|total$/;

const LOCATIONS = ["pune", "mumbai", "chennai", "bangalore", "bengaluru", "powai", "delhi", "hyderabad"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function period(key: string): string | null {
  let m = key.match(/_(\d{4})_h([12])$/);
  if (m) return m[2] === "1" ? `Jan–Jun ${m[1]}` : `Jul–Dec ${m[1]}`;
  m = key.match(/vest_(\d{4})_(\d{2})$/);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
  m = key.match(/_(\d{4})_(\d{2})$/);
  if (m) return `FY ${m[1]}-${m[2]}`;
  m = key.match(/_(\d{4})$/);
  if (m) return m[1];
  if (/annual/.test(key)) return "per year";
  return null;
}

function location(key: string): string | null {
  const hit = LOCATIONS.find((l) => key.includes(l));
  return hit ? cap(hit) : null;
}

/** First segment when it is a household member's name, e.g. "anil_us_salary_2026". */
function person(key: string, members: string[]): string | null {
  const first = key.split("_")[0];
  const match = members.find((m) => m.toLowerCase().split(" ")[0] === first);
  return match ? match.split(" ")[0] : null;
}

function classify(key: string): { section: Section; label: string } | null {
  if (/rental/.test(key)) return { section: "income", label: "Rental income" };
  if (/salary|offer_base/.test(key)) return { section: "income", label: "Salary" };
  if (/income/.test(key)) return { section: "income", label: "Other income" };
  if (/rsu_vest/.test(key)) return { section: "income", label: "RSU vest" };
  if (/401k/.test(key)) return { section: "holdings", label: "401(k)" };
  if (/ira/.test(key)) return { section: "holdings", label: "IRA" };
  if (/brokerage/.test(key)) return { section: "holdings", label: "Brokerage account" };
  if (/_mf_|mutual/.test(key)) return { section: "holdings", label: "Mutual funds" };
  if (/property|flat|apt|land|house/.test(key)) return { section: "holdings", label: /land/.test(key) ? "Land" : "Property" };
  if (/nre/.test(key)) return { section: "holdings", label: "NRE account" };
  if (/balance|bank|deposit/.test(key)) return { section: "holdings", label: "Bank balance" };
  return null;
}

const SOURCE_LABEL: Record<string, string> = {
  "captain-entered": "From your expert",
  customer_confirmed: "Confirmed by you",
  derived: "Worked out by Kiyos",
  illustrative: "Illustrative (demo data)",
};

export function sourceLabel(source: string | null): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source] ?? `From ${source}`;
}

export function pictureFromFacts(facts: Fact[], members: string[] = []): PictureItem[] {
  const byKey = new Map(facts.map((f) => [f.key, f]));
  const items: PictureItem[] = [];

  for (const f of facts) {
    // Structured holdings (onboarding answers, documents read, demo data).
    if (f.key.startsWith("holding:")) {
      const h = parseHolding(f);
      if (h) items.push(h);
      continue;
    }
    const currency = currencyOf(f.unit);
    if (!currency || EXCLUDE.test(f.key)) continue;
    const kind = classify(f.key);
    if (!kind) continue;
    const country: Country = currency === "INR" ? "IN" : "US";
    const employer =
      kind.label === "Salary"
        ? byKey.get(`${country === "IN" ? "india" : "us"}_employer`)?.value ?? null
        : null;
    const detail = [person(f.key, members), employer, location(f.key), period(f.key)]
      .filter(Boolean)
      .join(" · ");
    const amount = parseAmount(f.value);
    items.push({
      id: `fact-${f.id}`,
      section: kind.section,
      country,
      label: kind.label,
      detail: detail || null,
      value: formatMoney(amount, currency),
      source: f.source,
      evidence: f.evidence ?? null,
      amount,
      currency,
      category: categoryOf(kind.section, `${kind.label} ${f.key}`),
      illustrative: f.source === "illustrative",
    });
  }

  // Unvested equity is held as shares, not money — show it as such.
  const shares = byKey.get("rsu_unvested_count");
  if (shares) {
    const count = parseAmount(shares.value);
    const price = byKey.get("rsu_vest_price");
    const priceText = price ? formatMoney(parseAmount(price.value), currencyOf(price.unit) ?? "USD") : null;
    items.push({
      id: `fact-${shares.id}`,
      section: "holdings",
      country: "US",
      label: "Unvested RSUs",
      detail: priceText ? `Last vest price ${priceText}` : null,
      value: count !== null ? `${count.toLocaleString("en-US")} shares` : null,
      source: shares.source,
      amount: null,
      currency: "USD",
      category: "Investments",
    });
  }

  return items;
}

function parseHolding(f: Fact): PictureItem | null {
  try {
    const h = JSON.parse(f.value) as {
      id: string; country: Country; kind: "income" | "asset"; label: string; currency: Currency;
      band?: string; amount?: number; detail?: string; evidence?: string;
    };
    const section: Section = h.kind === "income" ? "income" : "holdings";
    const amount = typeof h.amount === "number" ? h.amount : null;
    return {
      id: `fact-${f.id}`,
      section,
      country: h.country,
      label: h.label,
      detail: h.detail ?? (amount === null && h.band ? (f.source === "illustrative" ? "approximate range" : "range you gave us") : null),
      value: amount !== null ? formatMoney(amount, h.currency) : h.band ?? null,
      source: f.source,
      evidence: f.evidence ?? null,
      amount,
      currency: h.currency,
      category: categoryOf(section, `${h.label} ${h.id}`),
      illustrative: f.source === "illustrative",
      ranged: amount === null,
    };
  } catch {
    return null;
  }
}

/**
 * A move year: salary from a US employer until the return to India and from an Indian
 * employer after it. Both are real, in different countries; say so instead of showing
 * two unexplained salaries. Returns the relabelled items and a one-line explanation.
 */
export type MoveYear = {
  date: string;
  us: { employer: string | null; salary: PictureItem };
  in: { employer: string | null; salary: PictureItem };
};

export function explainSplitYear(items: PictureItem[], facts: Fact[]): { items: PictureItem[]; note: string | null; move: MoveYear | null } {
  const moved = facts.find((f) => f.key === "india_return_date")?.value;
  const salaryOf = (c: Country) => items.find((i) => i.country === c && i.section === "income" && i.label === "Salary");
  const salary = (c: Country) => !!salaryOf(c);
  if (!moved || !salary("IN") || !salary("US")) return { items, note: null, move: null };
  const when = new Date(moved).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const usEmployer = facts.find((f) => f.key === "us_employer")?.value;
  const inEmployer = facts.find((f) => f.key === "india_employer")?.value;
  return {
    move: {
      date: moved,
      us: { employer: usEmployer ?? null, salary: salaryOf("US")! },
      in: { employer: inEmployer ?? null, salary: salaryOf("IN")! },
    },
    items: items.map((i) =>
      i.section === "income" && i.label === "Salary" ? { ...i, label: i.country === "US" ? "Salary before your move" : "Salary after your move" } : i
    ),
    note: `You moved to India on ${when}. ${usEmployer ? `${usEmployer} paid you` : "Your US salary ran"} until then and ${inEmployer ? `${inEmployer}` : "your Indian employer"} after, so this year has a salary in each country. Each country taxes the salary earned there; your expert checks how the two returns fit together.`,
  };
}

/** Sum of documented amounts per country and section, in that country's currency. */
export function totals(items: PictureItem[], section: Section, country: Country): { sum: number; counted: number; ranged: number } {
  const rows = items.filter((i) => i.section === section && i.country === country);
  const counted = rows.filter((i) => typeof i.amount === "number");
  return { sum: counted.reduce((s, i) => s + (i.amount ?? 0), 0), counted: counted.length, ranged: rows.filter((i) => i.ranged).length };
}

/** Group amounts by category for one country and section. */
export function byCategory(items: PictureItem[], section: Section, country?: Country): { category: string; sum: number }[] {
  const order: readonly string[] = section === "holdings" ? ASSET_CLASSES : INCOME_TYPES;
  const map = new Map<string, number>();
  for (const i of items) {
    if (i.section !== section || (country && i.country !== country) || typeof i.amount !== "number") continue;
    const c = i.category ?? "Other";
    map.set(c, (map.get(c) ?? 0) + i.amount);
  }
  return order.filter((c) => map.has(c)).map((c) => ({ category: c, sum: map.get(c)! }));
}

interface OnboardingIncome {
  type: string;
  amount: string;
  currency: string;
  country: string;
}
interface OnboardingAsset {
  type: string;
  country: string;
  approximateValue: string;
}

function countryCode(name: string): Country | null {
  const n = name.toLowerCase();
  if (n.includes("india")) return "IN";
  if (n.includes("united states") || n === "us" || n === "usa") return "US";
  return null;
}

/** Onboarding answers are free text; unparseable amounts become "not provided", never NaN. */
export function pictureFromOnboarding(
  income: OnboardingIncome[] = [],
  assets: OnboardingAsset[] = []
): PictureItem[] {
  const items: PictureItem[] = [];
  income.forEach((s, i) => {
    const country = countryCode(s.country);
    if (!country) return;
    const currency: Currency = (currencyOf(s.currency) ?? (country === "IN" ? "INR" : "USD"));
    items.push({
      id: `ob-income-${i}`,
      section: "income",
      country,
      label: s.type || "Income",
      detail: "per year · from your answers",
      value: formatMoney(parseAmount(s.amount), currency),
      source: "onboarding",
    });
  });
  assets.forEach((a, i) => {
    const country = countryCode(a.country);
    if (!country) return;
    const currency: Currency = country === "IN" ? "INR" : "USD";
    items.push({
      id: `ob-asset-${i}`,
      section: "holdings",
      country,
      label: a.type || "Asset",
      detail: "approximate · from your answers",
      value: formatMoney(parseAmount(a.approximateValue), currency),
      source: "onboarding",
    });
  });
  return items;
}
