/**
 * Short, factual observations about a customer's money across the two countries. Every
 * sentence is computed from the financial picture (amounts, classes, the move year); a
 * sentence is left out when the data doesn't support it. No generic commentary.
 */

import { formatMoneyCompact } from "./format";
import { byCategory, totals, type MoveYear, type PictureItem } from "./financial-picture";

type Code = "IN" | "US";
/** "Flat in Pune" → "flat in Pune": only the first letter, so place names keep their capitals. */
const COMMON = /^(Flat|Plot|Residential|Savings|Brokerage|Mutual|House|Apartment|Fixed|Villa|Listed|Land|Bank)\b/;
const lowerFirst = (s: string) => (COMMON.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
/** Drop a trailing note like " (rented out)", but keep names such as "401(k)". */
const plain = (s: string) => s.replace(/\s+\([^)]*\)$/, "").replace(/^Residential plot, (.+)$/, "plot in $1");
const CUR = { IN: "INR", US: "USD" } as const;

/** What each asset class tends to raise for tax: framing, not a conclusion. */
const RAISES: Record<string, string> = {
  Property: "rent and any eventual sale",
  Retirement: "when and how you draw on the accounts",
  Investments: "gains and dividends as you sell or earn them",
  "Cash & deposits": "the interest it earns",
};
const LED: Record<string, string> = {
  Property: "property-led",
  Retirement: "concentrated in retirement accounts",
  Investments: "mostly investments",
  "Cash & deposits": "mostly cash and deposits",
};

function lead(picture: PictureItem[], c: Code) {
  const t = totals(picture, "holdings", c);
  if (!t.counted || t.sum <= 0) return null;
  const parts = byCategory(picture, "holdings", c).sort((a, b) => b.sum - a.sum);
  const top = parts[0];
  if (!top) return null;
  const biggest = picture
    .filter((i) => i.section === "holdings" && i.country === c && i.category === top.category && typeof i.amount === "number")
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
  return { total: t.sum, cls: top.category, share: top.sum / t.sum, amount: top.sum, biggest };
}

export function wealthInsight(picture: PictureItem[], move: MoveYear | null): string[] {
  const out: string[] = [];
  const IN = lead(picture, "IN");
  const US = lead(picture, "US");
  const money = (n: number, c: Code) => formatMoneyCompact(n, CUR[c]);
  const pct = (s: number) => `${Math.round(s * 100)}%`;
  const strong = (l: ReturnType<typeof lead>) => !!l && l.share >= 0.5;

  if (IN && US && strong(IN) && strong(US)) {
    out.push(
      `Your Indian portfolio is ${LED[IN.cls]}: ${money(IN.amount, "IN")} of ${money(IN.total, "IN")} (${pct(IN.share)})` +
        `${IN.biggest ? `, the largest being your ${lowerFirst(plain(IN.biggest.label))}` : ""}. ` +
        `In the US it's ${LED[US.cls]}: ${money(US.amount, "US")} of ${money(US.total, "US")} (${pct(US.share)}).`
    );
    if (IN.cls !== US.cls) out.push(`So the questions differ by side: ${RAISES[IN.cls]} in India, ${RAISES[US.cls]} in the US.`);
  } else {
    for (const [c, l] of [["IN", IN], ["US", US]] as const) {
      if (l && strong(l)) out.push(`${c === "IN" ? "In India" : "In the US"}, ${pct(l.share)} of what you own is ${l.cls.toLowerCase()} (${money(l.amount, c)} of ${money(l.total, c)}).`);
    }
  }

  if (move) {
    const when = new Date(move.date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const usPay = move.us.salary.amount != null ? money(move.us.salary.amount, "US") : move.us.salary.value;
    const inPay = move.in.salary.amount != null ? money(move.in.salary.amount, "IN") : move.in.salary.value;
    out.push(
      `You moved in ${when}, so this year's salary is split: ${usPay ?? "US salary"}${move.us.employer ? ` from ${move.us.employer}` : ""} before the move and ` +
        `${inPay ?? "Indian salary"}${move.in.employer ? ` from ${move.in.employer}` : ""} after it, each taxed where it was earned.`
    );
  }
  return out;
}

const lowerCat = (c: string) => c.toLowerCase().replace(" & ", " and ");
const joinNames = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** One line under a country's total: what its assets are made of, in plain words. */
export function assetNote(picture: PictureItem[], c: Code): string | null {
  const l = lead(picture, c);
  if (!l) return null;
  const pct = `${Math.round(l.share * 100)}%`;
  if (l.share < 0.5) {
    const cats = byCategory(picture, "holdings", c).sort((a, b) => b.sum - a.sum).map((p) => lowerCat(p.category));
    return `Spread across ${joinNames(cats)}.`;
  }
  const names = picture
    .filter((i) => i.section === "holdings" && i.country === c && i.category === l.cls && typeof i.amount === "number")
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 2)
    .map((i) => `${COMMON.test(i.label) ? "the " : "your "}${lowerFirst(plain(i.label))}`);
  const led = { Property: "Property-led", Retirement: "Retirement-led", Investments: "Investment-led", "Cash & deposits": "Mostly cash" }[l.cls] ?? l.cls;
  return `${led}: ${pct} ${l.cls === "Retirement" ? "sits in" : "is"} ${joinNames(names)}.`;
}

/** One line under a country's income: when it was earned (in a move year) and what drove it. */
export function incomeNote(picture: PictureItem[], c: Code, move: MoveYear | null): string | null {
  const t = totals(picture, "income", c);
  if (!t.counted) return null;
  const top = byCategory(picture, "income", c).sort((a, b) => b.sum - a.sum)[0];
  const when = move
    ? `${c === "US" ? "before" : "after"} your move on ${new Date(move.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : "this year";
  const drive = top ? ` · mostly ${lowerCat(top.category)} (${Math.round((top.sum / t.sum) * 100)}%)` : "";
  return `Earned in ${c === "IN" ? "India" : "the US"} ${when}${drive}`;
}

/** "Earned in the US before the move · mostly Stripe salary": when, and from what or whom. */
export function incomeLine(picture: PictureItem[], c: Code, move: MoveYear | null): string | null {
  const t = totals(picture, "income", c);
  if (!t.counted) return null;
  const top = byCategory(picture, "income", c).sort((a, b) => b.sum - a.sum)[0];
  const where = c === "IN" ? "India" : "the US";
  const when = move ? (c === "US" ? " before the move" : " after it") : " this year";
  const employer = move ? (c === "US" ? move.us.employer : move.in.employer) : null;
  const what = !top
    ? ""
    : top.category === "Salary & equity" && employer
      ? ` · mostly ${employer.replace(/\s+(Inc\.?|Pvt\.? Ltd\.?|Ltd\.?|LLC|Corporation)$/i, "")} salary`
      : ` · mostly ${lowerCat(top.category)}`;
  return `earned in ${where}${when}${what}`;
}
