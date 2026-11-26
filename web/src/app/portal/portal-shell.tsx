"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tierOf } from "@/lib/tier";
import { PortalSectionTitle, PortalSideNav, PortalTabBar } from "@/components/portal/portal-nav";
import { cn } from "@/lib/utils";
import { hasCaptain } from "@/lib/captain";
import { ViewToggle } from "@/components/view-toggle";
import { CustomerProvider } from "@/lib/customer-context";
import type { CaseDetail, CaseListItem, ConversationState } from "@/lib/types";
import { CustomerMenu } from "@/components/portal/customer-menu";
import { AskKiyos } from "@/components/portal/ask-kiyos";
import { UseCustomer } from "./use-customer";
import { InboxProvider } from "@/components/portal/inbox";

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function PortalShell({
  caseData,
  children,
  customers = [],
  fallbackId = null,
}: {
  caseData: CaseDetail;
  conversation: ConversationState | null;
  children: React.ReactNode;
  customers?: CaseListItem[];
  fallbackId?: number | null;
}) {
  const pathname = usePathname();
  const chatPage = pathname === "/portal/messages";
  const signedOut = caseData.journey === "signup";
  const captained = hasCaptain(caseData.case_captain);

  // The WhatsApp thread is a different surface from the workspace: no workspace chrome.
  if (pathname === "/portal/whatsapp") {
    return <CustomerProvider caseData={caseData}>{children}</CustomerProvider>;
  }

  // A customer still in the WhatsApp scan has no workspace yet: open the default customer.
  if (caseData.journey === "intake" && fallbackId && fallbackId !== caseData.id) {
    return <UseCustomer id={fallbackId} />;
  }

  return (
    <CustomerProvider caseData={caseData}>
      <InboxProvider caseId={caseData.id}>
      <div className="portal min-h-screen bg-background lg:flex">
        {/* Desktop: a side rail like the expert workspace, so sections never compete with content. */}
        {!signedOut && (
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] lg:flex">
            <div className="flex h-14 items-center px-5">
              <Link href="/portal" className="brand-wordmark text-xl uppercase text-primary">Kiyos</Link>
            </div>
            {/* The one switch between the customer's and the expert's side (keeps the case). */}
            <div className="free-roam-only border-t border-[hsl(var(--sidebar-border))] px-4 py-3">
              <ViewToggle caseId={caseData.id} />
            </div>
            <div className="border-y border-[hsl(var(--sidebar-border))] px-3 py-3">
              <CustomerMenu current={{ id: caseData.id, name: caseData.client_name, journey: caseData.journey }} customers={customers} block />
            </div>
            <PortalSideNav />
            <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] px-4 py-4">
              {captained && (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">{initials(caseData.case_captain)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{caseData.case_captain}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">Your expert</span>
                  </span>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          <header className="portal-sticky sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
            <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
              {/* Phones and tablets: brand and customer here; the sections are in the bottom bar. */}
              <div className={cn("flex items-center gap-4", !signedOut && "lg:hidden")}>
                <Link href="/portal" className="brand-wordmark flex items-center text-xl uppercase text-primary">Kiyos</Link>
                <CustomerMenu current={{ id: caseData.id, name: caseData.client_name, journey: caseData.journey }} customers={customers} />
              </div>
              {!signedOut && <PortalSectionTitle customer={caseData.client_name} />}
              <div className="ml-auto flex items-center gap-2">
                {tierOf(caseData) === "premium" && <AskKiyos caseData={caseData} />}
                {/* Phones and tablets have no side panel, so the side switch sits here. */}
                <ViewToggle compact caseId={caseData.id} className={cn("free-roam-only shrink-0", !signedOut && "lg:hidden")} />
              </div>
            </div>
          </header>

          {/* Messages sits closer to the header (the conversation wants the height); same side padding. */}
          <div className={cn("mx-auto max-w-[1480px] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-10", chatPage ? "pt-4" : "pt-6")}>
            <main className="min-w-0">{children}</main>
          </div>
        </div>

        {!signedOut && <PortalTabBar />}
      </div>
      </InboxProvider>
    </CustomerProvider>
  );
}
