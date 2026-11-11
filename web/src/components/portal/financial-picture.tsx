"use client";

import Link from "next/link";
import { COUNTRIES, sourceLabel, type PictureItem, type Section } from "@/lib/financial-picture";
import { cn } from "@/lib/utils";

const SECTIONS: { key: Section; title: string; empty: string }[] = [
  { key: "income", title: "Income", empty: "No income reported" },
  { key: "holdings", title: "Accounts & assets", empty: "No accounts or assets reported" },
];

/**
 * Cross-border financial picture: one column per country, income above holdings.
 * Each row names what it is, where the number came from, and its own currency.
 */
export function FinancialPicture({
  items,
  editable = true,
  className,
}: {
  items: PictureItem[];
  editable?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Financial picture</h2>
          <p className="text-xs text-muted-foreground">
            What we hold for you, in each country&apos;s own currency
          </p>
        </div>
        {editable && (
          <Link href="/portal/verify" className="shrink-0 text-xs font-medium text-primary hover:underline">
            Correct something
          </Link>
        )}
      </header>

      <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
        {COUNTRIES.map((c) => {
          const forCountry = items.filter((i) => i.country === c.code);
          return (
            <div key={c.code} className="px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span aria-hidden>{c.flag}</span>
                {c.name}
              </p>
              {SECTIONS.map((s) => {
                const rows = forCountry.filter((i) => i.section === s.key);
                return (
                  <div key={s.key} className="mb-3 last:mb-0">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {s.title}
                    </p>
                    {rows.length === 0 ? (
                      <p className="py-1 text-xs text-muted-foreground/80">{s.empty}</p>
                    ) : (
                      <dl className="divide-y divide-border/60">
                        {rows.map((r) => (
                          <Row key={r.id} item={r} />
                        ))}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Row({ item }: { item: PictureItem }) {
  const provenance = item.source === "onboarding" ? null : sourceLabel(item.source);
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <dt className="text-sm text-foreground">{item.label}</dt>
        {(item.detail || provenance) && (
          <dd className="truncate text-[11px] text-muted-foreground" title={[item.detail, provenance].filter(Boolean).join(" · ")}>
            {[item.detail, provenance].filter(Boolean).join(" · ")}
          </dd>
        )}
      </div>
      <dd
        className={cn(
          "shrink-0 text-right text-sm tabular-nums",
          item.value ? "font-medium text-foreground" : "text-xs italic text-muted-foreground"
        )}
      >
        {item.value ?? "Not provided"}
      </dd>
    </div>
  );
}
