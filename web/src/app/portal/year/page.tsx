import { redirect } from "next/navigation";
import { getCase, listCaseTickets, listDocumentRequests } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { getResidency } from "@/lib/residency";
import { YearAtAGlance } from "@/components/portal/year-at-a-glance";

export const metadata = { title: "Year at a glance · Kiyos" };

export default async function YearPage({ searchParams }: { searchParams: { y?: string } }) {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const [requests, tickets, residency] = await Promise.all([
    listDocumentRequests(id),
    listCaseTickets(id).catch(() => []),
    getResidency(id).catch(() => null),
  ]);
  const y = Number(searchParams.y);
  return <YearAtAGlance caseData={caseData} requests={requests} tickets={tickets} residency={residency} year={Number.isInteger(y) && y > 2000 ? y : undefined} />;
}
