/** Types matching the Pydantic response models from api/main.py */

export interface CaseListItem {
  id: number;
  name: string;
  client_name: string;
  status: string;
  jurisdictions: string | null;
  case_captain: string;
  updated_at: string;
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
  conversation_id: number | null;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
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
