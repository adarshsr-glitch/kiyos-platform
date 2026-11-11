import { getCase, listMessages } from "@/lib/api";
import { ChatPanel } from "@/components/chat-panel";

const CUSTOMER_PROMPTS = [
  "What documents do I need?",
  "Explain my tax assessment",
  "What are my next steps?",
  "When is my next deadline?",
];

export default async function PortalChatPage() {
  const caseData = await getCase(1);
  const messages = caseData.conversation_id
    ? await listMessages(caseData.conversation_id)
    : [];

  return (
    <div className="rounded-xl border bg-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
      {caseData.conversation_id ? (
        <ChatPanel
          conversationId={caseData.conversation_id}
          initialMessages={messages}
          caseClientName={caseData.client_name}
          suggestedPrompts={CUSTOMER_PROMPTS}
          fullPage
          portalMode
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No conversation started for your case yet. Check back soon.
          </p>
        </div>
      )}
    </div>
  );
}
