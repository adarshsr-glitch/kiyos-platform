import { redirect } from "next/navigation";
import { getCase, getConversation, getInitialScan } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { RiskMap } from "@/components/portal/risk-map";
import { TaxPosition } from "@/components/portal/tax-position";

export default async function AssessmentPage() {
  const id = portalCaseId();
  const [caseData, scan] = await Promise.all([getCase(id), getInitialScan(id)]);
  const tier = tierOf(caseData);
  if (tier === "onboarding") redirect("/portal/welcome");
  if (caseData.journey === "signup") redirect("/portal/signin");

  if (tier === "premium") return <TaxPosition caseData={caseData} scan={scan} />;

  const convo = caseData.conversation_id ? await getConversation(caseData.conversation_id) : null;
  return <RiskMap scan={scan} usage={convo?.usage ?? null} />;
}
