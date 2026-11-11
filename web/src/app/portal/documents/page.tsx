import { getCase } from "@/lib/api";
import { DocumentChecklist } from "@/components/portal/document-checklist";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const caseData = await getCase(1);

  return (
    <DocumentsClient>
      <DocumentChecklist caseId={caseData.id} documents={caseData.documents} />
    </DocumentsClient>
  );
}
