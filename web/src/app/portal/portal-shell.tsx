"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { tierOf } from "@/lib/tier";
import { whatsappHref } from "@/lib/whatsapp";
import { PortalNav, PortalTabBar } from "@/components/portal/portal-nav";
import { DemoSwitcher } from "@/components/portal/demo-switcher";
import { ViewToggle } from "@/components/view-toggle";
import { CustomerProvider } from "@/lib/customer-context";
import type { CaseDetail, ConversationState } from "@/lib/types";

export function PortalShell({
  caseData,
  conversation,
  children,
}: {
  caseData: CaseDetail;
  conversation: ConversationState | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const chatPage = pathname === "/portal/chat";
  const signedOut = caseData.journey === "signup";

  return (
    <CustomerProvider caseData={caseData}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1440px] items-stretch gap-8 px-4 sm:px-6">
            <Link href="/portal" className="brand-wordmark flex items-center text-xl uppercase text-primary">
              Kiyos
            </Link>
            {!signedOut && <PortalNav />}
            <div className="ml-auto flex items-center gap-2">
              {whatsappHref && tierOf(caseData) === "premium" && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted lg:inline-flex"
                >
                  <MessageCircle className="h-4 w-4" /> Message on WhatsApp
                </a>
              )}
              <div className="hidden md:block">
                <DemoSwitcher />
              </div>
              <ViewToggle className="shrink-0" />
            </div>
          </div>
        </header>

        {chatPage ? (
          children
        ) : (
          <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
            <main className="min-w-0">{children}</main>
          </div>
        )}

        {!signedOut && <PortalTabBar />}
      </div>
    </CustomerProvider>
  );
}
