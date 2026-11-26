/** The expert's desk (`GET /experts/desk`, Review 06 EX-07): Home and Triage in one call. */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Tier = "late" | "waiting" | "soon" | "ready" | "later";
export type Kind = "question" | "documents" | "mismatch" | "todo" | "notice" | "signoff" | "reply";
export type RuleRef = { id: string; status: string; summary?: string | null };

export type DeskDoc = {
  id: number;
  filename: string;
  doc_type: string | null;
  status: string;
  received: string | null;
  title: string | null;
  issuer: string | null;
  period: string | null;
  pages: number | null;
  fields: { label: string; value: string; confidence?: number; page?: number }[];
  effects: string[];
  mismatch: unknown;
  scan: string | null;
  synthetic: boolean;
};

type Base<K extends Kind, D> = {
  key: string;
  kind: K;
  tier: Tier;
  case_id: number;
  customer: string;
  captain: string;
  title: string;
  due: string | null;
  since: string | null;
  prepared: boolean;
  href: string;
  detail: D;
};

export type DeskRow =
  | Base<"question", { ticket_id: number; question: string; draft: string | null; grounded: boolean; rules: RuleRef[]; asked_at: string | null; context: string | null }>
  | Base<"documents", { documents: DeskDoc[]; read: number; duplicates: number; mismatches: number; scans_clean: boolean }>
  | Base<"mismatch", { stated: string | number; stated_source: string; found: string | number; found_source: string; effect: string; ask: string }>
  | Base<"todo", { item_id: number; notes: string | null; status: string }>
  | Base<"notice", { notice_id: number }>
  | Base<"signoff", { assessment_id: number; status: string; blockers: string[]; open_questions: number; rules: RuleRef[] }>
  | Base<"reply", { texts: string[]; to: string }>;

export type BriefLine =
  | { kind: "documents"; case_id: number; customer: string; row: string; what: string; read: number; conflicts: number }
  | { kind: "question"; case_id: number; customer: string; what: string; grounded: boolean; at: string; count: number; context: string | null }
  | { kind: "overdue"; count: number; customers: number; case_id: number; customer: string; what: string; days: number | null; row: string };

export type Owed = { key: string; case_id: number; customer: string; item_id: number | null; title: string; due: string | null; late: boolean };
export type Stage = "documents" | "review" | "ready" | "signed";

export type Desk = {
  today: string;
  expert: string | null;
  mine: boolean;
  customers: number;
  counts: Record<Tier, number> & { open: number; prepared: number; questions: number; late_customers: number };
  queue: DeskRow[];
  brief: BriefLine[];
  heatmap: {
    start: string;
    days: { date: string; past: boolean; yours: number; owed: number }[];
    filings: { country: "IN" | "US"; due: string }[];
    next_filing: { country: "IN" | "US"; due: string; days: number } | null;
  };
  runway: { country: "IN" | "US"; due: string; days: number; customers: { case_id: number; customer: string; stage: Stage }[] }[];
  no_filing_date: string[];
  book: { docs: { accepted: number; total: number }; signed: { done: number; total: number } };
  owed: Owed[];
  done_today: { key: string; case_id: number; customer: string; actor: string; verb: string; label: string | null; at: string }[];
  cases: CaseSummary[];
};

export type Reason = { key: string; kind: Kind; tier: Tier; title: string; due: string | null; since: string | null };

export type CaseSummary = {
  id: number;
  customer: string;
  captain: string;
  name: string;
  stage: Stage;
  docs: { accepted: number; total: number };
  signed: { done: number; total: number };
  updated: string | null;
  review_status: string;
  tiers: Record<Tier, number>;
  top: Reason | null;
  /** Every open reason the customer needs the expert, most urgent first. */
  reasons: Reason[];
  owed: number;
  owed_late: number;
  next_filing: { country: "IN" | "US"; due: string; form: string; days: number } | null;
};

export async function getDesk(expert: string | null, caseId?: number): Promise<Desk> {
  const q = new URLSearchParams();
  if (expert) q.set("expert", expert);
  if (caseId) q.set("case", String(caseId));
  const res = await fetch(`${BASE}/experts/desk${q.toString() ? `?${q}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
  return res.json();
}

export const fmt = (d: string, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 864e5);
export const firstOf = (name: string) => name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, "").replace(/&/g, " ").split(/\s+/)[0];
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One short label for how urgent a row is. */
export function urgency(r: DeskRow, today: string): { text: string; tone: "late" | "soon" | "neutral" | "ready" | "owed" } {
  if (r.tier === "late" && r.due) return { text: `${plural(daysBetween(r.due, today), "day")} late`, tone: "late" };
  if (r.kind === "question" && r.due) {
    const n = daysBetween(today, r.due);
    return { text: n <= 0 ? "Reply due today" : n === 1 ? "Reply due tomorrow" : `Reply due ${fmt(r.due)}`, tone: "owed" };
  }
  if ((r.tier === "soon" || r.tier === "later") && r.due) {
    const n = daysBetween(today, r.due);
    return { text: n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : `Due ${fmt(r.due, { weekday: "short", day: "numeric", month: "short" })}`, tone: "soon" };
  }
  if (r.tier === "ready") return { text: r.since ? `Since ${fmt(r.since)}` : "Ready", tone: "ready" };
  if (r.since) {
    const n = Math.max(0, daysBetween(r.since, today));
    return { text: n === 0 ? "Today" : `Waiting ${plural(n, "day")}`, tone: "neutral" };
  }
  return { text: r.kind === "mismatch" ? "Found in a document" : "No date", tone: "neutral" };
}
