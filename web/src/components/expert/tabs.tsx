"use client";

/**
 * The one tab control on the expert side: a recessed track with raised, clearly pressable
 * segments, so it reads as "pick one" at a glance. Arrow keys move between tabs (WAI-ARIA tabs).
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type Tab<K extends string> = { key: K; label: string; count?: number; alert?: boolean };

export function Tabs<K extends string>({ tabs, value, onChange, label, className }: { tabs: Tab<K>[]; value: K | null; onChange: (k: K) => void; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.key);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[tabs.indexOf(next)]?.focus();
  };
  return (
    <div ref={ref} role="tablist" aria-label={label} className={cn("inline-flex max-w-full flex-wrap gap-1 rounded-[12px] bg-[#E9E7E1] p-1", className)}>
      {tabs.map((t, i) => {
        const on = value === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={on}
            tabIndex={on || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-all",
              on ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.12),0_0_0_1px_rgba(16,24,40,.06)]" : "text-foreground/65 hover:bg-white/60 hover:text-foreground"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  on ? (t.alert && t.count ? "bg-[#B42318] text-white" : "bg-[#0E3B2C] text-white") : t.alert && t.count ? "bg-[#FDEDEB] text-[#B42318]" : "bg-black/[0.06] text-foreground/60"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
