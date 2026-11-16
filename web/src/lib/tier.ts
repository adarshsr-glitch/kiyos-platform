import type { CaseDetail, Journey } from "./types";

/**
 * Where the customer is in the journey — derived from server state, never stored
 * in the browser, so the workspace and WhatsApp always agree.
 *   onboarding: the five-minute WhatsApp scan is still running
 *   free:       scan done; generic Q&A only, no case work
 *   premium:    a paid plan is active
 */
export type CustomerTier = "onboarding" | "free" | "premium";

export function tierOf(caseData: Pick<CaseDetail, "plan" | "stage">): CustomerTier {
  if (caseData.stage === "intake") return "onboarding";
  return caseData.plan === "premium" ? "premium" : "free";
}

/** Where the portal root sends each customer. */
export function homeFor(journey: Journey): string {
  return {
    intake: "/portal/welcome",
    signup: "/portal/signin",
    free: "/portal/assessment",
    payment_pending: "/portal/upgrade",
    paid: "/portal/dashboard",
  }[journey];
}

/** The same stages as short labels for the expert workspace. */
export const JOURNEY_LABEL: Record<Journey, string> = {
  intake: "Scan in progress",
  signup: "Lead",
  free: "Free",
  payment_pending: "Payment pending",
  paid: "Paid",
};
