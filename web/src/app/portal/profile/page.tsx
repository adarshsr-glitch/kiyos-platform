import { redirect } from "next/navigation";
import { getCase, getInitialScan, listDocumentRequests, listProfileChanges } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { Profile } from "@/components/portal/profile";
import { getResidency, listSavings } from "@/lib/residency";

export const metadata = { title: "Profile · Kiyos" };

export default async function ProfilePage() {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const [changes, scan, residency, requests, savings] = await Promise.all([
    listProfileChanges(id),
    getInitialScan(id).catch(() => null),
    getResidency(id).catch(() => null),
    listDocumentRequests(id).catch(() => []),
    listSavings(id).catch(() => []),
  ]);
  return <Profile caseData={caseData} changes={changes} scan={scan} residency={residency} requests={requests} savings={savings} />;
}
