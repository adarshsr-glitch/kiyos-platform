"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Map, MessageCircle, ScrollText, Tag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer, type CustomerTier } from "@/lib/customer-context";

interface NavLink {
  label: string;
  href: string;
  icon: typeof Home;
  /** Desktop keeps WhatsApp beside the workspace, so Chat is a tab on phones only. */
  mobileOnly?: boolean;
}

const LINKS: Record<CustomerTier, NavLink[]> = {
  onboarding: [
    { label: "Start", href: "/portal/welcome", icon: Home },
    { label: "Chat", href: "/portal/chat", icon: MessageCircle, mobileOnly: true },
  ],
  free: [
    { label: "Risk map", href: "/portal/assessment", icon: Map },
    { label: "Chat", href: "/portal/chat", icon: MessageCircle, mobileOnly: true },
    { label: "Plans", href: "/portal/upgrade", icon: Tag },
  ],
  // CD-07: no Chat tab for paid customers; WhatsApp is one tap from the header and the expert line.
  premium: [
    { label: "Overview", href: "/portal/dashboard", icon: Home },
    { label: "Documents", href: "/portal/documents", icon: FileText },
    { label: "Profile", href: "/portal/verify", icon: UserRound },
    { label: "Tax position", href: "/portal/assessment", icon: ScrollText },
  ],
};

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export function PortalNav() {
  const { tier } = useCustomer();
  const pathname = usePathname();
  return (
    <nav className="hidden h-full items-stretch gap-6 lg:flex">
      {LINKS[tier]
        .filter((l) => !l.mobileOnly)
        .map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center border-b-2 text-sm transition-colors",
              isActive(pathname, l.href)
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        ))}
    </nav>
  );
}

/** Phones: thumb-reach tabs, with Chat as a first-class destination. */
export function PortalTabBar() {
  const { tier } = useCustomer();
  const pathname = usePathname();
  if (pathname === "/portal/chat") return null;
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
                <l.icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
