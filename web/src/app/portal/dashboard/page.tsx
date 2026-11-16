import { redirect } from "next/navigation";
import { getCase, listCaseTickets, listDocumentRequests, listProfileChanges } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { Overview } from "@/components/portal/overview";

export default async function OverviewPage() {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const [requests, changes, tickets] = await Promise.all([
    listDocumentRequests(id),
    listProfileChanges(id),
    listCaseTickets(id),
  ]);
  return <Overview caseData={caseData} requests={requests} changes={changes} tickets={tickets} />;
}
