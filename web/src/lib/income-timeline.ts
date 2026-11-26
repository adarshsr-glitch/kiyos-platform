/**
 * Income earned this tax year, as dated entries: each payslip, RSU release, dividend, rent
 * credit and interest credit, split by source and dated within the country's tax year
 * (India: April–March; US: calendar year).
 *
 * The year's amount for each source is what the documents already record (the same figure
 * as "Income this year" elsewhere). For the prototype, that amount is laid out on the
 * schedule that kind of income follows (monthly pay, quarterly vests and dividends, monthly
 * rent), each entry with a sample reference into the statement it would appear on. Only
 * entries dated up to today count as earned. Nothing is projected: the full-year figure is
 * the documents' own, shown as a reference, never extended into a forecast. No tax logic.
 */

import type { Evidence } from "./types";
import type { MoveYear, PictureItem } from "./financial-picture";
import { formatMoney, type Currency } from "./format";

export type Code = "IN" | "US";
export type IncomeKind = "Salary" | "RSU vesting" | "Dividends" | "Rent" | "Interest" | "Capital gains" | "Other";

export type Entry = { date: string; amount: number; evidence: Evidence };
export type Stream = {
  key: string;
  kind: IncomeKind;
  label: string;
  item: PictureItem;
  /** "monthly payslips", "quarterly releases" */
  cadence: string;
  /** "payslip", "release": what one entry is called */
  unit: string;
  entries: Entry[];
  received: Entry[];
  toDate: number;
  fullYear: number;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
const monthName = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const dayName = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The tax year that contains `today`: FY April–March for India, calendar year for the US. */
export function taxYear(c: Code, today = new Date()): { start: Date; end: Date; label: string } {
  if (c === "US") return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31), label: String(today.getFullYear()) };
  const y = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return { start: new Date(y, 3, 1), end: new Date(y + 1, 2, 31), label: `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}` };
}

export function kindOf(i: PictureItem): IncomeKind {
  const t = `${i.label} ${i.id} ${i.category ?? ""} ${i.detail ?? ""}`.toLowerCase();
  if (/rsu|vest/.test(t)) return "RSU vesting";
  if (/salary|wage|pay\b/.test(t)) return "Salary";
  if (/dividend/.test(t)) return "Dividends";
  if (/rent/.test(t)) return "Rent";
  if (/interest/.test(t)) return "Interest";
  if (/capital gain|gain/.test(t)) return "Capital gains";
  return "Other";
}

type Slot = { date: Date; weight: number };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** A period the record states, e.g. "Jul–Dec 2026" or "Jan–Jun 2026", if any. */
function statedPeriod(text: string | null): [Date, Date] | null {
  const m = (text ?? "").toLowerCase().match(/\b([a-z]{3})[a-z]*\s*[–-]\s*([a-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return null;
  const a = MONTHS.indexOf(m[1]);
  const b = MONTHS.indexOf(m[2]);
  if (a < 0 || b < 0) return null;
  const y = Number(m[3]);
  return [new Date(b < a ? y - 1 : y, a, 1), new Date(y, b + 1, 0)];
}

/** When each kind of income is paid, within [from, to]. Weights share out the year's amount. */
function schedule(kind: IncomeKind, c: Code, from: Date, to: Date): Slot[] {
  const slots: Slot[] = [];
  const inRange = (d: Date) => d >= from && d <= to;
  const months: Date[] = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  const quarterly = (dates: [number, number][]) => {
    for (const m of months) for (const [mo, day] of dates) if (m.getMonth() === mo) {
      const d = new Date(m.getFullYear(), mo, day);
      if (inRange(d)) slots.push({ date: d, weight: 1 });
    }
  };
  switch (kind) {
    case "Salary":
      // Paid on the last day of each month; a part month pays for the days worked.
      for (const m of months) {
        const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
        const a = m < from ? from : m;
        const b = last > to ? to : last;
        const days = Math.round((b.getTime() - a.getTime()) / 864e5) + 1;
        if (days > 0) slots.push({ date: last > to ? to : last, weight: days / last.getDate() });
      }
      break;
    case "Rent":
      for (const m of months) {
        const d = new Date(m.getFullYear(), m.getMonth(), 5);
        if (inRange(d)) slots.push({ date: d, weight: 1 });
      }
      break;
    case "RSU vesting":
      quarterly([[1, 15], [4, 15], [7, 15], [10, 15]]);
      break;
    case "Dividends":
      if (c === "US") quarterly([[2, 15], [5, 15], [8, 15], [11, 15]]);
      else {
        quarterly([[7, 20]]);
        slots.forEach((s) => (s.weight = 0.6));
        const before = slots.length;
        quarterly([[1, 20]]);
        slots.slice(before).forEach((s) => (s.weight = 0.4));
      }
      break;
    case "Interest":
      quarterly([[5, 30], [8, 30], [11, 31], [2, 31]]);
      break;
    case "Capital gains": {
      const d = c === "US" ? new Date(from.getFullYear(), 2, 14) : new Date(from.getFullYear(), 8, 10);
      slots.push({ date: inRange(d) ? d : from, weight: 1 });
      break;
    }
    default:
      slots.push({ date: to, weight: 1 });
  }
  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const CADENCE: Record<IncomeKind, [string, string]> = {
  Salary: ["monthly pay", "payslip"],
  "RSU vesting": ["quarterly releases", "release"],
  Dividends: ["dividend payouts", "payout"],
  Rent: ["monthly rent", "credit"],
  Interest: ["quarterly interest", "credit"],
  "Capital gains": ["sale", "sale"],
  Other: ["yearly", "entry"],
};

/** A sample reference into the statement each entry would appear on. */
function entryEvidence(kind: IncomeKind, c: Code, d: Date, value: string, employer: string | null): Evidence {
  const ref = (title: string, issuer: string | null, section: string, label: string, page = 1): Evidence => ({
    kind: "document", document_id: null, filename: title, title, issuer, pages: 2, sample: true,
    lines: [{ page, section, label, value }],
  });
  const m = monthName(d);
  switch (kind) {
    case "Salary":
      return c === "US"
        ? ref(`Pay stub · ${m}`, employer ?? "Employer payroll", "Earnings this period", "Gross pay")
        : ref(`Salary slip · ${m}`, employer ?? "Employer payroll", "Earnings", "Gross salary");
    case "RSU vesting":
      return ref(`RSU release confirmation · ${dayName(d)}`, "Morgan Stanley at Work", "Release summary", "Value at vest");
    case "Dividends":
      return c === "US"
        ? ref(`Brokerage statement · ${m}`, "Brokerage", "Income summary", "Dividends paid")
        : ref(`Bank statement · ${m}`, "HDFC Bank", "Credits", "Dividend credited");
    case "Rent":
      return ref(`Bank statement · ${m}`, "HDFC Bank", "Credits", "Rent from tenant");
    case "Interest":
      return ref(`${c === "US" ? "Savings" : "Deposit"} statement · ${m}`, c === "US" ? "Bank" : "HDFC Bank", "Interest", "Interest credited");
    case "Capital gains":
      return ref(`Trade confirmation · ${dayName(d)}`, "Brokerage", "Realised gain/loss", "Realised gain");
    default:
      return ref(`Statement · ${m}`, null, "Summary", "Income");
  }
}

/** Every income source for one country this tax year, with its dated entries. */
export function incomeStreams(picture: PictureItem[], move: MoveYear | null, c: Code, today = new Date()): Stream[] {
  const ty = taxYear(c, today);
  const cur: Currency = c === "IN" ? "INR" : "USD";
  const moved = move ? parse(move.date) : null;
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return picture
    .filter((i) => i.section === "income" && i.country === c && typeof i.amount === "number" && i.amount > 0)
    .map((item) => {
      const kind = kindOf(item);
      let from = ty.start;
      let to = ty.end;
      const stated = statedPeriod(item.detail);
      if (stated) {
        // The record says when this was earned: use it (within the tax year).
        from = stated[0] > from ? stated[0] : from;
        to = stated[1] < to ? stated[1] : to;
        if (kind === "Salary" && moved && c === "IN" && moved > from) from = moved;
      } else if (kind === "Salary" && moved) {
        // In a move year, US pay stops the day before the move and Indian pay starts on it.
        if (c === "US") to = new Date(moved.getTime() - 864e5) < to ? new Date(moved.getTime() - 864e5) : to;
        else from = moved > from ? moved : from;
      }
      const employer = kind === "Salary" ? (c === "US" ? move?.us.employer : move?.in.employer) ?? null : null;
      const slots = schedule(kind, c, from, to);
      const total = slots.reduce((s, x) => s + x.weight, 0) || 1;
      const entries = slots.map((s) => {
        const amount = (item.amount! * s.weight) / total;
        return { date: iso(s.date), amount, evidence: entryEvidence(kind, c, s.date, formatMoney(amount, cur) ?? "", employer) };
      });
      const received = entries.filter((e) => parse(e.date) <= t0);
      const [cadence, unit] = CADENCE[kind];
      return {
        key: item.id,
        kind,
        label: kind === "Salary" ? item.label : kind,
        item,
        cadence,
        unit,
        entries,
        received,
        toDate: received.reduce((s, e) => s + e.amount, 0),
        fullYear: item.amount!,
      };
    })
    .sort((a, b) => b.fullYear - a.fullYear);
}
