/**
 * Display formatting for money and dates. Never returns NaN, "undefined" or
 * other technical values: unparseable input yields null so callers render a
 * deliberate empty state.
 */

export type Currency = "INR" | "USD";

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  l: 1e5,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  cr: 1e7,
  crore: 1e7,
  crores: 1e7,
};

/** Parse "150000", "1,50,000", "$87k", "₹1.2 Cr", "15 L". Returns null if not a number. */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const text = input.trim().toLowerCase().replace(/[₹$,\s]|usd|inr|rs\.?/g, (m) =>
    /\s/.test(m) ? " " : ""
  );
  const match = text.match(/^(-?\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return null;
  const base = parseFloat(match[1]);
  const unit = match[2];
  if (unit && !(unit in MULTIPLIERS)) return null;
  const value = base * (unit ? MULTIPLIERS[unit] : 1);
  return Number.isFinite(value) ? value : null;
}

export function currencyOf(unit: string | null | undefined): Currency | null {
  const u = (unit ?? "").toUpperCase();
  if (u.startsWith("INR") || u === "₹") return "INR";
  if (u.startsWith("USD") || u === "$") return "USD";
  return null;
}

/** ₹75,00,000 / $120,000 — full grouping in each currency's own convention. */
export function formatMoney(value: number | null, currency: Currency): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return currency === "INR"
    ? `₹${Math.round(value).toLocaleString("en-IN")}`
    : `$${Math.round(value).toLocaleString("en-US")}`;
}

/** ₹75 L / ₹1.25 Cr / $120K / $1.2M — for tight spaces. */
export function formatMoneyCompact(value: number | null, currency: Currency): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(2).replace(/\.?0+$/, ""));
  if (currency === "INR") {
    if (value >= 1e7) return `₹${trim(value / 1e7)} Cr`;
    if (value >= 1e5) return `₹${trim(value / 1e5)} L`;
    return formatMoney(value, "INR");
  }
  if (value >= 1e6) return `$${trim(value / 1e6)}M`;
  if (value >= 1e4) return `$${trim(value / 1e3)}K`;
  return formatMoney(value, "USD");
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

/** "in 9 days" / "today" / "3 days ago" relative to now (date precision). */
export function relativeDays(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w[0] ?? ""))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
