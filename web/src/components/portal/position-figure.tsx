/**
 * One country's tax position as the expert entered it, shared by Overview and Tax position:
 * the figure as the headline, one bar (solid: tax already covered; striped: the difference),
 * and a legend that carries the numbers. Every number opens its source. The subtraction is
 * the expert's two entries against each other (lib/position balanceOf); nothing else is worked out.
 */

import { formatDate, formatMoneyCompact } from "@/lib/format";
import { balanceOf, COUNTRY_NAME, type CountryPositionData, type TaxEstimate } from "@/lib/position";
import { Cite } from "@/components/source/cite";
import { cn } from "@/lib/utils";
import { Avatar, DateTile, PositionBar, Swatch } from "./visual";

const long = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
const daysAway = (today: string, d: string) => Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);

export function PositionFigure({ p, size = "lg" }: { p: CountryPositionData; size?: "lg" | "md" }) {
  const e = p.estimate as TaxEstimate;
  const name = COUNTRY_NAME[p.code];
  const b = balanceOf(e);
  const settled = Math.abs(b) < 1;
  const owe = !settled && b > 0;
  const money = (v: number) => formatMoneyCompact(v, e.currency) ?? "—";
  const note = [
    e.basis,
    `Entered by ${e.enteredBy ?? "your expert"}${e.enteredOn ? ` on ${long(e.enteredOn)}` : ""}${e.illustrative ? " (demo figure)" : ""}. Kiyos doesn't work out tax.`,
  ]
    .filter(Boolean)
    .join(" ");
  const cite = (title: string, v: number) => (
    <Cite node={{ title: `${name} · ${title}`, value: money(v), evidence: e.evidence, note }}>
      <b className="font-semibold tabular-nums text-foreground">{money(v)}</b>
    </Cite>
  );
  const word = settled ? "settled" : owe ? "left to pay" : "coming back";
  const tone = settled ? "text-foreground" : owe ? "text-[#8A4B0B]" : "text-[#14663F]";
  const covered = owe ? e.withheld / e.liability : e.withheld > 0 ? e.liability / e.withheld : 1;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  return (
    <div>
      <p className="flex items-baseline gap-2.5">
        <span className={cn("font-serif leading-none", size === "lg" ? "text-[46px]" : "text-[38px]", tone)}>
          <Cite
            node={{
              title: `${name} · ${word}`,
              value: money(Math.abs(b)),
              parts: [
                { label: "Tax for the year", value: money(e.liability), node: { title: "Tax for the year", value: money(e.liability), evidence: e.evidence } },
                { label: p.code === "IN" ? "Paid so far" : "Withheld", value: money(e.withheld), node: { title: "Paid so far", value: money(e.withheld), evidence: e.evidence } },
                { label: settled ? "Nothing left" : owe ? "Left to pay" : "Coming back", value: money(Math.abs(b)) },
              ],
              note,
            }}
          >
            {money(Math.abs(b))}
          </Cite>
        </span>
        <span className={cn("font-medium", size === "lg" ? "text-[16px]" : "text-[15px]", tone)}>{word}</span>
      </p>
      <div className="mt-3.5">
        <PositionBar
          covered={clamp(covered)}
          diff={settled ? 0 : clamp(1 - covered)}
          mode={owe ? "owe" : "back"}
          label={settled ? `${money(e.liability)} tax, all paid` : owe ? `${money(e.withheld)} of ${money(e.liability)} already paid, ${money(b)} left` : `${money(e.withheld)} withheld against ${money(e.liability)} tax, ${money(-b)} coming back`}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-foreground/80">
        {settled ? (
          <span className="inline-flex items-center gap-1.5">
            <Swatch kind="paid" />
            Paid {cite("paid so far", e.withheld)} <span className="text-muted-foreground">of {cite("tax for the year", e.liability)} tax · nothing left</span>
          </span>
        ) : owe ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Swatch kind="paid" />
              Paid {cite("paid so far", e.withheld)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Swatch kind="owe" />
              Left {cite("left to pay", b)}
            </span>
            <span className="text-muted-foreground">of {cite("tax for the year", e.liability)} tax</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Swatch kind="paid" />
              Tax {cite("tax for the year", e.liability)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Swatch kind="back" />
              Back to you {cite("coming back", -b)}
            </span>
            <span className="text-muted-foreground">of {cite("withheld", e.withheld)} withheld</span>
          </>
        )}
      </div>
    </div>
  );
}

/** The return's due date as a tile, with the days left and, when set, the expert's stage. */
export function DueLine({ p, filing, today }: { p: CountryPositionData; filing: string | null; today: string }) {
  if (!p.due) return null;
  const n = daysAway(today, p.due);
  return (
    <div className="flex items-center gap-3">
      <DateTile date={p.due} />
      <span className="text-[13px] leading-snug">
        <span className="font-semibold text-foreground">
          {filing ?? "Return"} due {long(p.due)}
        </span>
        <br />
        <span className="text-muted-foreground">{n > 1 ? `${n} days away` : n === 1 ? "tomorrow" : n === 0 ? "today" : p.stage && /filed|submitted/i.test(p.stage) ? p.stage : "date passed"}</span>
      </span>
    </div>
  );
}

/** Who set the tax figures, with their initials: the attribution every figure carries. */
export function SetBy({ name, on, illustrative }: { /** Only when the record names who entered the figures. */ name: string | null; on: string | null; illustrative: boolean }) {
  return (
    <p className="flex items-center gap-2.5 text-[13px]">
      {name && <Avatar name={name} who="expert" size="md" />}
      <span>
        <span className="font-semibold text-foreground">Set by {name ?? "your expert"}</span>
        <span className="text-muted-foreground">
          {on ? ` · ${formatDate(on, { day: "numeric", month: "short" })}` : ""}
          {illustrative ? " · demo figures" : ""} · Kiyos doesn’t calculate tax
        </span>
      </span>
    </p>
  );
}
