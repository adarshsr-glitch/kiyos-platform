import { redirect } from "next/navigation";
import { getCase, listProfileChanges } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { Profile } from "@/components/portal/profile";

export default async function ProfilePage() {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const changes = await listProfileChanges(id);
  return <Profile caseData={caseData} changes={changes} />;
}
