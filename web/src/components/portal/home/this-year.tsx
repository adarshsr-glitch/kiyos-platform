/**
 * "Your year": one card per country that reads top to bottom as the year's story:
 * where you stand (residency), what you earned (by source), the tax on it (from your expert),
 * and the return that closes it. Each country in its own tax year and currency; nothing is
 * added across countries. Figures open their source with one click.
 */

import { COUNTRY_TONES, OTHER } from "@/lib/chart-colors";
import { formatDate, formatMoneyCompact, type Currency } from "@/lib/format";
import type { MoveYear, PictureItem } from "@/lib/financial-picture";
import { incomeStreams, taxYear, type Code } from "@/lib/income-timeline";
import { balanceOf, balanceText, STATUS_LONG, STATUS_SHORT, type CountryPositionData } from "@/lib/position";
import { Cite } from "@/components/source/cite";
import { cn } from "@/lib/utils";
import { slices, sliceNode } from "./income-picture";

const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const d = (s: string | null | undefined) => (s ? formatDate(s, { day: "numeric", month: "short", year: "numeric" }) : null);
const money = (n: number, c: Code) => formatMoneyCompact(n, CUR[c]) ?? "—";

export function ThisYear({
  picture,
  move,
  positions,
  captain,
  today = new Date(),
}: {
  picture: PictureItem[];
  move: MoveYear | null;
  positions: Record<Code, CountryPositionData>;
  captain: string;
  today?: Date;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {(["IN", "US"] as Code[]).map((c) => (
        <CountryCard key={c} code={c} picture={picture} move={move} p={positions[c]} captain={captain} today={today} />
      ))}
    </div>
  );
}

function CountryCard({ code, picture, move, p, captain, today }: { code: Code; picture: PictureItem[]; move: MoveYear | null; p: CountryPositionData; captain: string; today: Date }) {
  const ty = taxYear(code, today);
  const parts = slices(incomeStreams(picture, move, code, today));
  const total = parts.reduce((a, s) => a + s.sum, 0);
  const received = parts.reduce((a, s) => a + s.toDate, 0);
  const tones = parts.map((s, i) => (s.kind === "Other" ? OTHER : COUNTRY_TONES[code][Math.min(i, 3)]));
  const e = p.estimate;
  const b = e ? balanceText(e) : null;
  const paidShare = e && e.liability > 0 ? Math.min(1, e.withheld / e.liability) : 0;
  const first = captain.split(" ")[0];

  return (
    <section aria-label={NAME[code]} className="flex flex-col rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))]">
      {/* where you stand */}
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h3 className="text-[15px] font-semibold text-foreground">
          <span aria-hidden className="mr-1.5">{FLAG[code]}</span>
          {NAME[code]} <span className="font-normal text-muted-foreground">· {ty.label}</span>
        </h3>
        {p.status ? (
          <span title={STATUS_LONG[p.status] ?? p.statusLabel ?? undefined} className={cn("rounded-full px-2.5 py-1 text-[12.5px] font-medium", code === "IN" ? "bg-[#e7efe9] text-[#2f5d45]" : "bg-[#e6ebf2] text-[#2c4a6e]")}>
            {STATUS_SHORT[p.status] ?? p.status}
          </span>
        ) : (
          <span className="text-[12.5px] text-muted-foreground">Residency pending</span>
        )}
      </header>

      {/* what you earned: the total, then one slim bar split by source (each figure opens its source) */}
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">Income this year</p>
          {parts.length > 0 && <p className="text-[12px] text-muted-foreground">{money(received, code)} received so far</p>}
        </div>
        {parts.length ? (
          <>
            <p className="mt-0.5 font-serif text-[28px] leading-tight tabular-nums text-foreground">
              <Cite node={{ title: `Income this year · ${NAME[code]}`, value: money(total, code), parts: parts.map((s) => ({ label: s.label, value: money(s.sum, code), node: sliceNode(s, code) })) }}>
                {money(total, code)}
              </Cite>
            </p>
            <div className="mt-2.5 flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${NAME[code]} income by source: ${parts.map((s) => `${s.label} ${money(s.sum, code)}`).join(", ")}`}>
              {parts.map((s, i) => (
                <span key={s.label} style={{ width: `${total ? (s.sum / total) * 100 : 0}%`, background: tones[i] }} className="h-full min-w-[3px]" />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 text-[13.5px] sm:grid-cols-4 lg:grid-cols-1 xl:grid-cols-2">
              {parts.map((s, i) => {
                const when = s.streams.length === 1 ? s.streams[0].item.detail?.match(/\b[A-Z][a-z]{2}[–-][A-Z][a-z]{2} \d{4}\b/)?.[0] : null;
                return (
                <li key={s.label} title={when ? `${s.label}, ${when}` : undefined} className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-foreground/85">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: tones[i] }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    <Cite node={sliceNode(s, code)}>{money(s.sum, code)}</Cite>
                  </span>
                </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-[14px] text-muted-foreground">No income recorded here this year.</p>
        )}
      </div>

      {/* the tax on it, from the expert: one line, then how much of it is paid */}
      <div className="border-t px-5 py-4">
        {e && b ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] text-muted-foreground">Tax this year</p>
              <p className="flex items-baseline gap-1.5">
                <span className={cn("font-serif text-[22px] leading-none tabular-nums", b.tone === "owed" ? "text-amber-800" : b.tone === "refund" ? "text-emerald-700" : "text-foreground")}>
                  <Cite
                    node={{
                      title: `Tax this year · ${NAME[code]}`,
                      value: `${b.amount} ${b.label}`,
                      parts: [
                        { label: "Liability", value: money(e.liability, code), node: { title: "Liability", value: money(e.liability, code), evidence: e.evidence } },
                        { label: "Paid so far", value: money(e.withheld, code), node: { title: "Paid so far", value: money(e.withheld, code), evidence: e.evidence } },
                        { label: balanceOf(e) >= 0 ? "Left to pay" : "Due back", value: b.amount },
                      ],
                      note: `Entered by ${e.enteredBy ?? first}${e.enteredOn ? ` on ${d(e.enteredOn)}` : ""}. Kiyos doesn't work out tax.`,
                    }}
                  >
                    {b.amount}
                  </Cite>
                </span>
                <span className={cn("text-[13px]", b.tone === "owed" ? "text-amber-800" : "text-emerald-700")}>{b.label}</span>
              </p>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(paidShare * 100)}% of the tax paid`}>
              <div className="h-full rounded-full" style={{ width: `${paidShare * 100}%`, background: COUNTRY_TONES[code][0] }} />
            </div>
            <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
              <span>
                {money(e.withheld, code)} paid of {money(e.liability, code)}
              </span>
              <span>
                From {e.enteredBy ?? first}
                {e.enteredOn ? ` · ${d(e.enteredOn)}` : ""}
                {e.illustrative ? " · demo figure" : ""}
              </span>
            </p>
          </>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12.5px] text-muted-foreground">Tax this year</p>
            <p className="text-[13px] text-muted-foreground">{first} adds this once your income is reviewed</p>
          </div>
        )}
      </div>

      {/* the return that closes the year */}
      <footer className="mt-auto flex items-center justify-between gap-3 rounded-b-2xl bg-muted/40 px-5 py-2.5 text-[13px]">
        <span className="text-foreground">{p.filing ?? (code === "IN" ? "India return" : "US return")}</span>
        <span className="text-muted-foreground">{p.due ? `due ${d(p.due)}` : "due date to be set"}</span>
      </footer>
    </section>
  );
}
