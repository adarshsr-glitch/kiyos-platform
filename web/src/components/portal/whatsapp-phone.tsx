"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { useCustomer } from "@/lib/customer-context";
import { FREE_PROMPTS, PREMIUM_PROMPTS } from "@/lib/portal-chat";
import type { ConversationState, Message } from "@/lib/types";

/**
 * The customer's WhatsApp thread, framed as a phone beside the workspace. It shows
 * the conversation that brought the customer to the page they're on, and keeps the
 * workspace in step when the journey moves on (scan finished, plan activated, …).
 */
export function WhatsAppPhone({
  conversationId,
  initialMessages,
  fullScreen,
}: {
  conversationId: number;
  initialMessages: Message[];
  fullScreen?: boolean;
}) {
  const { caseData, tier } = useCustomer();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const anchorHref = search.toString() ? `${pathname}?${search.toString()}` : pathname;
  const lastStage = useRef<string | null | undefined>(undefined);
  const lastCount = useRef<number | null>(null);

  // Journey changes made in chat (scan saved, change confirmed…) refresh the workspace.
  const onState = useCallback(
    (state: ConversationState) => {
      const count = state.messages.length;
      const stageChanged = lastStage.current !== undefined && lastStage.current !== state.stage;
      const grew = lastCount.current !== null && count > lastCount.current;
      lastStage.current = state.stage;
      lastCount.current = count;
      if (stageChanged || grew) router.refresh();
    },
    [router]
  );

  const chat = (
    <ChatPanel
      conversationId={conversationId}
      initialMessages={initialMessages}
      caseClientName={caseData.client_name}
      suggestedPrompts={tier === "free" ? FREE_PROMPTS : tier === "premium" ? PREMIUM_PROMPTS : []}
      caseId={caseData.id}
      captainName={tier === "premium" ? caseData.case_captain : undefined}
      anchorHref={fullScreen ? undefined : anchorHref}
      backHref={fullScreen ? "/portal" : undefined}
      onState={onState}
      team={tier === "premium" ? caseData.reviewers : null}
      compact={!fullScreen}
      fullChatHref="/portal/chat"
      portalMode
    />
  );

  if (fullScreen) return chat;

  return (
    <figure className="mx-auto w-full max-w-[260px]">
      <div className="h-[min(520px,calc(100vh-140px))] min-h-[400px] overflow-hidden rounded-[28px] border-[7px] border-[#1d1f21] bg-[#1d1f21] shadow-[0_18px_36px_-20px_rgba(15,40,30,0.4)]">
        <div className="h-full overflow-hidden rounded-[21px]">{chat}</div>
      </div>
      <figcaption className="mt-2 text-center text-[10.5px] leading-snug text-muted-foreground">
        Your WhatsApp chat with Kiyos
      </figcaption>
    </figure>
  );
}
