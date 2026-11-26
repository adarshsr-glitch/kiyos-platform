/**
 * The customer workspace's visual language: a few shapes that carry meaning, so pages need
 * fewer words. Each shape means one thing everywhere it appears:
 *   PositionBar  solid is tax already covered; the striped end is the difference (amber: to pay, green: coming back)
 *   TurnChip     who acts next, with their initials
 *   StepRail     filled = done, ring = now, hollow = next
 *   Segs         a count you can see, one block per item
 *   DateTile     a date as a shape; amber only when it needs the customer
 *   AfterFlow    what happens after the customer acts, as three chips
 * Colour has one meaning each: green done, amber needs the customer. Nothing here calculates
 * tax: every number is passed in from the expert's entries.
 */

import { cn } from "@/lib/utils";

export const initials = (name: string) =>
  name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const OWE_STRIPES = "repeating-linear-gradient(135deg,#C9822B 0 4px,#F2D9B3 4px 8px)";
const BACK_STRIPES = "repeating-linear-gradient(135deg,#2E8A57 0 4px,#CFE6D8 4px 8px)";

/** Paid against tax. `covered` and `diff` are shares of the bar (0 to 1) worked out by the caller from the expert's figures. */
export function PositionBar({ covered, diff, mode, label }: { covered: number; diff: number; mode: "owe" | "back"; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-3 overflow-hidden rounded-full bg-muted">
      <span className="bg-primary" style={{ width: `${covered * 100}%` }} />
      <span style={{ width: `${diff * 100}%`, background: mode === "owe" ? OWE_STRIPES : BACK_STRIPES }} />
    </div>
  );
}

export function Swatch({ kind }: { kind: "paid" | "owe" | "back" }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
      style={{ background: kind === "paid" ? "hsl(var(--primary))" : kind === "owe" ? OWE_STRIPES : BACK_STRIPES }}
    />
  );
}

export function Avatar({ name, who, size = "sm" }: { name: string; who: "customer" | "expert" | "other"; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "h-[22px] w-[22px] text-[9px]" : "h-[30px] w-[30px] text-[11px]",
        who === "customer" ? "bg-[#8A4B0B] text-[#FFF8EC]" : who === "expert" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      )}
    >
      {initials(name)}
    </span>
  );
}

export function TurnChip({ yours, name, label }: { yours: boolean; name: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-[7px] whitespace-nowrap rounded-full py-0 pl-[3px] pr-2.5 text-[12.5px] font-semibold",
        yours ? "bg-[#FBEFD9] text-[#7A3F06]" : "bg-muted text-foreground/80"
      )}
    >
      <Avatar name={name} who={yours ? "customer" : "expert"} />
      {label ?? (yours ? "Your turn" : `With ${name.split(" ")[0]}`)}
    </span>
  );
}

export type Step = { state: "done" | "now" | "next"; title: string; sub?: React.ReactNode; /** The current step needs the customer: amber. Otherwise a neutral ring. */ yours?: boolean };

export function StepRail({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol aria-label={label} className="grid auto-cols-fr grid-flow-col">
      {steps.map((s, i) => {
        const nextState = steps[i + 1]?.state;
        const lineDone = s.state === "done" && (nextState === "done" || nextState === "now");
        return (
          <li key={s.title} className="relative pr-2 pt-[22px] text-[12.5px] text-muted-foreground">
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1 z-[1] h-3 w-3 rounded-full border-2 bg-card",
                s.state === "done" && "border-primary bg-primary",
                s.state === "now" && (s.yours ? "border-[#C9822B] bg-[#FBEFD9]" : "border-[#9C978A] bg-muted"),
                s.state === "next" && "border-[#CFCABD]"
              )}
            />
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-3 right-0 top-[9px] h-0.5", lineDone ? "bg-primary" : "bg-border")} />}
            <span className="block text-[13px] font-semibold text-foreground">
              {s.title}
              <span className="sr-only">: {s.state === "done" ? "done" : s.state === "now" ? "in progress" : "not yet"}</span>
            </span>
            {s.sub}
          </li>
        );
      })}
    </ol>
  );
}

export function Segs({ done, total, pendingTone = "amber" }: { done: number; total: number; pendingTone?: "amber" | "none" }) {
  return (
    <span aria-hidden className="inline-flex gap-[3px] align-middle">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn("block h-2 w-4 rounded-[2px]", i < done ? "bg-primary" : pendingTone === "amber" ? "bg-[#C9822B]" : "bg-border")} />
      ))}
    </span>
  );
}

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function DateTile({ date, act = false, late = false }: { date: string; act?: boolean; late?: boolean }) {
  const [, m, d] = date.split("-").map(Number);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-[46px] w-11 shrink-0 flex-col items-center justify-center rounded-[9px] border",
        late ? "border-rose-200 bg-rose-50 text-rose-800" : act ? "border-[#EBCFA3] bg-[#FBEFD9] text-[#7A3F06]" : "border-border bg-card text-foreground"
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.06em]">{MON[m - 1]}</span>
      <span className="font-serif text-[18px] leading-[1.05]">{d}</span>
    </span>
  );
}

export function AfterFlow({ steps }: { steps: string[] }) {
  return (
    <ol aria-label="What happens after" className="flex flex-wrap items-center gap-1 text-[12px] text-foreground/80">
      {steps.map((s, i) => (
        <li key={s} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          )}
          <span className={cn("inline-flex h-[22px] items-center rounded-[5px] px-2", i === steps.length - 1 ? "bg-primary/10 font-medium text-primary" : "bg-[#F4F1E8]")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function CountryCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-[22px] min-w-7 items-center justify-center rounded-[5px] border bg-card px-1.5 text-[11px] font-semibold tracking-[0.04em] text-foreground">
      {code}
    </span>
  );
}
