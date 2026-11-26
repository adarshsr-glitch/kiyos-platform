/**
 * What the customer holds, per country, grouped by meaning: the class that leads that
 * country gets its own group ("Property in India", "Retirement in the US"), the rest sit
 * together. Each line is a name, a short detail (place, provider or document) and the
 * amount. Demo figures are noted once for the page, not on every line.
 */

import { formatMoneyCompact, type Currency } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";
import { type PictureItem, type Section } from "@/lib/financial-picture";
import { Cite } from "@/components/source/cite";
import { itemNode } from "@/components/source/nodes";

type Code = "IN" | "US";
const CUR: Record<Code, Currency> = { IN: "INR", US: "USD" };
const IN_COUNTRY: Record<Code, string> = { IN: "in India", US: "in the US" };

const lowerJoin = (xs: string[]) => {
  const w = xs.map((x) => x.toLowerCase().replace(" & deposits", "").replace("&", "and"));
  const s = w.length <= 1 ? w.join("") : `${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Where a figure stands: told to us (assessment, onboarding), read from a document and
 * being checked, or reviewed by the expert. Illustrative demo figures say so.
 */
export function statusOf(r: PictureItem, docs: DocumentItem[]): { text: string; tone: "told" | "checking" | "reviewed" | "demo" } | null {
  if (r.illustrative) return { text: "demo figure", tone: "demo" };
  if (r.source === "WhatsApp assessment") return { text: "you told us", tone: "told" };
  if (r.source === "onboarding" || r.source === "Onboarding answer") return { text: "you told us", tone: "told" };
  const doc = docs.find((d) => d.filename === r.source);
  if (doc) return doc.status === "reviewed" ? { text: "reviewed", tone: "reviewed" } : { text: "from document · being checked", tone: "checking" };
  return null;
}
const TONE = { told: "text-muted-foreground", checking: "text-sky-700", reviewed: "text-emerald-700", demo: "text-muted-foreground" } as const;

export function HoldingsBoard({ items, documents = [] }: { items: PictureItem[]; documents?: DocumentItem[] }) {
  return (
    <div className="rounded-2xl bg-card px-6 py-7 shadow-[0_0_0_1px_hsl(var(--border))] sm:px-10 sm:py-9">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        {(["IN", "US"] as Code[]).map((c) => (
          <div key={c} className="min-w-0 space-y-8">
            <Groups items={items} code={c} section="holdings" docs={documents} />
            <Groups items={items} code={c} section="income" docs={documents} />
          </div>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
        <span><span className="text-emerald-700">reviewed</span>: checked by your expert</span>
        <span><span className="text-sky-700">being checked</span>: read from your document, not yet reviewed</span>
        <span>you told us: from your assessment or onboarding</span>
      </p>
    </div>
  );
}

function Groups({ items, code, section, docs }: { items: PictureItem[]; code: Code; section: Section; docs: DocumentItem[] }) {
  const rows = items.filter((i) => i.section === section && i.country === code);
  if (!rows.length) return null;
  const sumOf = (cat: string) => rows.filter((r) => r.category === cat).reduce((s, r) => s + (r.amount ?? 0), 0);
  const cats = Array.from(new Set(rows.map((r) => r.category ?? "Other"))).sort((a, b) => sumOf(b) - sumOf(a));

  const groups: { title: string; list: PictureItem[] }[] =
    section === "income"
      ? [{ title: `This year's income ${IN_COUNTRY[code]}`, list: rows }]
      : [
          { title: `${cats[0]} ${IN_COUNTRY[code]}`, list: rows.filter((r) => r.category === cats[0]) },
          ...(cats.length > 1 ? [{ title: lowerJoin(cats.slice(1)), list: rows.filter((r) => r.category !== cats[0]) }] : []),
        ];

  return (
    <>
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="mb-1 text-[15px] text-muted-foreground">{g.title}</h3>
          <ul className="divide-y">
            {g.list
              .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1))
              .map((r) => {
                const paren = r.label.match(/\s+\(([^)]*)\)$/)?.[1] ?? null;
                const name = paren ? r.label.replace(/\s+\([^)]*\)$/, "") : r.label;
                const detail = [paren, r.detail && !/illustrative|range you gave us|approximate range/i.test(r.detail) ? r.detail : null].filter(Boolean)[0];
                const st = statusOf(r, docs);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0 text-[16px] leading-snug text-foreground">
                      {name}
                      {detail && <span className="text-[14px] text-muted-foreground"> · {detail}</span>}
                    </span>
                    <span className="flex shrink-0 items-start gap-1">
                      <span className="text-right">
                        <span className="block text-[16px] font-semibold tabular-nums text-foreground">
                          {typeof r.amount === "number" ? formatMoneyCompact(r.amount, CUR[code]) : <span className="text-[14px] font-normal text-muted-foreground">{r.value ?? "—"}</span>}
                        </span>
                        {st && st.tone !== "demo" && <span className={`block text-[11.5px] ${TONE[st.tone]}`}>{st.text}</span>}
                      </span>
                      <Cite node={itemNode(r)} className="-mr-1.5 mt-0.5" />
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </>
  );
}
