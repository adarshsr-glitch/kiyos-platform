"use client";

/**
 * Who you're viewing the customer workspace as. Shows the current customer's name;
 * opening it lists the other customers, and choosing one loads their workspace with
 * their own plan and stage.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseListItem, Journey } from "@/lib/types";

const STAGE: Record<Journey, string> = {
  paid: "Paid plan",
  payment_pending: "Payment pending",
  free: "Free plan",
  signup: "Not signed in",
  intake: "Scan in progress",
};
const ORDER: Journey[] = ["paid", "payment_pending", "free", "signup"];
/** At most this many names per stage, so the list stays a short switcher, not a directory. */
const CAP: Partial<Record<Journey, number>> = { payment_pending: 2 };
const limit = (j: Journey) => CAP[j] ?? 4;

/** First `n` of a stage, always keeping the customer being viewed in the list. */
function shortlist(group: CaseListItem[], n: number, currentId: number) {
  const top = group.slice(0, n);
  if (top.some((c) => c.id === currentId)) return top;
  const current = group.find((c) => c.id === currentId);
  return current ? [...top.slice(0, n - 1), current] : top;
}

export function CustomerMenu({ current, customers, block }: { current: { id: number; name: string; journey: Journey }; customers: CaseListItem[]; /** Full-width, for the side rail */ block?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = (id: number) => {
    document.cookie = `kiyos-case=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    window.location.href = "/portal";
  };

  const initials = current.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className={cn("relative flex items-center", block && "w-full")}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn("flex items-center gap-2 border bg-card py-1 pl-1 pr-2.5 text-left hover:bg-muted", block ? "w-full rounded-lg" : "rounded-full")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">{initials}</span>
        <span className={cn("hidden min-w-0 leading-tight sm:block", block && "flex-1")}>
          <span className="block max-w-[160px] truncate text-[13px] font-semibold text-foreground">{current.name}</span>
          <span className="block text-[11px] text-muted-foreground">{STAGE[current.journey]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-xl border bg-card p-1.5 shadow-lg">
          {ORDER.map((stage) => {
            const all = customers.filter((c) => c.journey === stage).sort((a, b) => a.id - b.id);
            if (!all.length) return null;
            const group = shortlist(all, limit(stage), current.id);
            return (
              <div key={stage} className="py-1">
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{STAGE[stage]}</p>
                {group.map((c) => {
                  const active = c.id === current.id;
                  return (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={active}
                      onClick={() => (active ? setOpen(false) : choose(c.id))}
                      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-muted", active && "bg-primary/5")}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {c.client_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{c.client_name}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
