import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One page-header pattern for both sides (Review 05, UX-08):
 * - the title says the page's name, the same word as in the navigation (or the record's name
 *   on a detail page);
 * - one line underneath says what's here or where things stand;
 * - the page's own actions sit on the right.
 * Customers get the calm display size; experts (`dense`) a compact one that leaves room for work.
 */
export function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
  dense,
  className,
}: {
  /** Only for flows that need a step label (sign-up, checkout); pages don't use one. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  dense?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-3", !dense && "mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
        <h1
          className={cn(
            "leading-tight tracking-tight text-foreground",
            dense ? "text-[24px] font-semibold" : "font-serif text-[28px] font-medium sm:text-[32px]"
          )}
        >
          {title}
        </h1>
        {meta && <div className={cn("mt-1 text-muted-foreground", dense ? "max-w-3xl text-sm" : "text-[14px]")}>{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * The expert workspace's bar above every page: where you are (a breadcrumb), and small
 * page-level tools on the right. The page's title is in the PageHeader below, not here.
 */
export function PageBar({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.label + i} className={cn("flex min-w-0 items-center gap-1.5", !last && i > 0 && "hidden sm:flex")}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              {last || !c.href ? (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </header>
  );
}
