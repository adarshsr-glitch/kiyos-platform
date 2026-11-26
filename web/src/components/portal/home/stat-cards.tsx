/**
 * The four answers a customer opens the workspace for: what do I owe, what do I hold,
 * where do I stand, and what's due next. Each value comes from the case record; where
 * there is no figure yet the card says "Pending" rather than showing a placeholder.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDate, formatMoneyCompact } from "@/lib/format";
import { totals, type PictureItem } from "@/lib/financial-picture";
import { balanceText, COUNTRY_SHORT, STATUS_SHORT, type Code, type CountryPositionData } from "@/lib/position";
import { cn } from "@/lib/utils";

const CODES: Code[] = ["IN", "US"];
const TONE = { owed: "text-amber-800", refund: "text-emerald-700", neutral: "text-foreground" } as const;

export function StatCards({ positions, picture }: { positions: Record<Code, CountryPositionData>; picture: PictureItem[] }) {
  const estimates = CODES.map((c) => positions[c].estimate).filter(Boolean);
  const illustrativeTax = estimates.some((e) => e!.illustrative);
  const assetRows = picture.filter((i) => i.section === "holdings");
  const illustrativeAssets = assetRows.some((i) => i.illustrative);
  const dues = CODES.filter((c) => positions[c].due).sort((a, b) => positions[a].due!.localeCompare(positions[b].due!));

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
      {/* ------------------------------------------------ liability */}
      <Card title="Tax balance" href="/portal/assessment" note={illustrativeTax ? "Illustrative estimate" : estimates.length ? "Expert estimate" : undefined}>
        {CODES.map((c) => {
          const e = positions[c].estimate;
          const b = e ? balanceText(e) : null;
          return (
            <Line key={c} label={COUNTRY_SHORT[c]}>
              {b ? (
                <>
                  <span className={cn("font-serif text-[22px] leading-none tabular-nums", TONE[b.tone])}>{b.amount}</span>
                  <span className="ml-1.5 text-[12px] text-muted-foreground">{b.label}</span>
                </>
              ) : (
                <Pending />
              )}
            </Line>
          );
        })}
      </Card>

      {/* ------------------------------------------------ assets */}
      <Card title="Assets" href="/portal/profile" note={illustrativeAssets ? "Includes illustrative data" : assetRows.length ? "From your documents" : undefined}>
        {CODES.map((c) => {
          const t = totals(picture, "holdings", c);
          return (
            <Line key={c} label={COUNTRY_SHORT[c]}>
              {t.counted ? (
                <>
                  <span className="font-serif text-[22px] leading-none tabular-nums text-foreground">{formatMoneyCompact(t.sum, c === "IN" ? "INR" : "USD")}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {t.counted} holding{t.counted > 1 ? "s" : ""}
                    {t.ranged ? ` + ${t.ranged} range${t.ranged > 1 ? "s" : ""}` : ""}
                  </span>
                </>
              ) : t.ranged ? (
                <span className="text-[13px] text-muted-foreground">{t.ranged} known as range{t.ranged > 1 ? "s" : ""}, no documents yet</span>
              ) : (
                <Pending />
              )}
            </Line>
          );
        })}
      </Card>

      {/* ------------------------------------------------ residency */}
      <Card title="Tax residency" href="/portal/assessment">
        {CODES.map((c) => {
          const p = positions[c];
          return (
            <Line key={c} label={COUNTRY_SHORT[c]}>
              {p.status ? (
                <>
                  <span className="font-serif text-[20px] leading-none text-foreground">{STATUS_SHORT[p.status] ?? p.status}</span>
                  {p.year && <span className="block text-[12px] text-muted-foreground">{p.year.replace(/^Tax year\s+/i, "")}</span>}
                </>
              ) : (
                <Pending />
              )}
            </Line>
          );
        })}
      </Card>

      {/* ------------------------------------------------ filing */}
      <Card title="Next filings" href="/portal/documents">
        {dues.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Pending: set once your returns are mapped.</p>
        ) : (
          dues.map((c) => {
            const p = positions[c];
            return (
              <Line key={c} label={COUNTRY_SHORT[c]}>
                <span className="text-[15px] font-semibold tabular-nums text-foreground">{formatDate(p.due, { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {[p.filing, p.stage].filter(Boolean).join(" · ")}
                </span>
              </Line>
            );
          })
        )}
      </Card>
    </div>
  );
}

function Card({ title, href, note, children }: { title: string; href: string; note?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-3 bg-card p-4 transition-colors hover:bg-muted/40 sm:p-5">
      <span className="flex items-center justify-between text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {title}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="flex flex-col gap-2.5">{children}</span>
      {note && <span className="mt-auto text-[11px] text-muted-foreground">{note}</span>}
    </Link>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <span className="block min-w-0">{children}</span>
    </span>
  );
}

function Pending() {
  return <span className="text-[14px] text-muted-foreground">Pending</span>;
}
