"use client";

/**
 * The customer workspace's shared building blocks (Review 05, UX-23). Every page is made of
 * the same few pieces, so the same thing looks and behaves the same everywhere:
 *   SectionHead  a section's title, an optional count, and "Page →" when the full view is elsewhere
 *   RowList / PanelRow  one line per item; the whole row opens the side panel
 *   StatTile     one status answer (label, value, one line), linking to its page
 *   IncomeDonut  income by source for one country: ring, total, and each source's amount
 * One interaction rule: details open the same right-hand panel; only links (→) change page.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { COUNTRY_TONES, OTHER } from "@/lib/chart-colors";
import { formatMoneyCompact, type Currency } from "@/lib/format";
import type { MoveYear, PictureItem } from "@/lib/financial-picture";
import { incomeStreams, taxYear, type Code } from "@/lib/income-timeline";
import { Cite } from "@/components/source/cite";
import { cn } from "@/lib/utils";
import { Ring } from "./home/wealth-picture";
import { slices, sliceNode } from "./home/income-picture";

/* ------------------------------------------------------------------ section head */

export function SectionHead({ id, title, count, link, meta }: { id?: string; title: React.ReactNode; count?: number; link?: { href: string; label: string }; meta?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[15px] font-semibold text-foreground">
        {title}
        {count !== undefined && count > 0 && <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{count}</span>}
      </h2>
      {link ? (
        <Link href={link.href} className="shrink-0 text-[13px] font-medium text-primary hover:underline">
          {link.label} →
        </Link>
      ) : meta ? (
        <span className="shrink-0 text-[12.5px] text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

export function RowList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>{children}</ul>;
}

/** One line; the whole row opens the panel, the same way everywhere. */
export function PanelRow({ label, sub, meta, lead, onOpen }: { label: React.ReactNode; sub?: React.ReactNode; meta?: React.ReactNode; lead?: React.ReactNode; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} aria-haspopup="dialog" className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] hover:bg-muted/50">
        {lead}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 leading-snug text-foreground/90">{label}</span>
          {sub && <span className="block truncate text-[12.5px] text-muted-foreground">{sub}</span>}
        </span>
        {meta && <span className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">{meta}</span>}
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ stat tile */

const TONE = { owed: "text-amber-800", refund: "text-emerald-700", neutral: "text-foreground" } as const;

/** One status answer. The whole tile links to the page where the detail lives. */
export function StatTile({ label, value, unit, sub, tone = "neutral", href }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: keyof typeof TONE; href: string }) {
  return (
    <Link href={href} className="group block rounded-xl border bg-card px-4 py-3 transition-colors hover:border-foreground/20">
      <span className="flex items-baseline justify-between gap-2 text-[12.5px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-muted-foreground/60 transition-colors group-hover:text-foreground">→</span>
      </span>
      <span className={cn("mt-1 block font-serif text-[24px] leading-tight tabular-nums", TONE[tone])}>
        {value}
        {unit && <span className="ml-1.5 font-sans text-[13px] font-normal">{unit}</span>}
      </span>
      {sub && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted-foreground">{sub}</span>}
    </Link>
  );
}

/* ------------------------------------------------------------------ income donut */

const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const money = (n: number, c: Code) => formatMoneyCompact(n, CUR[c]) ?? "—";

/**
 * Income by source for one country this tax year: the ring, the total and each source's
 * amount. Every amount opens its source in the panel. Counted from records only.
 */
export function IncomeDonut({ code, picture, move, today = new Date(), size = 96, bare, heading = true }: { code: Code; picture: PictureItem[]; move: MoveYear | null; today?: Date; size?: number; /** No card around it (inside another card). */ bare?: boolean; /** Off when the card around it already names the country. */ heading?: boolean }) {
  const ty = taxYear(code, today);
  const parts = slices(incomeStreams(picture, move, code, today));
  const total = parts.reduce((a, s) => a + s.sum, 0);
  const received = parts.reduce((a, s) => a + s.toDate, 0);
  const tones = parts.map((s, i) => (s.kind === "Other" ? OTHER : COUNTRY_TONES[code][Math.min(i, 3)]));

  return (
    <article aria-label={`${NAME[code]} income`} className={cn(!bare && "rounded-xl border bg-card px-4 py-3.5")}>
      {heading && (
        <p className="text-[12.5px] text-muted-foreground">
          <span aria-hidden className="mr-1">{FLAG[code]}</span>
          {NAME[code]} income · {ty.label}
        </p>
      )}
      {parts.length ? (
        <div className={cn("flex items-center gap-4", heading && "mt-2")}>
          <Ring size={size} parts={parts.map((s, i) => ({ value: s.sum, color: tones[i] }))} label={`${NAME[code]} income by source: ${parts.map((s) => `${s.label} ${money(s.sum, code)}`).join(", ")}`} />
          <div className="min-w-0 max-w-[300px] flex-1">
            <p className="font-serif text-[24px] leading-tight tabular-nums text-foreground">
              <Cite node={{ title: `Income this year · ${NAME[code]}`, value: money(total, code), parts: parts.map((s) => ({ label: s.label, value: money(s.sum, code), node: sliceNode(s, code) })) }}>
                {money(total, code)}
              </Cite>
            </p>
            <p className="text-[12px] text-muted-foreground">{money(received, code)} received so far</p>
            <ul className="mt-2 space-y-1 text-[13px]">
              {parts.map((s, i) => (
                <li key={s.label} className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-foreground/85">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: tones[i] }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">
                    <Cite node={sliceNode(s, code)}>{money(s.sum, code)}</Cite>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[13.5px] text-muted-foreground">No income recorded here this year.</p>
      )}
    </article>
  );
}
