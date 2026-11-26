/** Types matching the Pydantic response models from api/main.py */

export interface CaseListItem {
  id: number;
  name: string;
  client_name: string;
  status: string;
  jurisdictions: string | null;
  case_captain: string;
  arrival_date: string | null;
  tax_year: string | null;
  updated_at: string;
  open_items_count: number;
  open_topics_count: number;
  open_notices_count: number;
  /** Customer questions waiting for an expert. */
  open_tickets_count?: number;
  /** Assessments in draft or review. */
  awaiting_signoff_count?: number;
  plan: "free" | "premium";
  journey: Journey;
}

/**
 * Where a customer is in the funnel, computed by the API so both workspaces agree:
 * scan running → scan done but workspace not opened → free → plan chosen but payment
 * failed → paid.
 */
export type Journey = "intake" | "signup" | "free" | "payment_pending" | "paid";

export interface Fact {
  id: number;
  key: string;
  value: string;
  unit: string | null;
  source: string | null;
  as_of: string | null;
  /** Exactly where the value came from (api/evidence.py). */
  evidence?: Evidence | null;
  /** Why the customer can't edit it themselves (from a document, or worked out), if so. */
  locked?: string | null;
}

/** One line read from a document, with the page it sits on. */
export type EvidenceLine = { page: number; label: string; value: string; section?: string };

/** Where a value came from: a document line, an answer the customer gave, the expert, or demo data. */
export type Evidence =
  | { kind: "document"; document_id: number | null; filename: string; title: string; issuer: string | null; pages: number | null; lines: EvidenceLine[]; note?: string; /** A sample reference made for the prototype */ sample?: boolean }
  | { kind: "answer"; channel: "WhatsApp" | "Onboarding"; question: string; answer: string; at: string | null }
  | { kind: "said"; channel: "WhatsApp" | "Chat"; quote: string | null; said_at: string | null; confirmed_at: string | null; previous: string | null }
  | { kind: "expert"; by: string | null; at: string | null }
  | { kind: "demo" };

export interface DocumentItem {
  id: number;
  filename: string;
  doc_type: string | null;
  status: string;
  created_at?: string | null;
}

export interface DerivationStep {
  rule_id: string;
  summary: string;
  inputs_used: Record<string, unknown> | null;
  output: unknown;
}

export interface Assessment {
  id: number;
  headline: string;
  amount: number | null;
  currency: string | null;
  status: string;
  derivation_trail: DerivationStep[] | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  name: string;
  role: "primary" | "spouse" | "dependent";
  citizenship: string | null;
  visa_status: string | null;
  dob: string | null;
  notes: string | null;
}

export type Confidence =
  | "confirmed"
  | "likely"
  | "incomplete"
  | "review_needed";
export type TopicStatus = "open" | "in_progress" | "resolved";

export interface TaxTopic {
  id: number;
  topic_key: string;
  title: string;
  india_position: string | null;
  us_position: string | null;
  conclusion: string | null;
  confidence: Confidence;
  status: TopicStatus;
  next_action: string | null;
  owner: string | null;
  due_date: string | null;
}

export type RecommendationStatus =
  | "proposed"
  | "accepted"
  | "declined"
  | "implemented_reported"
  | "superseded";

export interface Recommendation {
  id: number;
  topic_id: number | null;
  author: string;
  content: string;
  rationale: string | null;
  status: RecommendationStatus;
  date: string;
  country?: string | null;
  amount?: number | null;
  currency?: string | null;
  deadline?: string | null;
}

export type ActionStatus = "open" | "blocked" | "done";

export interface ActionItem {
  id: number;
  title: string;
  assignee: "customer" | "kiyos" | "advisor";
  status: ActionStatus;
  due_date: string | null;
  owner: string | null;
  notes: string | null;
}

export interface Notice {
  id: number;
  authority: string;
  subject: string;
  received_at: string;
  deadline: string | null;
  status: "open" | "responded" | "resolved";
  response_filed_at: string | null;
}

export interface ScenarioResult {
  metric: string;
  value: string;
}

export interface Scenario {
  id: number;
  label: string;
  assumptions: string[] | null;
  results: ScenarioResult[] | null;
  recommended: boolean;
}

export interface CaseDetail {
  id: number;
  name: string;
  client_name: string;
  status: string;
  summary: string | null;
  jurisdictions: string | null;
  case_captain: string;
  arrival_date: string | null;
  tax_year: string | null;
  created_at: string;
  updated_at: string;
  facts: Fact[];
  documents: DocumentItem[];
  assessments: Assessment[];
  members: Member[];
  topics: TaxTopic[];
  recommendations: Recommendation[];
  action_items: ActionItem[];
  notices: Notice[];
  scenarios: Scenario[];
  conversation_id: number | null;
  profile_confirmed_at: string | null;
  plan: "free" | "premium";
  /** Where the customer is in the WhatsApp journey */
  stage: "intake" | "free" | "paid" | null;
  plan_choice: PlanChoice | null;
  activated_at: string | null;
  country_status: Partial<Record<"IN" | "US", CountryStatus>> | null;
  reviewers: Reviewer[] | null;
  /** WhatsApp number — the customer's identity, also used to sign in to the workspace */
  phone: string | null;
  journey: Journey;
}

export interface PlanChoice {
  offering: "advisory" | "full";
  name: string;
  household: "individual" | "couple";
  price_inr: number;
  price_usd: number;
  gst_included: boolean;
  payment_method: string;
  /** Set only once paid */
  receipt?: string;
  nda_accepted_at?: string;
  consent_at?: string;
  /** A checkout attempt that didn't complete */
  payment_status?: "failed";
  attempted_at?: string;
  failure_reason?: string;
}

export interface CountryStatus {
  status: string;
  label: string;
  year: string;
  filing: string;
  due: string;
  state: string;
  reviewed_by?: string;
}

export interface Reviewer {
  name: string;
  role: string;
  country: "IN" | "US" | "BOTH";
  qualification: string;
}

export interface RiskRow {
  area: string;
  country: "IN" | "US" | "BOTH";
  finding: string;
  why: string;
  input: string;
  input_question: string;
  confidence: "likely" | "incomplete" | string;
  rule: string | null;
  priced_separately: boolean;
}

export interface InitialScan {
  id: number;
  version: string;
  answers: Record<string, string>;
  rows: RiskRow[];
  missing: string[];
  confidence: "medium" | "partial" | "low" | string;
  household: "individual" | "couple";
  consent_saved: boolean;
  price_low_inr: number;
  price_high_inr: number;
  created_at: string;
}

export interface Plan {
  key: "advisory" | "full";
  name: string;
  summary: string;
  individual_inr: number;
  individual_usd: number;
  couple_inr: number;
  couple_usd: number;
}

export interface DocumentRequest {
  id: number;
  title: string;
  why: string;
  country: "IN" | "US" | "BOTH" | null;
  doc_type: string | null;
  status: "pending" | "received" | "reviewed" | "rejected";
  rejection_reason: string | null;
  document_id: number | null;
  filename: string | null;
  due_date: string | null;
}

export interface ProfileChange {
  id: number;
  fact_id: number | null;
  fact_key: string;
  previous_value: string | null;
  proposed_value: string;
  source: string;
  quote: string | null;
  affects: string | null;
  status: "proposed" | "confirmed" | "rejected";
  decided_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant" | "advisor" | "system";
  content: string;
  author?: string | null;
  /** 0..1 on agent answers; below the routing threshold the question went to an advisor */
  confidence?: number | null;
  routed?: boolean;
  cited_rules?: string[] | null;
  /** Free-plan classification of a customer question */
  category?: "generic" | "generic_unanswered" | "generic_over_limit" | "personal" | null;
  /** Call-to-action rendered under an agent message */
  action?: { type: "plans" | "upload" | "verify" | string; label: string; href: string; target?: string; token?: string; expires_at?: string } | null;
  /** WhatsApp quick-reply buttons offered with an agent message */
  options?: string[] | null;
  created_at: string;
}

export interface FreeUsage {
  generic_used: number;
  generic_limit: number;
}

export interface ConversationState {
  id: number;
  case_id: number;
  controller: "agent" | "advisor";
  controller_name: string | null;
  plan: "free" | "premium";
  stage: "intake" | "free" | "paid" | null;
  usage: FreeUsage | null;
  intake_progress: { answered: number; total: number } | null;
  messages: Message[];
}

export interface SendResult {
  messages: Message[];
  conversation: ConversationState;
}

export interface Ticket {
  id: number;
  case_id: number;
  client_name: string | null;
  conversation_id: number | null;
  question: string;
  draft_answer: string | null;
  confidence: number;
  reason: string | null;
  cited_rules: string[] | null;
  status: "open" | "resolved";
  owner: string | null;
  sla_due_at: string | null;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CaseEvent {
  id: number;
  case_id: number;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface AiCallEntry {
  id: number;
  service: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  created_at: string;
}

export interface RuleDetail {
  id: string;
  summary: string;
  markdown: string | null;
}

export interface DashboardStats {
  open_cases: number;
  awaiting_signoff: number;
  open_action_items: number;
  open_notices: number;
  cases_this_week: number;
  assessments_total: number;
  ai_calls_last_7d: number;
  open_tickets: number;
  tickets_overdue: number;
  captain_workload: { captain: string; count: number }[];
}

export interface ActivityEntry {
  at: string;
  case_id: number;
  case_name: string;
  client_name: string;
  actor: string;
  verb: string;
  object: string;
}
