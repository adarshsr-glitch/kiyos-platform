/**
 * Builds the source trees the Cite sheet opens: a single figure, a total (the figures it
 * adds up), or a day count (the trips it is made of). Counting and adding only; every row
 * keeps its own source.
 */

import type { SourceNode } from "./cite";
import type { PictureItem } from "@/lib/financial-picture";
import type { Residency, ResidencyYear } from "@/lib/residency";
import { formatDate, formatMoneyCompact, type Currency } from "@/lib/format";

const d = (s: string) => formatDate(s, { day: "numeric", month: "short", year: "numeric" });

/** One figure: where it was read or who said it. */
export function itemNode(i: PictureItem): SourceNode {
  return { title: i.label, value: i.value, evidence: i.evidence ?? null, source: i.illustrative ? null : i.source, ...(i.illustrative && !i.evidence ? { evidence: { kind: "demo" } } : {}) };
}

/** A total: the figures it adds up, each openable. Same currency only; nothing converted. */
export function totalNode(title: string, items: PictureItem[], currency: Currency): SourceNode {
  if (items.length === 1) return { ...itemNode(items[0]), title: `${title} · ${items[0].label}` };
  const counted = items.filter((i) => typeof i.amount === "number");
  const sum = counted.reduce((s, i) => s + (i.amount ?? 0), 0);
  const unvalued = items.filter((i) => typeof i.amount !== "number");
  return {
    title,
    value: formatMoneyCompact(sum, currency),
    parts: [
      ...counted.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).map((i) => ({ label: i.label, value: formatMoneyCompact(i.amount!, currency) ?? "—", node: itemNode(i) })),
      ...unvalued.map((i) => ({ label: i.label, value: "not valued yet", node: itemNode(i), muted: true })),
    ],
    note: counted.length > 1 ? "Added up from the figures above, in one currency. Nothing is converted." : null,
  };
}

/** India days in a year: the stays (and dated facts) that make up the count. */
export function daysNode(year: ResidencyYear, residency: Residency): SourceNode {
  const fact = (k: string | null) => residency.facts.find((f) => f.key === k) ?? null;
  const parts = (year.parts ?? []).map((p) => {
    const stay = p.stay_id != null ? residency.stays.find((s) => s.id === p.stay_id) ?? null : null;
    const f = fact(p.fact);
    const label =
      p.kind === "lived"
        ? `Living in India until you moved abroad · ${d(p.from)} → ${d(p.to)}`
        : `${d(p.from)} → ${d(p.to)}${p.projected ? " (to year-end, projected)" : ""}`;
    const node: SourceNode | null = stay
      ? { title: `Trip from ${d(stay.arrived)}`, value: stay.departed ? `${d(stay.arrived)} → ${d(stay.departed)}` : `${d(stay.arrived)} → still in India`, evidence: stay.evidence ?? null, source: stay.source }
      : f
        ? { title: f.label, value: d(f.value), evidence: f.evidence ?? null, source: f.source }
        : null;
    return { label, value: `${p.days} day${p.days === 1 ? "" : "s"}`, node };
  });
  return {
    title: `Days in India · ${year.year}`,
    value: `${year.days} days`,
    parts: parts.length ? parts : [{ label: "No time in India recorded in this year", value: "0 days", node: null, muted: true }],
    note: `Each day in India between ${d(year.start)} and ${d(year.end)} counts once, arrival and departure days included.${year.projected ? " Days after today assume you stay." : ""}`,
  };
}
