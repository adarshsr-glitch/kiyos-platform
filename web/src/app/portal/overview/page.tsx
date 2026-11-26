import { redirect } from "next/navigation";
import { getCase, listDocumentRequests, listProfileChanges } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { Overview } from "@/components/portal/overview";
import { getBriefing, getResidency, listSavings, recordVisit } from "@/lib/residency";

export const metadata = { title: "Overview · Kiyos" };

export default async function OverviewPage() {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const [requests, changes, residency] = await Promise.all([listDocumentRequests(id), listProfileChanges(id), getResidency(id).catch(() => null)]);
  // "Since your last visit": record this visit, then read what changed since the one before.
  const visit = await recordVisit(id).catch(() => null);
  const [briefing, savings] = await Promise.all([visit ? getBriefing(id, visit.since).catch(() => null) : null, listSavings(id).catch(() => [])]);
  return (
    <Overview
      caseData={caseData}
      requests={requests}
      changes={changes}
      residency={residency}
      briefing={briefing}
      savings={savings}
    />
  );
}
