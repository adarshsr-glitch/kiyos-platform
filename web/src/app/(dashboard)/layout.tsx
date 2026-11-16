"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  FileText,
  BookOpen,
  Activity,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ViewToggle } from "@/components/view-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home, exact: true },
  { label: "Cases", href: "/cases", icon: Briefcase },
  { label: "Documents", href: "#", icon: FileText, disabled: true },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Audit log", href: "#", icon: Activity, disabled: true },
  { label: "Settings", href: "#", icon: Settings, disabled: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="workspace flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Wordmark */}
        <div className="flex h-14 items-center gap-2.5 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
            K
          </span>
          <span className="text-[15px] font-semibold text-foreground">Kiyos</span>
          <span className="text-xs text-muted-foreground">Experts</span>
        </div>

        <Separator />

        <div className="px-4 py-3">
          <ViewToggle />
        </div>

        <Separator />

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
              VD
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              Vikram Desai
            </p>
            <p className="truncate text-xs text-muted-foreground">Lead expert · CA, CPA</p>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}
