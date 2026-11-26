"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  BookOpen,
  Gauge,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ViewToggle } from "@/components/view-toggle";
import { cn } from "@/lib/utils";
import { ExpertBell } from "@/components/case/expert-inbox";

// Only sections that exist. (Documents, audit and settings live inside each case.)
const NAV_ITEMS: { label: string; href: string; icon: typeof Home; exact?: boolean; disabled?: boolean }[] = [
  { label: "Home", href: "/expert", icon: Home, exact: true },
  { label: "Cases", href: "/expert/cases", icon: Briefcase },
  { label: "Rules", href: "/expert/rules", icon: BookOpen },
  { label: "Agent quality", href: "/expert/quality", icon: Gauge },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const me = useSignedInExpert(pathname);
  // Sign-in and sign-up stand alone, without the workspace around them.
  if (pathname.startsWith("/expert/signin") || pathname.startsWith("/expert/signup")) return <>{children}</>;

  return (
    <div className="workspace flex h-screen overflow-hidden [.journey-on_&]:h-[calc(100vh-62px)] bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {/* Wordmark */}
        <div className="flex h-14 items-center gap-2.5 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
            K
          </span>
          <span className="text-[15px] font-semibold text-foreground">Kiyos</span>
          <span className="text-xs text-muted-foreground">Experts</span>
          <ExpertBell expert={me?.name ?? null} pathname={pathname} />
        </div>

        <Separator />

        {/* The one switch between the expert's and the customer's side (keeps the case). */}
        <div className="free-roam-only">
          <div className="px-4 py-3">
            <ViewToggle />
          </div>
          <Separator />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const active =
              !item.disabled &&
              (item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.disabled && "pointer-events-none opacity-40"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* User chip */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {me ? me.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : "KX"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{me ? me.name : "Kiyos experts"}</p>
            <p className="truncate text-xs text-muted-foreground">{me ? `${me.qualification ?? me.role} · signed in` : "Each case opens as its expert"}</p>
          </div>
          {me ? (
            <button
              onClick={() => {
                document.cookie = "kiyos-expert=; path=/; max-age=0";
                window.location.href = "/expert/signin";
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link href="/expert/signin" className="text-xs font-medium text-primary hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Phones: the sidebar is hidden, so its sections sit in a slim bar on top. */}
        <div className="flex h-11 shrink-0 items-center border-b md:hidden">
        <nav aria-label="Expert workspace" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-3">
          <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">K</span>
          {NAV_ITEMS.filter((i) => !i.disabled).map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn("shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium", active ? "bg-primary/10 text-primary" : "text-muted-foreground")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* Outside the scrolling strip, so the side switch is always fully visible. */}
        <ViewToggle compact className="free-roam-only mr-3 shrink-0" />
        </div>
        {children}
      </main>
    </div>
  );
}

/** The expert who signed in (prototype: remembered in a cookie), or null. */
function useSignedInExpert(pathname: string): { name: string; email: string; qualification: string | null; role: string } | null {
  const [me, setMe] = useState<{ name: string; email: string; qualification: string | null; role: string } | null>(null);
  useEffect(() => {
    const raw = document.cookie.split("; ").find((c) => c.startsWith("kiyos-expert="))?.split("=")[1];
    try {
      setMe(raw ? JSON.parse(decodeURIComponent(raw)) : null);
    } catch {
      setMe(null);
    }
  }, [pathname]);
  return me;
}
