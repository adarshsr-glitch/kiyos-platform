"use client";

import { ChatPanel } from "@/components/chat-panel";
import { useCustomer } from "@/lib/customer-context";
import { FREE_PROMPTS, PREMIUM_PROMPTS, welcomeMessage } from "@/lib/portal-chat";
import type { CaseDetail, Message } from "@/lib/types";

/** Full-screen on phones (like opening the chat in WhatsApp); a framed thread on desktop. */
export function ChatPageClient({
  caseData,
  initialMessages,
}: {
  caseData: CaseDetail;
  initialMessages: Message[];
}) {
  const { tier } = useCustomer();
  if (!caseData.conversation_id) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Your conversation will appear here once your case is set up.
      </p>
    );
  }
  const messages =
    initialMessages.length === 0
      ? [welcomeMessage(caseData.client_name.split(" ")[0], tier)]
      : initialMessages;

  return (
    <div className="fixed inset-0 z-50 lg:static lg:z-auto lg:mx-auto lg:h-[calc(100vh-120px)] lg:max-w-3xl">
      <ChatPanel
        conversationId={caseData.conversation_id}
        initialMessages={messages}
        caseClientName={caseData.client_name}
        suggestedPrompts={tier === "premium" ? PREMIUM_PROMPTS : FREE_PROMPTS}
        caseId={caseData.id}
        captainName={caseData.case_captain}
        backHref="/portal/dashboard"
        className="lg:rounded-xl lg:border lg:shadow-sm"
        portalMode
      />
    </div>
  );
}
