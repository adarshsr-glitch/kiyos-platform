"use client";

/**
 * The one place to switch between the expert's and the customer's side, at the top of
 * the side panel on both. Which side is lit comes from the page you're on. Switching
 * keeps the case: from an expert's case page, Customer opens that customer's workspace;
 * from a customer's workspace, Expert opens that customer's case.
 */

import { useRouter, usePathname } from "next/navigation";
import { Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Side = "expert" | "customer";

export function ViewToggle({
  caseId,
  className,
  compact,
}: {
  /** On the customer's side: the case shown, so Expert opens it. */
  caseId?: number | null;
  className?: string;
  /** Icons only (phone headers). */
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active: Side = pathname.startsWith("/portal") ? "customer" : "expert";

  const go = (side: Side) => {
    if (side === active) return;
    if (side === "customer") {
      const onCase = pathname.match(/^\/expert\/cases\/(\d+)/)?.[1];
      if (onCase) document.cookie = `kiyos-case=${onCase}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
      // Full load: the workspace reads the case from the cookie on the server.
      window.location.href = onCase ? "/portal/overview" : "/portal";
    } else {
      router.push(caseId ? `/expert/cases/${caseId}` : "/expert");
    }
  };

  const seg = (side: Side, label: string, Icon: typeof User) => {
    const on = side === active;
    return (
      <button
        key={side}
        type="button"
        onClick={() => go(side)}
        aria-pressed={on}
        aria-label={`${label} view`}
        title={on ? `You're on the ${label.toLowerCase()} side` : `Switch to the ${label.toLowerCase()} side`}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {!compact && <span>{label}</span>}
      </button>
    );
  };

  return (
    <div role="group" aria-label="Expert or customer side" className={cn("flex items-center rounded-full border bg-muted/50 p-0.5", className)}>
      {seg("expert", "Expert", Briefcase)}
      {seg("customer", "Customer", User)}
    </div>
  );
}
