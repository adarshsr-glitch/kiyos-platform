/** Residency, holdings and expert brief: types and API calls. */

import type { Evidence } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RuleTest = {
  rule_id: string;
  summary: string;
  section: string | null;
  rule_status: string;
  inputs: Record<string, unknown>;
  result: string;
  passed: boolean;
};

export type ResidencyYear = {
  year: string;
  start: string;
  end: string;
  days: number;
  status: "NR" | "RNOR" | "ROR" | "RESIDENT" | "DUAL" | "NONRESIDENT";
  label: string;
  projected: boolean;
  current: boolean;
  tests: RuleTest[];
  /** India years: what the day count is made of (recorded stays, the return date, years before moving abroad). */
  parts?: DayPart[];
};

export type DayPart = { kind: "stay" | "return" | "lived"; stay_id: number | null; fact: string | null; from: string; to: string; days: number; open?: boolean; projected?: boolean };

export type Residency = {
  india: ResidencyYear[];
  us: ResidencyYear[];
  assumptions: string[];
  rules_pending_validation: boolean;
  stays: { id: number; country: string; arrived: string; departed: string | null; source: string; evidence?: Evidence | null }[];
  facts: { key: string; label: string; value: string; source: string; evidence?: Evidence | null }[];
  pending_changes: { id: number; fact_key: string; label: string; from: string | null; to: string }[];
  reviewed: Partial<Record<"IN" | "US", { by: string; on: string | null; stale?: boolean }>>;
};

export type Holding = {
  id: string;
  country: "IN" | "US";
  kind: "income" | "asset";
  label: string;
  currency: "INR" | "USD";
  band: string;
  source?: string;
  amount?: number;
  evidence?: string;
};

export type Brief = {
  case_id: number;
  client_name: string;
  review_status: "in_review" | "awaiting_customer" | "ready_for_signoff" | "signed_off";
  residency: Pick<Residency, "india" | "us" | "assumptions" | "rules_pending_validation">;
  facts: { label: string; value: string; source: string }[];
  holdings: Holding[];
  stays: { arrived: string; departed: string | null; source: string }[];
  documents: { id: number; filename: string; doc_type: string | null; status: string; extracted: Record<string, string> | null }[];
  discrepancies: {
    id: string; title: string; stated: string | number; stated_source: string; found: string | number;
    found_source: string; document_id: number | null; entries: [string, string][] | null; effect: string;
  }[];
  gaps: { label: string; why: string }[];
  suggested_requests: { title: string; doc_type: string; country: string; why: string }[];
  requests: { id: number; title: string; status: string; due_date: string | null }[];
  clarifications: { id: number; title: string; created_at: string }[];
  drafts: { title: string; draft: string | null; rules: string[] | null; where: string }[];
  proposed_changes: { id: number; label: string; from: string | null; to: string; quote: string | null }[];
  notes: { id: number; author: string; body: string; created_at: string }[];
  assessment: { id: number; headline: string; status: string } | null;
  can_sign_off: boolean;
  blockers: string[];
  deadlines: { date: string; label: string; kind: string }[];
  evidence: import("@/components/charts/evidence-matrix").EvidenceRow[];
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {}
    throw new Error(detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

const post = <T,>(path: string, body: unknown) =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getResidency = (caseId: number) => call<Residency>(`/cases/${caseId}/residency`);
export const getHoldings = (caseId: number) => call<Holding[]>(`/cases/${caseId}/holdings`);
export const getBrief = (caseId: number) => call<Brief>(`/cases/${caseId}/brief`);

export type OnboardingResult = { steps: { label: string; detail: string }[]; residency: { india: { year: string; status: string }[]; us: { year: string; status: string }[] } };
export const saveOnboarding = (caseId: number, body: unknown) => post<OnboardingResult>(`/cases/${caseId}/onboarding`, body);

export const requestDocuments = (caseId: number, items: { title: string; why: string; country?: string; doc_type?: string }[]) =>
  post<{ created: number }>(`/cases/${caseId}/document-requests`, items);
export const addNote = (caseId: number, body: string) => post<{ id: number }>(`/cases/${caseId}/notes`, { body });
export const askClarification = (caseId: number, question: string) =>
  post<{ id: number; review_status: string }>(`/cases/${caseId}/clarifications`, { question });
export const setItemStatus = (itemId: number, status: "open" | "blocked" | "done", by?: string) =>
  post<{ id: number; status: string }>(`/action-items/${itemId}/status`, { status, by });
export const remindCustomer = (itemId: number, by?: string) => post<{ id: number }>(`/action-items/${itemId}/remind`, { by });
export const setReviewStatus = (caseId: number, status: string) => post<{ review_status: string }>(`/cases/${caseId}/review-status`, { status });

export const resetJourney = (key: string) => post<{ case_id: number; conversation_id: number }>(`/demo/journeys/${key}/reset`, {});

/* -------------------------------------------------------------- display helpers */

export const STATUS_SHORT: Record<ResidencyYear["status"], string> = {
  NR: "Non-resident",
  RNOR: "RNOR",
  ROR: "Resident (ROR)",
  RESIDENT: "Resident",
  DUAL: "Dual-status",
  NONRESIDENT: "Non-resident",
};

/** Band edges in the band's currency; `hi` null means open-ended. */
export function bandRange(band: string): { lo: number; hi: number | null } {
  const unit = (s: string) => {
    const n = parseFloat(s.replace(/[^\d.]/g, ""));
    if (/cr/i.test(s)) return n * 1e7;
    if (/l/i.test(s)) return n * 1e5;
    if (/k/i.test(s)) return n * 1e3;
    return n;
  };
  const clean = band.replace(/[₹$,\s]/g, "");
  if (/^under/i.test(clean)) return { lo: 0, hi: unit(clean.replace(/^under/i, "")) };
  if (/^over/i.test(clean)) return { lo: unit(clean.replace(/^over/i, "")), hi: null };
  const [a, b] = clean.split(/[–-]/);
  // No numeric range (e.g. "Amount not given yet"): nothing to draw.
  if (!b || !/\d/.test(a)) return { lo: 0, hi: 0 };
  const hi = unit(b);
  // "5–25L": the unit on the right applies to the left too.
  const lo = /[a-z]$/i.test(a) ? unit(a) : unit(a + b.replace(/[\d.]/g, ""));
  return { lo, hi };
}

/* -------------------------------------------------------------- documents (prototype samples) */

export type SampleFile = { doc_type: string; filename: string; title: string; issuer: string; pages: number; size_kb: number; modified: string };
export type Reading = {
  title: string;
  issuer: string;
  period: string;
  pages: number;
  fields: { label: string; value: string; confidence: number; page?: number }[];
  effects: string[];
  mismatch: { title: string; stated: string; found: string; effect: string } | null;
};
export type DocReading = {
  id: number;
  filename: string;
  doc_type: string | null;
  status: string;
  created_at: string | null;
  extraction: (Reading & { synthetic?: boolean; field_list?: Reading["fields"]; scan?: { status: "clean" | "threat"; engine: string; at: string } }) | null;
};

export const listSamples = (caseId: number, docType?: string | null) =>
  call<SampleFile[]>(`/cases/${caseId}/sample-documents${docType ? `?doc_type=${encodeURIComponent(docType)}` : ""}`);
export const uploadSample = (caseId: number, docType: string, requestId?: number | null, by = "customer") =>
  post<Reading & { document_id: number; filename: string }>(`/cases/${caseId}/sample-documents`, { doc_type: docType, request_id: requestId ?? null, by });
export const listReadings = (caseId: number) => call<DocReading[]>(`/cases/${caseId}/document-readings`);

export const getPortfolio = () => call<import("@/components/charts/portfolio").Portfolio>(`/dashboard/portfolio`);

/** A question the customer addresses to their case captain from the workspace. */
export const askCaptain = (caseId: number, question: string, by?: string) =>
  post<{ id: number; owner: string; sla_due_at: string | null }>(`/cases/${caseId}/questions`, { question, by });
/** The expert's decision on a document the customer sent. */
export const reviewDocument = (documentId: number, decision: "accept" | "reject", by: string, reason?: string) =>
  post<{ id: number; status: string; request_status: string | null }>(`/documents/${documentId}/review`, { decision, by, reason });

/* -------------------------------------------------------------- since your last visit */

export type BriefItem = {
  kind: "corrected" | "confirmed" | "answered" | "document_accepted" | "document_returned" | "request" | "signed_off" | "settled" | "estimate" | "saving";
  at: string;
  actor: string | null;
  title: string;
  detail: string | null;
  before: string | null;
  href: string | null;
};
export type Briefing = { since: string; items: BriefItem[]; recent: BriefItem[] };

/** Records this Overview visit; returns when the previous visit started. */
export const recordVisit = (caseId: number) => call<{ since: string; first_visit: boolean }>(`/cases/${caseId}/visit`, { method: "POST" });
export const getBriefing = (caseId: number, since: string) => call<Briefing>(`/cases/${caseId}/briefing?since=${encodeURIComponent(since)}`);

/* -------------------------------------------------------------- expert entries: tax figures and ways to save */

export type SavingOption = { key: string; country: "IN" | "US"; title: string; law: string; what: string };
export type Saving = {
  id: number;
  option: string;
  title: string;
  law: string;
  what: string;
  country: "IN" | "US";
  why: string | null;
  amount: number | null;
  currency: "INR" | "USD" | null;
  deadline: string | null;
  author: string;
  date: string;
  status: string;
};
export type EstimateInput = {
  country: "IN" | "US";
  year: string;
  form: string;
  liability: number;
  withheld: number;
  due: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  basis: string;
  status: "estimate" | "reviewed";
  by: string;
};

export const listSavingOptions = () => call<SavingOption[]>("/saving-options");
export const listSavings = (caseId: number) => call<Saving[]>(`/cases/${caseId}/savings`);
export const enterEstimate = (caseId: number, body: EstimateInput) => post<unknown>(`/cases/${caseId}/tax-estimate`, body);
export const addSaving = (caseId: number, body: { option: string; why: string; amount: number; deadline: string | null; by: string }) => post<Saving>(`/cases/${caseId}/savings`, body);
export const withdrawSaving = (id: number, by: string) => post<Saving>(`/savings/${id}/withdraw`, { by });

/* -------------------------------------------------------------- magic links (sign-in and payment) */

export type MagicLinkInfo = {
  status: "valid" | "expired" | "used" | "invalid";
  purpose: "signin" | "pay" | null;
  case_id: number | null;
  client_name: string | null;
  phone: string | null;
  target: string | null;
  expires_at: string | null;
  used_at: string | null;
  payload: { offering: "advisory" | "full"; household: "individual" | "couple"; payment_method: "upi" | "card" | "netbanking"; name: string; price_inr: number; paid_at?: string } | null;
};
export const readLink = (token: string) => call<MagicLinkInfo>(`/magic-links/${encodeURIComponent(token)}`);
export const openLink = (token: string) => post<MagicLinkInfo>(`/magic-links/${encodeURIComponent(token)}/open`, {});
export const renewLink = (token: string) => post<MagicLinkInfo>(`/magic-links/${encodeURIComponent(token)}/renew`, {});
export const createPayLink = (
  caseId: number,
  body: { offering: "advisory" | "full"; household: "individual" | "couple"; payment_method: "upi" | "card" | "netbanking"; scope_confirmed: boolean; nda_accepted: boolean; consent: boolean }
) => post<MagicLinkInfo & { token?: string }>(`/cases/${caseId}/pay-links`, body);
export const payWithLink = (token: string, payment_method?: string) => post<MagicLinkInfo>(`/pay-links/${encodeURIComponent(token)}/pay`, { payment_method });

/* -------------------------------------------------------------- accounts */

export class FieldError extends Error {
  constructor(public field: string | null, message: string, public caseId?: number) {
    super(message);
  }
}
async function postRaw<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    if (d && typeof d === "object" && !Array.isArray(d)) throw new FieldError(d.field ?? null, d.message ?? "Something went wrong", d.case_id);
    throw new FieldError(null, typeof d === "string" ? d : "Please check the details and try again");
  }
  return data as T;
}
export const signUp = (body: { name: string; country_code: "+91" | "+1"; number: string; email: string | null; consent: boolean }) =>
  postRaw<{ case_id: number; phone: string }>("/signup", body);
export type Expert = { name: string; email: string; qualification: string | null; role: string };
export const expertCode = (email: string) => postRaw<{ sent_to: string }>("/experts/sign-in/code", { email });
export const expertSignIn = (email: string, code: string) => postRaw<Expert>("/experts/sign-in", { email, code });
export const expertSignUp = (body: { name: string; email: string; qualification: string }) => postRaw<Expert>("/experts/sign-up", body);

/* -------------------------------------------------------------- alerts: unread expert messages, to-dos, customer replies */

export type InboxMessage = { id: number; author: string; content: string; at: string };
export type InboxTodo = { key: string; kind: "confirm" | "upload" | "reply"; title: string; due: string | null; href: string };
export type CustomerInbox = { unread: InboxMessage[]; todos: InboxTodo[]; count: number };
export type CustomerReply = { case_id: number; customer: string; captain: string; to_message: string; texts: string[]; at: string; new: boolean; asked?: boolean };

export const getInbox = (caseId: number) => call<CustomerInbox>(`/cases/${caseId}/inbox`);
export const markInboxRead = (caseId: number) => call<{ ok: boolean }>(`/cases/${caseId}/inbox/read`, { method: "POST" });
export const getCaseReply = (caseId: number) => call<CustomerReply | null>(`/cases/${caseId}/replies`);
export const getExpertInbox = (expert?: string | null) => call<CustomerReply[]>(`/experts/inbox${expert ? `?expert=${encodeURIComponent(expert)}` : ""}`);
export const markExpertSeen = (caseId: number) => call<{ ok: boolean }>(`/cases/${caseId}/expert-seen`, { method: "POST" });

/* -------------------------------------------------------------- profile edits by the customer */

export type ProfileEdit = { target: "fact" | "member"; id: number; field?: "citizenship" | "visa_status"; value: string; by: string };
export const editProfile = (caseId: number, edit: ProfileEdit) => post<{ changed: boolean }>(`/cases/${caseId}/profile-edits`, edit);
