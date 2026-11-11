"use client";

import { PortalNav } from "@/components/portal/portal-nav";
import { ViewToggle } from "@/components/view-toggle";
import { CustomerProvider, useCustomer } from "@/lib/customer-context";
import { ChatDrawer } from "@/components/portal/chat-drawer";
import { JourneyProgress } from "@/components/portal/journey-progress";
import { usePathname } from "next/navigation";

function PortalShell({ children }: { children: React.ReactNode }) {
  const { tier, journeyStage } = useCustomer();
  const pathname = usePathname();

  const isOnboardingRoute =
    pathname === "/portal/onboarding" ||
    pathname === "/portal/initial-report" ||
    pathname === "/portal/upgrade" ||
    pathname === "/portal/welcome" ||
    pathname === "/portal";

  const showStepper =
    tier === "onboarding" ||
    (tier === "free" && journeyStage !== "dashboard" && journeyStage !== "complete");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <span className="brand-wordmark text-xl uppercase text-primary">
            Kiyos
          </span>
          <div className="ml-6 flex-1">
            <PortalNav />
          </div>
          <ViewToggle className="shrink-0" />
        </div>
      </header>

      {/* Journey progress stepper */}
      {showStepper && !isOnboardingRoute && (
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <JourneyProgress currentStage={journeyStage} />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-[11px] text-muted-foreground">
        Kiyos · Prototype · v0.4
      </footer>

      {/* Chat drawer — accessible from all portal pages */}
      <ChatDrawer />
    </div>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerProvider>
      <PortalShell>{children}</PortalShell>
    </CustomerProvider>
  );
}
