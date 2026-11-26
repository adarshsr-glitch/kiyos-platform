/**
 * Money by country. Amounts read from documents are drawn to scale (one chart per
 * currency, never converted). Items the customer only gave a range for are listed
 * with that range until a document confirms them.
 */

import { cn } from "@/lib/utils";
import type { Holding } from "@/lib/residency";

export const PALETTE = ["#0F5132", "#2f7d5b", "#5aa483", "#8cc4a8", "#1e6091", "#4a8fc2", "#86b8de", "#b38b2d", "#d9b55b"];

const money = (n: number, cur: "INR" | "USD") =>
  cur === "USD"
    ? n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1000)}k`
    : n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : `₹${(n / 1e5).toFixed(1)}L`;

export function MoneyChart({ holdings, compact }: { holdings: (Holding & { amount?: number; evidence?: string })[]; compact?: boolean }) {
  const groups = (["USD", "INR"] as const)
    .map((cur) => ({ cur, items: holdings.filter((h) => h.currency === cur) }))
    .filter((g) => g.items.length);
  if (!groups.length) return null;

  return (
    <div className={cn("grid gap-6", !compact && "md:grid-cols-2")}>
      {groups.map(({ cur, items }) => {
        const documented = items.filter((h) => typeof h.amount === "number");
        const pending = items.filter((h) => typeof h.amount !== "number");
        const assets = documented.filter((h) => h.kind === "asset");
        const income = documented.filter((h) => h.kind === "income");
        const total = (xs: typeof documented) => xs.reduce((s, h) => s + (h.amount ?? 0), 0);
        const max = Math.max(1, ...documented.map((h) => h.amount ?? 0));
        return (
          <div key={cur} className="rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold">{cur === "USD" ? "🇺🇸 In the US" : "🇮🇳 In India"}</p>
              <p className="text-[11px] text-muted-foreground">
                {documented.some((h) => h.source === "illustrative")
                  ? `${documented.length} of ${items.length} with amounts, incl. illustrative`
                  : `${documented.length} of ${items.length} confirmed by documents`}
              </p>
            </div>

            {documented.length > 0 ? (
              <div className="mt-3 flex items-center gap-4">
                {assets.length > 0 && (
                  <Donut size={compact ? 92 : 108} parts={assets.map((h) => ({ value: h.amount ?? 0, color: PALETTE[documented.indexOf(h) % PALETTE.length] }))} center={money(total(assets), cur)} caption="assets" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  {assets.length > 0 && <p className="text-[12px] text-muted-foreground">Assets held <b className="text-foreground">{money(total(assets), cur)}</b></p>}
                  {income.length > 0 && <p className="text-[12px] text-muted-foreground">Income per year <b className="text-foreground">{money(total(income), cur)}</b></p>}
                  <p className="text-[11px] text-muted-foreground">
                    {documented.some((h) => h.source === "illustrative") ? "Documents and illustrative demo figures" : "From documents only"}, in {cur === "USD" ? "dollars" : "rupees"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-muted-foreground">No documents read yet for these.</p>
            )}

            <ul className="mt-4 space-y-2">
              {documented.map((h, i) => (
                <li key={h.id}>
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="truncate">{h.label}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{money(h.amount ?? 0, cur)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full" style={{ width: `${((h.amount ?? 0) / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                    {h.kind === "income" ? "Income / yr" : "Value"} · {h.source === "illustrative" ? "illustrative demo figure" : `from ${h.evidence ?? "a document"}`}
                  </p>
                </li>
              ))}
              {pending.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-2.5 py-1.5 text-[12px] text-muted-foreground">
                  <span className="truncate">{h.label}</span>
                  <span className="shrink-0">{h.band} · you told us</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({ parts, size, center, caption }: { parts: { value: number; color: string }[]; size: number; center: string; caption: string }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${center} ${caption}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={13} />
      {parts.map((p, i) => {
        const len = (p.value / total) * c;
        // 2px surface gap between segments when there is more than one.
        const draw = parts.length > 1 ? Math.max(0.5, len - 2) : len;
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={13} strokeDasharray={`${draw} ${c - draw}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        off += len;
        return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{center}</text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>{caption}</text>
    </svg>
  );
}
