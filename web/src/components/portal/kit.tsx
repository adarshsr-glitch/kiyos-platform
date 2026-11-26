/** Small, shared building blocks for the customer workspace. */

import Link from "next/link";
import { cn } from "@/lib/utils";

// The page header is shared with the expert workspace (one pattern on both sides).
export { PageHeader } from "@/components/page-header";

export function Section({
  title,
  count,
  action,
  children,
  className,
  flush,
}: {
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Children run edge-to-edge (lists with their own padding). */
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className={flush ? "pb-2" : "px-5 pb-5 pt-2"}>{children}</div>
    </section>
  );
}

const PILL: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blue: "bg-sky-50 text-sky-800 ring-sky-600/15",
  gray: "bg-muted text-muted-foreground ring-black/5",
  brand: "bg-primary/10 text-primary ring-primary/15",
};

export function Pill({ tone = "gray", children, className }: { tone?: keyof typeof PILL; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", PILL[tone], className)}>
      {children}
    </span>
  );
}

export const COUNTRY = {
  IN: { flag: "🇮🇳", name: "India" },
  US: { flag: "🇺🇸", name: "United States" },
  BOTH: { flag: "🇮🇳🇺🇸", name: "Both countries" },
} as const;

export function CountryTag({ code }: { code: keyof typeof COUNTRY | null | undefined }) {
  if (!code) return null;
  const c = COUNTRY[code];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={c.name}>
      <span aria-hidden>{c.flag}</span>
      {code === "BOTH" ? "India + US" : code === "IN" ? "India" : "US"}
    </span>
  );
}

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-medium text-primary hover:underline">
      {children} →
    </Link>
  );
}

/** Indian digit grouping for rupees: ₹29,500 / ₹1,20,000. */
export function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
