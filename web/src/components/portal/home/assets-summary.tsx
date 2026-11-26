/**
 * What the customer owns, kept brief and for context: the returns are built from the
 * income these produce, which has its own section. One plain line per country (total and what it is mostly made
 * of) and the largest holdings, each with its source. The full list lives on Profile.
 */

import Link from "next/link";
import { formatMoneyCompact, type Currency } from "@/lib/format";
import { totals, type PictureItem } from "@/lib/financial-picture";
import { assetNote } from "@/lib/insights";
import { Cite } from "@/components/source/cite";
import { itemNode, totalNode } from "@/components/source/nodes";

type Code = "IN" | "US";
const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const plain = (s: string) => s.replace(/\s+\([^)]*\)$/, "");

export function AssetsSummary({ picture }: { picture: PictureItem[] }) {
  const cols = (["IN", "US"] as Code[]).map((code) => {
    const items = picture.filter((i) => i.section === "holdings" && i.country === code);
    return { code, items, t: totals(picture, "holdings", code), note: assetNote(picture, code) };
  });
  if (cols.every((c) => !c.items.length)) return null;
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-6 rounded-2xl bg-card px-6 py-6 shadow-[0_0_0_1px_hsl(var(--border))] sm:px-8 md:grid-cols-2">
      {cols.map(({ code, items, t, note }) => {
        const valued = items.filter((i) => typeof i.amount === "number").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
        return (
          <section key={code} aria-label={`What you own in ${NAME[code]}`} className="min-w-0">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-muted-foreground">
                <span aria-hidden>{FLAG[code]}</span> {NAME[code]}
              </span>
              <span className="flex items-center text-[20px] font-semibold tabular-nums text-foreground">
                {t.counted ? formatMoneyCompact(t.sum, CUR[code]) : "Not valued yet"}
                {items.length > 0 && <Cite node={totalNode(`What you own · ${NAME[code]}`, items, CUR[code])} />}
              </span>
            </p>
            {note && <p className="mt-0.5 text-[13.5px] text-foreground/80">{note}</p>}
            {valued.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[13.5px]">
                {valued.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted-foreground">{plain(i.label)}</span>
                    <span className="flex shrink-0 items-center tabular-nums text-foreground">
                      {formatMoneyCompact(i.amount!, CUR[code])}
                      <Cite node={itemNode(i)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(valued.length > 3 || t.ranged > 0) && (
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {[valued.length > 3 && `${valued.length - 3} more`, t.ranged > 0 && `${t.ranged} not valued yet`].filter(Boolean).join(" · ")}
              </p>
            )}
          </section>
        );
      })}
      <p className="text-[12.5px] text-muted-foreground md:col-span-2">
        Shown for context. Your returns are built from the income these produce (rent, interest, dividends, gains), which is counted above.{" "}
        <Link href="/portal/profile" className="font-medium text-primary hover:underline">
          Everything you own →
        </Link>
      </p>
    </div>
  );
}
