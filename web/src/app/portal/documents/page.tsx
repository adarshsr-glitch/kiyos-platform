import { redirect } from "next/navigation";
import { getCase, listDocumentRequests } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { DocumentRequests } from "@/components/portal/document-requests";

export default async function DocumentsPage() {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") redirect("/portal");
  const requests = await listDocumentRequests(id);
  return <DocumentRequests caseData={caseData} requests={requests} />;
}
