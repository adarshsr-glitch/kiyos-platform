/**
 * "Your money in two countries". One column per country, India left and US right, and
 * every column holds the same things in the same rows, so a number's country, currency
 * and kind (assets vs this year's income) are never in doubt:
 *   1. the country, with its currency
 *   2. assets: total and one computed line on what they're made of
 *   3. asset composition: ring and legend
 *   4. income this year: total, period, and the sources behind it
 * A move between countries is a dated event of its own, drawn underneath, not mixed in.
 * Each country has its own tonal family (India green, US navy); nothing is converted.
 */

import { COUNTRY_TONES } from "@/lib/chart-colors";
import { formatMoneyCompact, type Currency } from "@/lib/format";
import { byCategory, totals, type MoveYear, type PictureItem } from "@/lib/financial-picture";
import { assetNote } from "@/lib/insights";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";
import { statusOf } from "./holdings-board";
import { Cite } from "@/components/source/cite";
import { totalNode } from "@/components/source/nodes";

type Code = "IN" | "US";
const CODES: Code[] = ["IN", "US"];
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const SYMBOL: Record<Code, string> = { IN: "₹ INR", US: "$ USD" };

export function WealthPicture({
  picture,
  move,
  documents,
  income = true,
}: {
  picture: PictureItem[];
  move?: MoveYear | null;
  insight?: boolean;
  documents?: DocumentItem[];
  /** Off where income has its own section (Overview), so figures aren't shown twice. */
  income?: boolean;
}) {
  const any = picture.some((i) => typeof i.amount === "number");
  if (!any) {
    return <p className="text-[14px] text-muted-foreground">No documented amounts yet. They appear here as your documents are read.</p>;
  }

  return (
    <div className="rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))]">
      {/* Shared rows across both columns keep every block level with its counterpart. */}
      <div className={cn("grid grid-cols-1 md:grid-cols-2 md:divide-x", income ? "md:grid-rows-[repeat(4,auto)]" : "md:grid-rows-[repeat(3,auto)]")}>
        {CODES.map((c, i) => (
          <Country key={c} code={c} picture={picture} move={move ?? null} docs={documents} income={income} className={cn(i === 1 && "border-t md:border-t-0")} />
        ))}
      </div>
      {move && income && <MoveEvent move={move} />}
      {picture.some((i) => i.illustrative) && (
        <p className="border-t px-6 py-3 text-[12px] text-muted-foreground sm:px-8">Includes illustrative demo figures. Each country in its own currency; nothing is converted or added across countries.</p>
      )}
    </div>
  );
}

function Country({ code, picture, move, docs, income: showIncome = true, className }: { code: Code; picture: PictureItem[]; move: MoveYear | null; docs?: DocumentItem[]; income?: boolean; className?: string }) {
  const assets = totals(picture, "holdings", code);
  const income = totals(picture, "income", code);
  const parts = byCategory(picture, "holdings", code).sort((a, b) => b.sum - a.sum);
  const sources = byCategory(picture, "income", code).sort((a, b) => b.sum - a.sum);
  const tones = COUNTRY_TONES[code];
  const of = (sec: string, cat?: string) => picture.filter((i) => i.section === sec && i.country === code && (!cat || i.category === cat));
  const note = assetNote(picture, code);
  // Where these figures stand: shown, never hidden, but never passed off as reviewed.
  const valued = (sec: string) => picture.filter((i) => i.section === sec && i.country === code && typeof i.amount === "number" && !i.illustrative);
  const standing = docs ? trust(valued("holdings"), docs) : null;
  const incomeStanding = docs ? trust(valued("income"), docs) : null;
  const d = move ? new Date(move.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
  // Only the salary is split by the move; rent, interest and gains run all year.
  const period = move ? (code === "US" ? `salary until your move on ${d}` : `salary from your move on ${d}`) : "this calendar year";

  return (
    <section className={cn("flex min-w-0 flex-col gap-6 px-6 py-7 sm:px-8 md:grid md:grid-rows-subgrid", showIncome ? "md:row-span-4" : "md:row-span-3", className)} aria-label={NAME[code]}>
      {/* 1 · country */}
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-foreground">
          <span aria-hidden>{FLAG[code]}</span> {NAME[code]}
        </h3>
        <span className="text-[12px] text-muted-foreground">{SYMBOL[code]}</span>
      </header>

      {/* 2 · assets */}
      <div>
        <p className="text-[13px] text-muted-foreground">Total assets</p>
        <p className="flex items-center gap-1 font-serif text-[40px] leading-none tabular-nums text-foreground">
          {assets.counted ? formatMoneyCompact(assets.sum, CUR[code]) : "Not valued yet"}
          {of("holdings").length > 0 && <Cite node={totalNode(`Total assets · ${NAME[code]}`, of("holdings"), CUR[code])} />}
        </p>
        {note && <p className="mt-2.5 text-[14.5px] leading-snug text-foreground/85">{note}</p>}
        {assets.ranged > 0 && <p className="mt-1 text-[12.5px] text-muted-foreground">+ {assets.ranged} more known, not yet valued</p>}
        {standing && <p className="mt-1 text-[12.5px] text-muted-foreground">{standing}</p>}
      </div>

      {/* 3 · composition */}
      <div>
        {parts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Ring parts={parts.map((p, i) => ({ value: p.sum, color: tones[Math.min(i, tones.length - 1)] }))} label={`${NAME[code]} assets: ${parts.map((p) => `${p.category} ${Math.round((p.sum / assets.sum) * 100)}%`).join(", ")}`} />
            <table className="min-w-[220px] flex-1 text-[14.5px]">
              <tbody>
                {parts.map((p, i) => (
                  <tr key={p.category}>
                    <td className="py-1.5 pr-3">
                      <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-foreground/85">
                        <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: tones[Math.min(i, tones.length - 1)] }} />
                        {p.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums text-foreground">
                      {formatMoneyCompact(p.sum, CUR[code])}
                      <Cite node={totalNode(`${p.category} · ${NAME[code]}`, of("holdings", p.category), CUR[code])} className="ml-0.5" />
                    </td>
                    <td className="w-12 py-1.5 text-right tabular-nums text-muted-foreground">{Math.round((p.sum / assets.sum) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13.5px] text-muted-foreground">No valued assets here yet.</p>
        )}
      </div>

      {/* 4 · income this year */}
      {showIncome && (
      <div className="border-t pt-5">
        <p className="text-[13px] text-muted-foreground">Income this year · {period}</p>
        <p className="flex items-center gap-1 font-serif text-[28px] leading-tight tabular-nums text-foreground">
          {income.counted ? formatMoneyCompact(income.sum, CUR[code]) : "—"}
          {income.counted > 0 && <Cite node={totalNode(`Income this year · ${NAME[code]}`, of("income"), CUR[code])} />}
        </p>
        {incomeStanding && <p className="text-[12.5px] text-muted-foreground">{incomeStanding}</p>}
        {sources.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {sources.map((s) => (
              <li key={s.category} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-foreground/80">{s.category}</span>
                <span className="flex items-center tabular-nums text-foreground">
                  {formatMoneyCompact(s.sum, CUR[code])}
                  <Cite node={totalNode(`${s.category} · ${NAME[code]}`, of("income", s.category), CUR[code])} className="-mr-1.5" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13.5px] text-muted-foreground">No income recorded here this year.</p>
        )}
      </div>
      )}
    </section>
  );
}

/** "2 figures being checked · 1 reviewed": how far the expert has got with this country's numbers. */
function trust(items: PictureItem[], docs: DocumentItem[]): string | null {
  if (!items.length) return null;
  const n = { reviewed: 0, checking: 0, told: 0 };
  for (const i of items) {
    const s = statusOf(i, docs);
    if (s && s.tone !== "demo") n[s.tone] += 1;
  }
  const parts = [
    n.checking && `${n.checking} figure${n.checking === 1 ? "" : "s"} from documents, being checked`,
    n.reviewed && `${n.reviewed} reviewed`,
    n.told && `${n.told} as you told us`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The move as its own dated event: where the salary came from on each side of it. */
export function MoveEvent({ move }: { move: MoveYear }) {
  const d = new Date(move.date);
  const start = new Date(d.getFullYear(), 0, 1).getTime();
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime();
  const at = Math.min(92, Math.max(8, ((d.getTime() - start) / (end - start)) * 100));
  const when = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="border-t px-6 py-6 sm:px-8" aria-label={`Moved on ${when}`}>
      <p className="text-[13px] text-muted-foreground">Event this year</p>
      <p className="mt-0.5 text-[15.5px] text-foreground">
        <span className="font-semibold">{when}</span> · moved from the US to India
        {move.us.employer && move.in.employer && <span className="text-muted-foreground"> · {move.us.employer} until then, {move.in.employer} after</span>}
      </p>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full">
        <span style={{ width: `${at}%`, background: COUNTRY_TONES.US[0] }} />
        <span className="flex-1" style={{ background: COUNTRY_TONES.IN[0] }} />
      </div>
      <div className="relative mt-2 h-4 text-[12.5px] text-muted-foreground">
        <span className="absolute left-0">Jan · 🇺🇸</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${at}%` }}>
          {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · moved
        </span>
        <span className="absolute right-0">🇮🇳 · Dec</span>
      </div>
    </section>
  );
}

/** Allocation ring with a 3px surface gap between segments. */
export function Ring({ parts, label, size = 128 }: { parts: { value: number; color: string }[]; label: string; size?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const stroke = 17;
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={label}>
      {parts.map((p, i) => {
        const len = (p.value / total) * c;
        const draw = parts.length > 1 ? Math.max(0.5, len - 3) : len;
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeDasharray={`${draw} ${c - draw}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        off += len;
        return el;
      })}
    </svg>
  );
}
