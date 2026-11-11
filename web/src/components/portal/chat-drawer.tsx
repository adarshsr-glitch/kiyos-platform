"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat-panel";
import { useCustomer } from "@/lib/customer-context";
import { usePathname } from "next/navigation";

const PAGE_CONTEXT: Record<string, string> = {
  "/portal/dashboard": "About your case",
  "/portal/documents": "About your documents",
  "/portal/assessment": "About your assessment",
  "/portal/pricing": "About pricing plans",
  "/portal/onboarding": "Help with onboarding",
  "/portal/initial-report": "About your report",
  "/portal/upgrade": "About upgrading",
};

export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const { tier } = useCustomer();
  const pathname = usePathname();

  if (tier === "onboarding") return null;

  // Chat is embedded inline on the dashboard — hide the floating button there
  if (pathname === "/portal/dashboard") return null;

  const context = PAGE_CONTEXT[pathname] ?? "Ask Kiyos";

  const suggestedPrompts = [
    "What documents do I need?",
    "Explain my assessment",
    "What are my next steps?",
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Floating trigger button */}
      <DialogPrimitive.Trigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Slide-over panel */}
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[90vw] flex-col border-l bg-card shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-300"
          )}
        >
          {/* Drawer header */}
          <div className="flex h-12 items-center justify-between border-b px-4">
            <div>
              <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                Ask Kiyos
              </DialogPrimitive.Title>
              <p className="text-[10px] text-muted-foreground">{context}</p>
            </div>
            <DialogPrimitive.Close className="rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Chat content */}
          <div className="flex-1 min-h-0">
            <ChatPanel
              conversationId={1}
              initialMessages={[]}
              suggestedPrompts={suggestedPrompts}
              embedded
              portalMode
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
