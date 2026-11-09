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
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export function listCases(): Promise<CaseListItem[]> {
  return apiFetch<CaseListItem[]>("/cases");
}

export function getCase(id: number | string): Promise<CaseDetail> {
  return apiFetch<CaseDetail>(`/cases/${id}`);
}

export function listMessages(convId: number | string): Promise<Message[]> {
  return apiFetch<Message[]>(`/conversations/${convId}/messages`);
}

export function sendMessage(
  convId: number | string,
  content: string
): Promise<Message> {
  return apiFetch<Message>(`/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function listAuditLog(caseId: number | string): Promise<AiCallEntry[]> {
  return apiFetch<AiCallEntry[]>(`/cases/${caseId}/audit`);
}

export function getRule(ruleId: string): Promise<RuleDetail> {
  return apiFetch<RuleDetail>(`/rules/${ruleId}`);
}
