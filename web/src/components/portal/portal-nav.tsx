"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, ChevronRight, FileText, Home, Map, MessageCircle, ScrollText, Tag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer, type CustomerTier } from "@/lib/customer-context";
import { UnreadBadge } from "./inbox";

interface NavLink {
  label: string;
  href: string;
  icon: typeof Home;
  /** Desktop keeps WhatsApp beside the workspace, so Chat is a tab on phones only. */
  mobileOnly?: boolean;
}

const LINKS: Record<CustomerTier, NavLink[]> = {
  onboarding: [
    { label: "Chat", href: "/portal/messages", icon: MessageCircle, mobileOnly: true },
  ],
  free: [
    { label: "Assessment", href: "/portal/assessment", icon: Map },
    { label: "Messages", href: "/portal/messages", icon: MessageCircle },
    { label: "Plans", href: "/portal/plans", icon: Tag },
  ],
  // Messages: the WhatsApp thread inside the workspace, so nobody has to switch apps.
  premium: [
    { label: "Overview", href: "/portal/overview", icon: Home },
    { label: "Profile", href: "/portal/profile", icon: UserRound },
    { label: "Tax position", href: "/portal/tax-position", icon: ScrollText },
    { label: "Year at a glance", href: "/portal/year", icon: CalendarRange },
    { label: "Documents", href: "/portal/documents", icon: FileText },
    { label: "Messages", href: "/portal/messages", icon: MessageCircle },
  ],
};

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Desktop: the workspace's sections as a vertical list, as in the expert workspace. */
export function PortalSideNav() {
  const { tier } = useCustomer();
  const pathname = usePathname();
  return (
    <nav className="space-y-1 px-3 py-3" aria-label="Workspace">
      {LINKS[tier]
        .filter((l) => !l.mobileOnly)
        .map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <l.icon className="h-4 w-4 shrink-0" />
              {l.label}
              {l.href === "/portal/messages" && <UnreadBadge className="ml-auto" />}
            </Link>
          );
        })}
    </nav>
  );
}

/** Desktop top bar: customer › current section, as in the expert breadcrumbs. */
export function PortalSectionTitle({ customer }: { customer: string }) {
  const { tier } = useCustomer();
  const pathname = usePathname();
  const section = LINKS[tier].find((l) => isActive(pathname, l.href))?.label;
  if (!section) return null;
  return (
    <p className="hidden items-center gap-1.5 text-sm lg:flex">
      <span className="text-muted-foreground">{customer}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{section}</span>
    </p>
  );
}

/** Phones: thumb-reach tabs, with Chat as a first-class destination. */
export function PortalTabBar() {
  const { tier } = useCustomer();
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {LINKS[tier].map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10.5px]",
                  active ? "font-medium text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <l.icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                  {l.href === "/portal/messages" && <UnreadBadge className="absolute -right-2.5 -top-1.5" />}
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
