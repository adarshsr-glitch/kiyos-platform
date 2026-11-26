/**
 * "Your income this year": what tax is worked out on. One column per country, India left
 * and US right, each in its own currency and tax year, never added together:
 *   1. the country, its tax year and currency;
 *   2. income this year (as the documents record it) and what has arrived so far;
 *   3. the split by source as a ring: salary, RSU vesting, dividends, rent, interest, gains.
 * Every figure opens its source; each source opens the payslips, releases or credits behind
 * it. Nothing about tax is worked out here.
 */

import { COUNTRY_TONES, OTHER } from "@/lib/chart-colors";
import { formatDate, formatMoney, formatMoneyCompact, type Currency } from "@/lib/format";
import type { MoveYear, PictureItem } from "@/lib/financial-picture";
import { incomeStreams, taxYear, type Code, type IncomeKind, type Stream } from "@/lib/income-timeline";
import { Cite, type SourceNode } from "@/components/source/cite";
import { cn } from "@/lib/utils";
import { MoveEvent, Ring } from "./wealth-picture";

const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const SYMBOL: Record<Code, string> = { IN: "₹ INR", US: "$ USD" };
const day = (s: string) => formatDate(s, { day: "numeric", month: "short", year: "numeric" }) ?? s;

export type Slice = { kind: IncomeKind | "Other"; label: string; streams: Stream[]; sum: number; toDate: number };

/** Income by source, largest first; a fifth source onwards folds into a neutral "Other". */
export function slices(streams: Stream[]): Slice[] {
  const map = new Map<string, Slice>();
  for (const s of streams) {
    const k = s.kind;
    const cur = map.get(k) ?? { kind: k, label: k === "Salary" ? "Salary" : k, streams: [], sum: 0, toDate: 0 };
    cur.streams.push(s);
    cur.sum += s.fullYear;
    cur.toDate += s.toDate;
    map.set(k, cur);
  }
  const all = Array.from(map.values()).sort((a, b) => b.sum - a.sum);
  if (all.length <= 4) return all;
  const rest = all.slice(3);
  return [
    ...all.slice(0, 3),
    { kind: "Other", label: "Other income", streams: rest.flatMap((r) => r.streams), sum: rest.reduce((a, r) => a + r.sum, 0), toDate: rest.reduce((a, r) => a + r.toDate, 0) },
  ];
}

/** The entries behind one income source: each payslip, release or credit, with its statement. */
export function streamNode(s: Stream, code: Code): SourceNode {
  const cur = CUR[code];
  const pending = s.entries.length - s.received.length;
  return {
    title: `${s.label} · ${NAME[code]}`,
    value: formatMoneyCompact(s.fullYear, cur),
    parts: [
      ...s.received.map((e) => ({
        label: `${day(e.date)} · ${s.unit}`,
        value: formatMoney(e.amount, cur) ?? "",
        node: { title: `${s.label} · ${day(e.date)}`, value: formatMoney(e.amount, cur), evidence: e.evidence },
      })),
      ...(s.item.evidence || s.item.source
        ? [{ label: "Year's figure · from your documents", value: formatMoneyCompact(s.fullYear, cur) ?? "", node: { title: s.item.label, value: s.item.value, evidence: s.item.evidence ?? null, source: s.item.source } }]
        : []),
    ],
    note:
      `${s.received.length} ${s.unit}${s.received.length === 1 ? "" : "s"} so far${pending ? `, ${pending} more due this tax year` : ""}. ` +
      "Sample entries for the prototype: the year's figure laid out on the schedule this income is paid on.",
  };
}

export function sliceNode(sl: Slice, code: Code): SourceNode {
  if (sl.streams.length === 1) return streamNode(sl.streams[0], code);
  return {
    title: `${sl.label} · ${NAME[code]}`,
    value: formatMoneyCompact(sl.sum, CUR[code]),
    parts: sl.streams.map((s) => ({ label: s.item.label, value: formatMoneyCompact(s.fullYear, CUR[code]) ?? "", node: streamNode(s, code) })),
  };
}

export function IncomePicture({ picture, move, today = new Date() }: { picture: PictureItem[]; move?: MoveYear | null; today?: Date }) {
  const cols = (["IN", "US"] as Code[]).map((code) => ({ code, ty: taxYear(code, today), parts: slices(incomeStreams(picture, move ?? null, code, today)) }));
  if (cols.every((c) => !c.parts.length)) {
    return <p className="text-[14px] text-muted-foreground">No income recorded yet. It appears here as your payslips and statements are read.</p>;
  }
  return (
    <div className="rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))]">
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[repeat(3,auto)] md:divide-x">
        {cols.map(({ code, ty, parts }, i) => (
          <Country key={code} code={code} tyLabel={ty.label} parts={parts} className={cn(i === 1 && "border-t md:border-t-0")} />
        ))}
      </div>
      {move && <MoveEvent move={move} />}
      {picture.some((i) => i.illustrative && i.section === "income") && (
        <p className="border-t px-6 py-3 text-[12px] text-muted-foreground sm:px-8">Includes illustrative demo figures. Each country in its own currency and tax year; nothing is converted or added across countries.</p>
      )}
    </div>
  );
}

function Country({ code, tyLabel, parts, className }: { code: Code; tyLabel: string; parts: Slice[]; className?: string }) {
  const cur = CUR[code];
  const total = parts.reduce((a, p) => a + p.sum, 0);
  const toDate = parts.reduce((a, p) => a + p.toDate, 0);
  const tones = parts.map((p, i) => (p.kind === "Other" ? OTHER : COUNTRY_TONES[code][Math.min(i, 3)]));
  const top = parts[0];
  const share = top && total ? Math.round((top.sum / total) * 100) : 0;
  const note = !top
    ? null
    : share >= 50
      ? `${top.label === "Salary" ? "Salary-led" : `Mostly ${top.label.toLowerCase()}`}: ${share}% of this year's income${top.streams.length === 1 && top.streams[0].item.detail ? ` · ${top.streams[0].item.detail}` : ""}.`
      : `Spread across ${parts.map((p) => p.label.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1")}.`;

  return (
    <section className={cn("flex min-w-0 flex-col gap-6 px-6 py-7 sm:px-8 md:row-span-3 md:grid md:grid-rows-subgrid", className)} aria-label={`Income in ${NAME[code]}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-foreground">
          <span aria-hidden>{FLAG[code]}</span> {NAME[code]} <span className="font-normal text-muted-foreground">· {tyLabel}</span>
        </h3>
        <span className="text-[12px] text-muted-foreground">{SYMBOL[code]}</span>
      </header>

      {parts.length === 0 ? (
        <p className="text-[14px] text-muted-foreground md:row-span-2">No income recorded in {NAME[code]} this tax year.</p>
      ) : (
        <>
          <div>
            <p className="text-[13px] text-muted-foreground">Income this year</p>
            <p className="flex items-center gap-1 font-serif text-[40px] leading-none tabular-nums text-foreground">
              {formatMoneyCompact(total, cur)}
              <Cite
                node={{
                  title: `Income this year · ${NAME[code]} · ${tyLabel}`,
                  value: formatMoneyCompact(total, cur),
                  parts: parts.map((p) => ({ label: p.label, value: formatMoneyCompact(p.sum, cur) ?? "", node: sliceNode(p, code) })),
                  note: "Added up from each source, in one currency. Nothing is converted.",
                }}
              />
            </p>
            {note && <p className="mt-2.5 text-[14.5px] leading-snug text-foreground/85">{note}</p>}
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {formatMoneyCompact(toDate, cur)} received so far ({Math.round((toDate / (total || 1)) * 100)}%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Ring parts={parts.map((p, i) => ({ value: p.sum, color: tones[i] }))} label={`${NAME[code]} income: ${parts.map((p) => `${p.label} ${Math.round((p.sum / total) * 100)}%`).join(", ")}`} />
            <table className="min-w-[220px] flex-1 text-[14.5px]">
              <tbody>
                {parts.map((p, i) => (
                  <tr key={p.label}>
                    <td className="py-1.5 pr-3">
                      <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-foreground/85">
                        <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: tones[i] }} />
                        {p.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums text-foreground">
                      {formatMoneyCompact(p.sum, cur)}
                      <Cite node={sliceNode(p, code)} className="ml-0.5" />
                    </td>
                    <td className="w-12 py-1.5 text-right tabular-nums text-muted-foreground">{Math.round((p.sum / total) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
