"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, MessageCircle, ScrollText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer, type CustomerTier } from "@/lib/customer-context";

interface NavLink {
  label: string;
  short: string;
  href: string;
  icon: typeof Home;
  tiers: CustomerTier[];
  /** Desktop shows chat beside the dashboard, so it only needs a tab on mobile. */
  mobileOnly?: boolean;
}

const LINKS: NavLink[] = [
  { label: "Overview", short: "Home", href: "/portal/dashboard", icon: Home, tiers: ["free", "premium"] },
  { label: "Chat", short: "Chat", href: "/portal/chat", icon: MessageCircle, tiers: ["free", "premium"], mobileOnly: true },
  { label: "Documents", short: "Documents", href: "/portal/documents", icon: FileText, tiers: ["free", "premium"] },
  { label: "Assessment", short: "Assessment", href: "/portal/assessment", icon: ScrollText, tiers: ["free", "premium"] },
  { label: "My details", short: "Details", href: "/portal/verify", icon: UserRound, tiers: ["free", "premium"] },
];

function useVisibleLinks() {
  const pathname = usePathname();
  const { tier } = useCustomer();
  const hidden =
    tier === "onboarding" ||
    ["/portal", "/portal/welcome", "/portal/onboarding", "/portal/initial-report"].includes(pathname);
  return {
    pathname,
    links: hidden ? [] : LINKS.filter((l) => l.tiers.includes(tier)),
  };
}

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

/** Desktop: inline text navigation in the top bar. */
export function PortalNav() {
  const { pathname, links } = useVisibleLinks();
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {links
        .filter((l) => !l.mobileOnly)
        .map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              isActive(pathname, l.href)
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        ))}
    </nav>
  );
}

/** Mobile: thumb-reach tab bar; Chat is a first-class destination, as on WhatsApp. */
export function PortalTabBar() {
  const { pathname, links } = useVisibleLinks();
  if (links.length === 0 || pathname === "/portal/chat") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {links.map((l) => {
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
                {l.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function usePortalNavVisible() {
  return useVisibleLinks().links.length > 0;
}
