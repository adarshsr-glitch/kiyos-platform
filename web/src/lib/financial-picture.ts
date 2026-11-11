/**
 * Turns a case's facts (or, before a case exists, onboarding answers) into a
 * consistent cross-border financial picture: India vs US, income vs holdings.
 * Amounts stay in their own currency — nothing is converted or computed.
 */

import type { Fact } from "./types";
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
  "captain-entered": "From your advisor",
  customer_confirmed: "Confirmed by you",
  derived: "Worked out by Kiyos",
};

export function sourceLabel(source: string | null): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source] ?? `From ${source}`;
}

export function pictureFromFacts(facts: Fact[], members: string[] = []): PictureItem[] {
  const byKey = new Map(facts.map((f) => [f.key, f]));
  const items: PictureItem[] = [];

  for (const f of facts) {
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
    items.push({
      id: `fact-${f.id}`,
      section: kind.section,
      country,
      label: kind.label,
      detail: detail || null,
      value: formatMoney(parseAmount(f.value), currency),
      source: f.source,
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
    });
  }

  return items;
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
