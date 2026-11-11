"use client";

import Link from "next/link";
import { PortalNav, PortalTabBar, usePortalNavVisible } from "@/components/portal/portal-nav";
import { ViewToggle } from "@/components/view-toggle";
import { CustomerProvider, useCustomer } from "@/lib/customer-context";
import { ChatDrawer } from "@/components/portal/chat-drawer";
import { JourneyProgress } from "@/components/portal/journey-progress";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function PlanBadge() {
  const { tier } = useCustomer();
  if (tier === "onboarding") return null;
  return tier === "free" ? (
    <Link
      href="/portal/upgrade"
      className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
    >
      Free plan
      <span className="font-medium text-primary">Upgrade</span>
    </Link>
  ) : (
    <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline">
      Full plan
    </span>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { tier, journeyStage } = useCustomer();
  const pathname = usePathname();
  const navVisible = usePortalNavVisible();

  const isOnboardingRoute = [
    "/portal/onboarding",
    "/portal/initial-report",
    "/portal/upgrade",
    "/portal/welcome",
    "/portal",
  ].includes(pathname);

  const showStepper =
    tier === "onboarding" ||
    (tier === "free" && journeyStage !== "dashboard" && journeyStage !== "complete");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/portal/dashboard" className="brand-wordmark text-xl uppercase text-primary">
            Kiyos
          </Link>
          <div className="flex-1">
            <PortalNav />
          </div>
          <PlanBadge />
          <ViewToggle className="shrink-0" />
        </div>
      </header>

      {showStepper && !isOnboardingRoute && (
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <JourneyProgress currentStage={journeyStage} />
          </div>
        </div>
      )}

      <main className={cn("flex-1", navVisible && "pb-20 lg:pb-0")}>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-6">{children}</div>
      </main>

      <PortalTabBar />
      <ChatDrawer />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerProvider>
      <PortalShell>{children}</PortalShell>
    </CustomerProvider>
  );
}
