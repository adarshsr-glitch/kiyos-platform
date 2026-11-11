"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomer, type CustomerTier } from "@/lib/customer-context";

interface NavLink {
  label: string;
  href: string;
  tiers: CustomerTier[];
}

const LINKS: NavLink[] = [
  { label: "My Case", href: "/portal/dashboard", tiers: ["free", "premium"] },
  { label: "Documents", href: "/portal/documents", tiers: ["free", "premium"] },
  { label: "My details", href: "/portal/verify", tiers: ["free", "premium"] },
  {
    label: "Assessment",
    href: "/portal/assessment",
    tiers: ["free", "premium"],
  },
  { label: "Pricing", href: "/portal/pricing", tiers: ["free"] },
  { label: "Chat", href: "/portal/chat", tiers: ["premium"] },
];

export function PortalNav() {
  const pathname = usePathname();
  const { tier } = useCustomer();

  const isWelcome = pathname === "/portal/welcome" || pathname === "/portal";
  const isOnboarding =
    pathname === "/portal/onboarding" ||
    pathname === "/portal/initial-report" ||
    pathname === "/portal/upgrade";

  if (isWelcome || isOnboarding || tier === "onboarding") return null;

  const visibleLinks = LINKS.filter((l) => l.tiers.includes(tier));

  return (
    <nav className="flex gap-1 overflow-x-auto sm:gap-2">
      {visibleLinks.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
