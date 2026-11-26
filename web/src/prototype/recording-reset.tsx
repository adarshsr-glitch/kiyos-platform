"use client";

/**
 * Screen-recording demo: one button that puts the staged demo back to its start (same as
 * `make demo-retake`) and opens Arjun's WhatsApp sign-up. Hidden until the demo is staged.
 */

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type State = { staged: boolean; presenter: string | null };

export function RecordingReset({ className }: { className?: string }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/demo/recording`).then((r) => r.json()).then(setState).catch(() => setState(null));
  }, []);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}/demo/recording/reset`, { method: "POST" });
      const s: State = await r.json();
      if (!r.ok || !s.presenter) throw new Error("Couldn't reset the demo");
      window.location.href = s.presenter;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset the demo");
      setBusy(false);
    }
  }

  if (!state?.staged) return null;
  return (
    <section className={cn("flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4", className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Screen-recording demo</h2>
        <p className="text-[13px] text-muted-foreground">Resets everything to the start of the take and opens Arjun&apos;s WhatsApp sign-up.</p>
        {error && <p className="mt-1 text-[12.5px] text-rose-700">{error}</p>}
      </div>
      <button onClick={reset} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-medium text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        {busy ? "Resetting…" : "Reset demo"}
      </button>
    </section>
  );
}
