/**
 * The preliminary India–US assessment, laid out by where each issue lives: India, both
 * countries, or the US. Each finding says what may apply, why, and which of the customer's
 * answers it rests on. Emphasis is used only where it means something: a finding that
 * needs more information, or one an expert quotes separately. Then what Kiyos already
 * knows from the answers, next to what is still unknown.
 */

import type { InitialScan, RiskRow } from "@/lib/types";

type Lane = "IN" | "BOTH" | "US";
const LANES: { key: Lane; title: string; sub: string }[] = [
  { key: "IN", title: "🇮🇳 India", sub: "Indian tax and reporting" },
  { key: "BOTH", title: "🇮🇳 🇺🇸 Both countries", sub: "Where the two systems meet" },
  { key: "US", title: "🇺🇸 United States", sub: "US tax and reporting" },
];

const QUESTION: Record<string, string> = {
  need: "What you wanted help with",
  move_timing: "Your move",
  years_abroad: "Time abroad",
  retirement: "US retirement accounts",
  equity: "US shares or RSUs",
  india_funds: "Indian mutual funds",
  india_property: "Property in India",
  household: "Household",
};

export function CrossBorderMap({ scan }: { scan: InitialScan }) {
  const by = (l: Lane) => scan.rows.filter((r) => (r.country as Lane) === l);
  const counts = LANES.map((l) => ({ ...l, n: by(l.key).length })).filter((l) => l.n);
  const needMore = scan.rows.filter((r) => r.confidence !== "likely").length;
  const quoted = scan.rows.filter((r) => r.priced_separately).length;

  return (
    <div className="space-y-8">
      {/* summary in one or two sentences, from the rows */}
      <p className="max-w-[70ch] text-[17px] leading-relaxed text-foreground">
        {scan.rows.length} area{scan.rows.length === 1 ? "" : "s"} may need attention:{" "}
        {counts.map((c, i) => `${i ? (i === counts.length - 1 ? " and " : ", ") : ""}${c.n} ${c.key === "IN" ? "in India" : c.key === "US" ? "in the US" : "across both countries"}`).join("")}.
        {scan.rows[0] && <> The first to look at: {scan.rows[0].finding.charAt(0).toLowerCase() + scan.rows[0].finding.slice(1)}.</>}
        {needMore > 0 && <span className="text-muted-foreground"> {needMore} need more information before anyone can be sure.</span>}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-0 lg:divide-x">
        {LANES.map((l) => {
          const rows = by(l.key);
          return (
            <section key={l.key} aria-label={l.title} className="min-w-0 lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <header className="mb-3">
                <h3 className="text-[15px] font-semibold text-foreground">{l.title}</h3>
                <p className="text-[12.5px] text-muted-foreground">{l.sub}</p>
              </header>
              {rows.length === 0 ? (
                <p className="text-[13.5px] text-muted-foreground">Nothing flagged from your answers.</p>
              ) : (
                <ul className="space-y-5">
                  {rows.map((r) => (
                    <Finding key={r.area + r.finding} r={r} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 border-t pt-7 md:grid-cols-2">
        <section aria-label="What Kiyos knows">
          <h3 className="mb-2 text-[14px] text-muted-foreground">What Kiyos already knows · from your WhatsApp answers</h3>
          <dl>
            {Object.entries(scan.answers).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
                <dt className="text-[13.5px] text-muted-foreground">{QUESTION[k] ?? k.replace(/_/g, " ")}</dt>
                <dd className="text-right text-[14px] text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label="Still unknown">
          <h3 className="mb-2 text-[14px] text-muted-foreground">Still unknown · needed before a real position</h3>
          <ul>
            {scan.missing.map((m) => (
              <li key={m} className="border-b py-2 text-[14px] text-foreground last:border-b-0">{m}</li>
            ))}
            {quoted > 0 && <li className="py-2 text-[14px] text-foreground">An expert review of the {quoted === 1 ? "area" : "areas"} quoted separately</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Finding({ r }: { r: RiskRow }) {
  const incomplete = r.confidence !== "likely";
  return (
    <li className="min-w-0">
      <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{r.area}</p>
      <p className="mt-0.5 text-[15px] font-medium leading-snug text-foreground">{r.finding}</p>
      <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{r.why}</p>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground">
        Based on your answer “{r.input}”
        {incomplete && <span className="ml-1 rounded bg-amber-50 px-1.5 py-px text-amber-900">needs more information</span>}
        {r.priced_separately && <span className="ml-1 rounded bg-muted px-1.5 py-px text-foreground">expert quotes this separately</span>}
      </p>
    </li>
  );
}
