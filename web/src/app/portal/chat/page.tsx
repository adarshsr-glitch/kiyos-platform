import { getCase, listMessages } from "@/lib/api";
import { ChatPageClient } from "./chat-page-client";

export default async function PortalChatPage() {
  const caseData = await getCase(1);
  const messages = caseData.conversation_id ? await listMessages(caseData.conversation_id) : [];
  return <ChatPageClient caseData={caseData} initialMessages={messages} />;
}
