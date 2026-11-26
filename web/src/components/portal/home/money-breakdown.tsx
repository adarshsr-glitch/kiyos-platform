/**
 * The money behind the tax position: what was earned this year, per country, because the
 * returns are built from income. Each source shows where it comes from: an employer, or the
 * asset that produces it (rent from a flat, interest from deposits). Assets that produce
 * nothing this year don't appear. Figures open their source with one click.
 */

import { formatMoneyCompact, type Currency } from "@/lib/format";
import { totals, type PictureItem } from "@/lib/financial-picture";
import { COUNTRY_TONES } from "@/lib/chart-colors";
import { COUNTRY_SHORT, FLAG, type Code } from "@/lib/position";
import { Cite } from "@/components/source/cite";
import { itemNode, totalNode } from "@/components/source/nodes";
import { producedBy } from "../your-file";

const CODES: Code[] = ["IN", "US"];
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };

export function MoneyBreakdown({ picture }: { picture: PictureItem[] }) {
  const income = picture.filter((i) => i.section === "income");
  const assets = picture.filter((i) => i.section === "holdings");
  // Which asset each income comes from, using the same link as the file.
  const from = new Map<string, PictureItem>();
  for (const a of assets) {
    const p = producedBy(a, income, assets);
    if (p && !from.has(p.id)) from.set(p.id, a);
  }
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {CODES.map((c) => {
        const rows = income.filter((i) => i.country === c && typeof i.amount === "number").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
        const t = totals(picture, "income", c);
        return (
          <section key={c} className="min-w-0" aria-label={COUNTRY_SHORT[c]}>
            <h3 className="text-[15px] font-semibold text-foreground">
              <span aria-hidden className="mr-1.5">{FLAG[c]}</span>
              {COUNTRY_SHORT[c]}
            </h3>
            <p className="mt-2 text-[12.5px] text-muted-foreground">Earned this year</p>
            <p className="font-serif text-[30px] leading-tight tabular-nums text-foreground">
              {t.counted ? <Cite node={totalNode(`Earned this year · ${COUNTRY_SHORT[c]}`, rows, CUR[c])}>{formatMoneyCompact(t.sum, CUR[c])}</Cite> : "Pending"}
            </p>
            <ul className="mt-4 space-y-3.5">
              {rows.map((i) => {
                const asset = from.get(i.id);
                const share = t.sum ? (i.amount ?? 0) / t.sum : 0;
                return (
                  <li key={i.id}>
                    <p className="flex items-baseline justify-between gap-3 text-[14.5px]">
                      <span className="text-foreground">{i.label}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        <Cite node={itemNode(i)}>{formatMoneyCompact(i.amount!, CUR[c])}</Cite>
                      </span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, share * 100)}%`, background: COUNTRY_TONES[c][0] }} />
                    </div>
                    <p className="mt-1 flex justify-between gap-3 text-[12px] text-muted-foreground">
                      <span>
                        {asset ? (
                          <>
                            from <Cite node={itemNode(asset)}>{asset.label.replace(/\s+\([^)]*\)$/, "")}</Cite>
                          </>
                        ) : (
                          i.detail ?? i.category
                        )}
                        {i.illustrative ? " · demo figure" : ""}
                      </span>
                      <span className="tabular-nums">{Math.round(share * 100)}%</span>
                    </p>
                  </li>
                );
              })}
              {rows.length === 0 && <li className="text-[13.5px] text-muted-foreground">No income recorded here this year.</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
