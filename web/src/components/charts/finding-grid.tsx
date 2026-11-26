"use client";

/**
 * What may apply, as a grid: areas down the side, India / both / US across. Each
 * filled cell is a finding from the scan; tapping it shows the evidence chain:
 * your answer → the question it answered → the rule → what we found.
 */

import { useState } from "react";
import Link from "next/link";
import { whatsappHref, whatsappTarget } from "@/lib/whatsapp";
import { ArrowDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/side-sheet";
import type { RiskRow } from "@/lib/types";

const COLS: { code: RiskRow["country"]; label: string }[] = [
  { code: "IN", label: "🇮🇳 India" },
  { code: "BOTH", label: "Both" },
  { code: "US", label: "🇺🇸 US" },
];

export function FindingGrid({ rows }: { rows: RiskRow[] }) {
  const [open, setOpen] = useState<RiskRow | null>(null);
  const areas = Array.from(new Set(rows.map((r) => r.area)));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-[13px]">
          <thead>
            <tr>
              <th className="w-[40%]" />
              {COLS.map((c) => (
                <th key={c.code} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area}>
                <td className="pr-2 font-medium leading-tight">{area}</td>
                {COLS.map((c) => {
                  const row = rows.find((r) => r.area === area && r.country === c.code);
                  return (
                    <td key={c.code} className="text-center">
                      {row ? (
                        <button
                          onClick={() => setOpen(row)}
                          className={cn(
                            "h-11 w-full rounded-lg text-[11px] font-medium ring-1 ring-inset transition-shadow hover:shadow",
                            row.confidence === "likely" ? "bg-amber-100 text-amber-900 ring-amber-300" : "bg-muted text-muted-foreground ring-black/10"
                          )}
                        >
                          {row.confidence === "likely" ? "May apply" : "Needs detail"}
                        </button>
                      ) : (
                        <span className="block h-11 rounded-lg bg-muted/30" aria-hidden />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Tap a cell to see what it&apos;s based on.</p>

      <SideSheet open={!!open} onClose={() => setOpen(null)} eyebrow={open ? `${open.area} · ${open.country === "BOTH" ? "India and US" : open.country === "IN" ? "India" : "US"}` : undefined} title={open?.finding}>
        {open && (
          <div className="space-y-4 text-sm">
            <ol className="space-y-2">
              <li className="rounded-xl border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">You told us</p>
                <p className="mt-1 font-medium">“{open.input}”</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Answer to: {open.input_question} · WhatsApp scan</p>
              </li>
              <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
              <li className="rounded-xl border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Rule</p>
                <p className="mt-1">{open.rule ? <code className="text-[12px]">{open.rule}</code> : "Scan rule (no statutory test yet)"}</p>
              </li>
              <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
              <li className="rounded-xl border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">What we found</p>
                <p className="mt-1">{open.why}</p>
              </li>
              <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
              <li className="rounded-xl border border-dashed p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Review</p>
                <p className="mt-1 text-muted-foreground">Not yet reviewed by an expert. A plan gets each area checked against your documents.</p>
              </li>
            </ol>
            <Link href={whatsappHref} target={whatsappTarget} className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[12.5px] hover:bg-muted">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#00a884]" /> <span><b>Ask about this on WhatsApp.</b> General questions are free.</span>
            </Link>
          </div>
        )}
      </SideSheet>
    </div>
  );
}
