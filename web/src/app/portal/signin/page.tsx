import { redirect } from "next/navigation";
import { getCase, getInitialScan } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { SignIn } from "@/components/portal/sign-in";

/** The first visit from a WhatsApp link: confirm the number before the workspace opens. */
export default async function SignInPage() {
  const id = portalCaseId();
  const [caseData, scan] = await Promise.all([getCase(id), getInitialScan(id)]);
  if (caseData.journey !== "signup") redirect("/portal");
  return <SignIn caseData={caseData} areas={scan?.rows.length ?? 0} />;
}
