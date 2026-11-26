import { redirect } from "next/navigation";
import { getCase, getConversation, getInitialScan } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { moved } from "@/lib/moved";
import { RiskMap } from "@/components/portal/risk-map";
import { getHoldings, getResidency } from "@/lib/residency";

export const metadata = { title: "Assessment · Kiyos" };

/** The free assessment (risk map). On a paid plan this is the Tax position page instead. */
export default async function AssessmentPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const id = portalCaseId();
  const [caseData, scan] = await Promise.all([getCase(id), getInitialScan(id)]);
  const tier = tierOf(caseData);
  if (tier === "onboarding") redirect("/portal/welcome");
  if (caseData.journey === "signup") redirect("/portal/signin");
  if (tier === "premium") moved("/portal/tax-position", searchParams);

  const [residency, holdings] = await Promise.all([getResidency(id).catch(() => null), getHoldings(id).catch(() => [])]);
  const convo = caseData.conversation_id ? await getConversation(caseData.conversation_id) : null;
  return <RiskMap scan={scan} usage={convo?.usage ?? null} residency={residency} holdings={holdings} />;
}
