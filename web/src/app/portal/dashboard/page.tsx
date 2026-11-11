import { getCase, listMessages } from "@/lib/api";
import { DashboardClient } from "./dashboard-client";

export default async function PortalDashboardPage() {
  const caseData = await getCase(1);
  const messages = caseData.conversation_id
    ? await listMessages(caseData.conversation_id)
    : [];

  return <DashboardClient caseData={caseData} initialMessages={messages} />;
}
