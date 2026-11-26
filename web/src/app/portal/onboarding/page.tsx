import { redirect } from "next/navigation";
import { getCase, getInitialScan } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { OnboardingForm } from "@/components/portal/onboarding-form";

export const metadata = { title: "Getting started · Kiyos" };

export default async function OnboardingPage() {
  const id = portalCaseId();
  const [caseData, scan] = await Promise.all([getCase(id), getInitialScan(id)]);
  if (tierOf(caseData) === "onboarding") redirect("/portal/welcome");
  if (caseData.journey === "signup") redirect("/portal/signin");
  // A paid customer's record is maintained through Profile (proposed changes) and
  // documents; re-running onboarding would replace it with ranges.
  if (tierOf(caseData) === "premium") redirect("/portal/profile");
  return <OnboardingForm caseId={id} firstName={caseData.client_name.split(" ")[0]} answers={scan?.answers ?? {}} />;
}
