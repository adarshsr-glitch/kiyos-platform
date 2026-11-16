import { redirect } from "next/navigation";
import { getCase, getInitialScan, listPlans } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { PlanCheckout, CurrentPlan } from "@/components/portal/plan-checkout";

export default async function PlansPage() {
  const id = portalCaseId();
  const [caseData, scan, plans] = await Promise.all([getCase(id), getInitialScan(id), listPlans()]);
  const tier = tierOf(caseData);
  if (tier === "onboarding") redirect("/portal/welcome");
  if (caseData.journey === "signup") redirect("/portal/signin");
  if (tier === "premium") return <CurrentPlan caseData={caseData} />;
  return <PlanCheckout caseData={caseData} scan={scan} plans={plans} />;
}
