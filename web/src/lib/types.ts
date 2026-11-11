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
}

export interface Fact {
  id: number;
  key: string;
  value: string;
  unit: string | null;
  source: string | null;
  as_of: string | null;
}

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
  action?: { type: "plans" | "upload" | "verify" | string; label: string; href: string } | null;
  created_at: string;
}

export interface FreeUsage {
  generic_used: number;
  generic_limit: number;
  messages_used: number;
  messages_limit: number;
}

export interface ConversationState {
  id: number;
  case_id: number;
  controller: "agent" | "advisor";
  controller_name: string | null;
  plan: "free" | "premium";
  usage: FreeUsage | null;
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
