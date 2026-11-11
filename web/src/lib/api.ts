/**
 * Typed API client — all calls go through here.
 * Reads NEXT_PUBLIC_API_URL from env; defaults to localhost:8000.
 */

import type {
  CaseListItem,
  CaseDetail,
  Message,
  AiCallEntry,
  RuleDetail,
  Member,
  TaxTopic,
  Recommendation,
  ActionItem,
  Notice,
  Scenario,
  DashboardStats,
  ActivityEntry,
  Assessment,
  ConversationState,
  SendResult,
  Ticket,
  CaseEvent,
  DocumentItem,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`API ${status}: ${detail}`);
  }
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      detail = JSON.parse(body).detail ?? body;
    } catch {}
    throw new ApiError(res.status, detail || res.statusText);
  }

  return res.json() as Promise<T>;
}

export function listCases(): Promise<CaseListItem[]> {
  return apiFetch<CaseListItem[]>("/cases");
}

export function getCase(id: number | string): Promise<CaseDetail> {
  return apiFetch<CaseDetail>(`/cases/${id}`);
}

export function listMembers(caseId: number | string): Promise<Member[]> {
  return apiFetch<Member[]>(`/cases/${caseId}/members`);
}

export function listTopics(caseId: number | string): Promise<TaxTopic[]> {
  return apiFetch<TaxTopic[]>(`/cases/${caseId}/topics`);
}

export function listRecommendations(
  caseId: number | string
): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/cases/${caseId}/recommendations`);
}

export function listActionItems(
  caseId: number | string
): Promise<ActionItem[]> {
  return apiFetch<ActionItem[]>(`/cases/${caseId}/action-items`);
}

export function listNotices(caseId: number | string): Promise<Notice[]> {
  return apiFetch<Notice[]>(`/cases/${caseId}/notices`);
}

export function listScenarios(caseId: number | string): Promise<Scenario[]> {
  return apiFetch<Scenario[]>(`/cases/${caseId}/scenarios`);
}

export function listMessages(convId: number | string): Promise<Message[]> {
  return apiFetch<Message[]>(`/conversations/${convId}/messages`);
}

export function getConversation(convId: number | string): Promise<ConversationState> {
  return apiFetch<ConversationState>(`/conversations/${convId}`);
}

export function sendMessage(
  convId: number | string,
  content: string
): Promise<SendResult> {
  return postJson<SendResult>(`/conversations/${convId}/messages`, { content });
}

export function sendAdvisorMessage(
  convId: number | string,
  advisor: string,
  content: string,
  mode: "direct" | "via_agent"
): Promise<SendResult> {
  return postJson<SendResult>(`/conversations/${convId}/advisor-messages`, {
    advisor,
    content,
    mode,
  });
}

export function takeOverConversation(
  convId: number | string,
  advisor: string
): Promise<ConversationState> {
  return postJson<ConversationState>(`/conversations/${convId}/takeover`, { advisor });
}

export function handBackConversation(
  convId: number | string,
  advisor: string
): Promise<ConversationState> {
  return postJson<ConversationState>(`/conversations/${convId}/handback`, { advisor });
}

export function listOpenTickets(): Promise<Ticket[]> {
  return apiFetch<Ticket[]>("/tickets?status=open");
}

export function listCaseTickets(caseId: number | string): Promise<Ticket[]> {
  return apiFetch<Ticket[]>(`/cases/${caseId}/tickets`);
}

export function resolveTicket(
  ticketId: number,
  advisor: string,
  answer: string | null,
  note?: string
): Promise<Ticket> {
  return postJson<Ticket>(`/tickets/${ticketId}/resolve`, { advisor, answer, note });
}

export function reviewAssessment(
  assessmentId: number,
  action: "sign_off" | "request_changes",
  reviewer: string,
  note?: string
): Promise<Assessment> {
  return postJson<Assessment>(`/assessments/${assessmentId}/review`, {
    action,
    reviewer,
    note,
  });
}

export function listCaseEvents(caseId: number | string): Promise<CaseEvent[]> {
  return apiFetch<CaseEvent[]>(`/cases/${caseId}/events`);
}

export function verifyProfile(
  caseId: number | string,
  confirmedBy: string,
  facts: { id: number; value: string }[]
): Promise<CaseDetail> {
  return postJson<CaseDetail>(`/cases/${caseId}/verify`, {
    confirmed_by: confirmedBy,
    facts,
  });
}

export function uploadDocument(
  caseId: number | string,
  file: File,
  docType: string | null
): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", file);
  if (docType) form.append("doc_type", docType);
  return apiFetch<DocumentItem>(`/cases/${caseId}/documents`, {
    method: "POST",
    body: form,
  });
}

export function requestAdvisorCall(
  caseId: number | string,
  slot: string,
  requestedBy: string
): Promise<ActionItem> {
  return postJson<ActionItem>(`/cases/${caseId}/call-requests`, {
    slot,
    requested_by: requestedBy,
  });
}

export function listAuditLog(caseId: number | string): Promise<AiCallEntry[]> {
  return apiFetch<AiCallEntry[]>(`/cases/${caseId}/audit`);
}

export function getRule(ruleId: string): Promise<RuleDetail> {
  return apiFetch<RuleDetail>(`/rules/${ruleId}`);
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/dashboard/stats");
}

export function getDashboardActivity(): Promise<ActivityEntry[]> {
  return apiFetch<ActivityEntry[]>("/dashboard/activity");
}
