"use client";

/**
 * Two perspectives of one case: the customer's workspace and their case captain's case
 * workspace. Switching keeps the case, so "Sidhant's view" of Arjun's case opens exactly
 * that case for the expert, and "Arjun's view" opens Arjun's own workspace.
 * Free customers have no named captain: the second view is the Kiyos team's.
 */

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasCaptain } from "@/lib/captain";


const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function PerspectiveSwitch({
  caseId,
  customer,
  captain,
  active,
  stacked,
  className,
}: {
  /** Side rail: one full-width row per view, so names aren't truncated. */
  stacked?: boolean;
  caseId: number;
  customer: string;
  captain: string | null;
  active: "customer" | "expert";
  className?: string;
}) {
  const router = useRouter();
  const expertName = hasCaptain(captain) ? captain! : null;
  const toCustomer = () => {
    document.cookie = `kiyos-case=${caseId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    window.location.href = "/portal/overview";
  };
  const toExpert = () => router.push(`/expert/cases/${caseId}`);

  const seg = (key: "customer" | "expert", name: string, label: string, onClick: () => void) => {
    const on = active === key;
    return (
      <button
        key={key}
        onClick={on ? undefined : onClick}
        aria-pressed={on}
        title={on ? `You're seeing ${label}` : `Open ${label}`}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12.5px] transition-colors",
          on ? "bg-card font-semibold text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
          stacked && "w-full rounded-lg"
        )}
      >
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", key === "expert" ? "bg-foreground text-background" : "bg-primary text-primary-foreground")}>
          {initials(name)}
        </span>
        <span className={cn("truncate", stacked ? "inline" : "hidden sm:inline")}>{label}</span>
      </button>
    );
  };

  return (
    <div role="group" aria-label="Whose view of this case" className={cn("flex gap-0.5 bg-muted/70 p-0.5", stacked ? "flex-col rounded-xl" : "items-center rounded-full", className)}>
      {seg("customer", customer, `${customer.split(" ")[0]}'s view`, toCustomer)}
      {seg("expert", expertName ?? "Kiyos", expertName ? `${expertName.split(" ")[0]}'s view` : "Kiyos team view", toExpert)}
    </div>
  );
}
