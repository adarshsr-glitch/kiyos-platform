"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat-panel";
import { getCase } from "@/lib/api";
import { PORTAL_CASE_ID, useCustomer } from "@/lib/customer-context";
import { FREE_PROMPTS, PREMIUM_PROMPTS, welcomeMessage } from "@/lib/portal-chat";
import type { CaseDetail } from "@/lib/types";

/**
 * Desktop-only shortcut to the WhatsApp thread from pages that don't embed it.
 * On phones the Chat tab does this job.
 */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const { tier } = useCustomer();
  const pathname = usePathname();

  useEffect(() => {
    if (open && !caseData) getCase(PORTAL_CASE_ID).then(setCaseData).catch(() => {});
  }, [open, caseData]);

  if (tier === "onboarding" || pathname === "/portal/dashboard" || pathname === "/portal/chat") {
    return null;
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg transition hover:brightness-95 lg:flex"
          aria-label="Open chat with Kiyos"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-[400px] max-w-[95vw] shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
          )}
        >
          <DialogPrimitive.Title className="sr-only">Chat with Kiyos</DialogPrimitive.Title>
          {caseData?.conversation_id && (
            <ChatPanel
              conversationId={caseData.conversation_id}
              initialMessages={[welcomeMessage(caseData.client_name.split(" ")[0], tier)]}
              caseClientName={caseData.client_name}
              suggestedPrompts={tier === "premium" ? PREMIUM_PROMPTS : FREE_PROMPTS}
              caseId={caseData.id}
              captainName={caseData.case_captain}
              onBack={() => setOpen(false)}
              portalMode
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
