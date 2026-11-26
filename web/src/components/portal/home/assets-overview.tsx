/**
 * Where the customer's money is, drawn from the same financial picture the Profile lists:
 *   - AssetsOverview (Home): what you own as a class × country grid, and this year's
 *     income per country as ranked rows.
 *   - AssetAllocation (Profile): one allocation donut per country, with the income bar.
 *
 * Amounts stay in each country's own currency; nothing is converted or added across
 * countries. Items with only a range (no documented amount) are counted but never
 * drawn as a number.
 */

import { Donut } from "@/components/charts/money-chart";
import { formatMoneyCompact, type Currency } from "@/lib/format";
import { ASSET_CLASSES, byCategory, INCOME_TYPES, totals, type MoveYear, type PictureItem } from "@/lib/financial-picture";
import { MoveYearBand } from "./move-year";
import { COUNTRY_SHORT, FLAG, type Code } from "@/lib/position";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR } from "@/lib/chart-colors";

const CODES: Code[] = ["IN", "US"];
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
export { CATEGORY_COLOR };

export function AssetsOverview({ picture, move }: { picture: PictureItem[]; move?: MoveYear | null }) {
  const hasAssets = picture.some((i) => i.section === "holdings" && typeof i.amount === "number");
  const hasIncome = picture.some((i) => i.section === "income" && typeof i.amount === "number");

  if (!hasAssets && !hasIncome) {
    return <p className="rounded-2xl border bg-card px-5 py-4 text-[14px] text-muted-foreground">No documented amounts yet. They appear here as your documents are read.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {hasAssets && (
        <div className="p-5 sm:p-6">
          <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">What you own</p>
          <AssetGrid picture={picture} />
        </div>
      )}

      {hasIncome && (
        <div className="border-t bg-muted/20 p-5 sm:p-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">What you earned this year</p>
          {move && <div className="mt-3"><MoveYearBand move={move} /></div>}
          <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
            {CODES.map((c) => (
              <IncomeRows key={c} code={c} picture={picture} />
            ))}
          </div>
        </div>
      )}

      <p className="border-t px-5 py-2.5 text-[11.5px] text-muted-foreground sm:px-6">
        Each country in its own currency; nothing is converted or added across countries.
        {picture.some((i) => i.illustrative) && " Includes illustrative demo figures."}
      </p>
    </div>
  );
}

/**
 * Assets as a class × country grid: one row per asset class, India and US side by side,
 * so the two countries line up and "where is my retirement money" reads across a row.
 * Each cell shows the amount and its share of that country's assets. On phones the
 * class name sits above its two cells.
 */
function AssetGrid({ picture }: { picture: PictureItem[] }) {
  const t = { IN: totals(picture, "holdings", "IN"), US: totals(picture, "holdings", "US") };
  const by = { IN: byCategory(picture, "holdings", "IN"), US: byCategory(picture, "holdings", "US") };
  const classes = ASSET_CLASSES.filter((k) => by.IN.some((p) => p.category === k) || by.US.some((p) => p.category === k));
  const cols = "grid grid-cols-2 gap-x-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-8";

  return (
    <div role="table" aria-label="Assets by class and country">
      <div role="row" className={cn(cols, "items-end pb-3")}>
        <span role="columnheader" className="hidden sm:block" />
        {CODES.map((c) => (
          <span key={c} role="columnheader" className="min-w-0">
            <span className="block text-[12px] text-muted-foreground">
              <span aria-hidden>{FLAG[c]}</span> {COUNTRY_SHORT[c]}
            </span>
            <span className="block font-serif text-[22px] leading-tight tabular-nums text-foreground">
              {t[c].counted ? formatMoneyCompact(t[c].sum, CUR[c]) : "—"}
            </span>
            {t[c].ranged > 0 && <span className="block text-[11.5px] text-muted-foreground">+ {t[c].ranged} known only as a range</span>}
          </span>
        ))}
      </div>
      {classes.map((k) => (
        <div key={k} role="row" className={cn(cols, "items-center gap-y-2 border-t py-3")}>
          <span role="rowheader" className="col-span-2 flex items-center gap-2 text-[13.5px] text-foreground sm:col-span-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_COLOR[k] }} />
            {k}
          </span>
          {CODES.map((c) => {
            const p = by[c].find((x) => x.category === k);
            return (
              <span key={c} role="cell" className="min-w-0">
                {p ? (
                  <>
                    <span className="flex items-baseline justify-between gap-2 text-[13.5px]">
                      <span className="font-semibold tabular-nums text-foreground">{formatMoneyCompact(p.sum, CUR[c])}</span>
                      <span className="text-[12px] tabular-nums text-muted-foreground">{Math.round((p.sum / t[c].sum) * 100)}%</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max((p.sum / t[c].sum) * 100, 2)}%`, background: CATEGORY_COLOR[k] }} />
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Income for one country: the total, then each source ranked, every row the same height. */
function IncomeRows({ code, picture }: { code: Code; picture: PictureItem[] }) {
  const t = totals(picture, "income", code);
  const rows = byCategory(picture, "income", code).sort((a, b) => b.sum - a.sum);
  return (
    <section className="min-w-0" aria-label={`${COUNTRY_SHORT[code]} income`}>
      <p className="text-[12px] text-muted-foreground">
        <span aria-hidden>{FLAG[code]}</span> {COUNTRY_SHORT[code]}
      </p>
      <p className="font-serif text-[22px] leading-tight tabular-nums text-foreground">{t.counted ? formatMoneyCompact(t.sum, CUR[code]) : "—"}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">No documented income yet.</p>
      ) : (
        <ul className="mt-2">
          {rows.map((r) => {
            const share = r.sum / t.sum;
            return (
              <li key={r.category} className="flex h-[46px] flex-col justify-center border-t first:border-t-0">
                <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="min-w-0 truncate text-foreground">{r.category}</span>
                  <span className="shrink-0">
                    <span className="mr-2 text-[12px] tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatMoneyCompact(r.sum, CUR[code])}</span>
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(share * 100, 2)}%`, background: CATEGORY_COLOR[r.category] }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Profile: what each country's assets are made of, as a donut per country. */
export function AssetAllocation({ picture }: { picture: PictureItem[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2">
      {CODES.map((c) => {
        const parts = byCategory(picture, "holdings", c);
        const t = totals(picture, "holdings", c);
        const income = byCategory(picture, "income", c);
        return (
          <section key={c} className="min-w-0 space-y-5 bg-card p-5 sm:p-6" aria-label={`${COUNTRY_SHORT[c]} assets`}>
            <header className="flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">
                <span aria-hidden>{FLAG[c]}</span> {COUNTRY_SHORT[c]}
              </h3>
              {t.ranged > 0 && <span className="text-[11.5px] text-muted-foreground">+ {t.ranged} known only as a range</span>}
            </header>
            {parts.length ? (
              <div className="flex flex-col items-start gap-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-5">
                <Donut parts={parts.map((p) => ({ value: p.sum, color: CATEGORY_COLOR[p.category] }))} size={124} center={formatMoneyCompact(t.sum, CUR[c]) ?? ""} caption="assets" />
                <ul className="w-full min-w-0 flex-1 space-y-1.5">
                  {ASSET_CLASSES.filter((k) => parts.some((p) => p.category === k)).map((k) => {
                    const p = parts.find((x) => x.category === k)!;
                    return (
                      <li key={k} className="flex items-center gap-2 text-[13px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_COLOR[k] }} />
                        <span className="min-w-0 flex-1 truncate text-foreground">{k}</span>
                        <span className="tabular-nums text-muted-foreground">{Math.round((p.sum / t.sum) * 100)}%</span>
                        <span className="w-[70px] text-right font-medium tabular-nums text-foreground">{formatMoneyCompact(p.sum, CUR[c])}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">No documented assets yet.</p>
            )}
            <div className="border-t pt-4">
              <StackedBar
                title="Income this year"
                parts={income.map((p) => ({ label: p.category, value: p.sum, color: CATEGORY_COLOR[p.category] }))}
                currency={CUR[c]}
                empty="No documented income"
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function StackedBar({
  title,
  parts,
  currency,
  empty,
  className,
  cite,
}: {
  title: string;
  parts: { label: string; value: number; color: string }[];
  currency: Currency;
  empty: string;
  className?: string;
  /** The source icon for the total, if any */
  cite?: React.ReactNode;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const order = [...ASSET_CLASSES, ...INCOME_TYPES] as readonly string[];
  const sorted = [...parts].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-foreground">{title}</span>
        {total > 0 && (
          <span className="flex items-center gap-0.5 font-semibold tabular-nums text-foreground">
            {formatMoneyCompact(total, currency)}
            {cite}
          </span>
        )}
      </p>
      {total > 0 ? (
        <>
          <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={sorted.map((p) => `${p.label} ${formatMoneyCompact(p.value, currency)}`).join(", ")}>
            {sorted.map((p) => (
              <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full" />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {sorted.map((p) => (
              <li key={p.label} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                {p.label} <span className="tabular-nums text-foreground">{formatMoneyCompact(p.value, currency)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
