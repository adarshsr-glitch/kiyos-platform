"use client";

/**
 * The guide bar shown while a prototype journey is running. It sits above the real
 * product, follows where you are, and offers Restart, Exit and Finish. It doesn't
 * change what the product shows or does.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Download, LayoutGrid, MousePointerClick, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resetJourney } from "@/lib/residency";
import { journeyByKey, readJourney, stepPath, writeJourney, type JourneyState } from "./journeys";

export async function startJourney(key: string): Promise<string> {
  const j = journeyByKey(key)!;
  const { case_id } = await resetJourney(j.reset);
  if (j.side === "customer") document.cookie = `kiyos-case=${case_id}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
  writeJourney({ key, caseId: case_id, step: 0 });
  return stepPath(j.steps[0], case_id);
}

export function JourneyBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<JourneyState | null>(null);
  const [busy, setBusy] = useState(false);

  // Follow the journey as the real pages move: advance when you reach the next step's page.
  useEffect(() => {
    const s = readJourney();
    if (!s) return setState(null);
    const j = journeyByKey(s.key);
    if (!j || pathname === "/") return setState(pathname === "/" ? null : s);
    let step = s.step;
    const at = (i: number) => j.steps[i] && stepPath(j.steps[i], s.caseId) === pathname;
    if (!at(step)) {
      const ahead = j.steps.findIndex((_, i) => i > step && at(i));
      // A redirect can land on an earlier step's page (e.g. sign-in before the risk map).
      const behind = j.steps.map((_, i) => i).filter((i) => i < step && at(i)).pop();
      if (ahead !== -1) step = ahead;
      else if (behind !== undefined) step = behind;
    }
    const next = { ...s, step };
    writeJourney(next);
    setState(next);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("journey-on", !!state);
  }, [state]);

  if (!state) return null;
  const j = journeyByKey(state.key);
  if (!j) return null;
  const step = j.steps[state.step];
  const last = state.step === j.steps.length - 1;

  const restart = async () => {
    setBusy(true);
    try {
      const href = await startJourney(j.key);
      router.push(href);
      router.refresh();
      setState(readJourney());
    } finally {
      setBusy(false);
    }
  };
  const exit = () => {
    writeJourney(null);
    setState(null);
    router.push("/");
  };

  if (state.done) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-background p-7 text-center shadow-2xl">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-serif text-2xl font-medium">Journey complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">{j.outcome}</p>
          <ul className="mt-5 space-y-2 text-left text-sm">
            {j.recap.map((r) => (
              <li key={r} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {r}</li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={exit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to journeys</button>
            <button onClick={restart} disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Run it again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-[45] bg-[#14201b] text-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[12.5px]">
        <Link href="/" onClick={(e) => { e.preventDefault(); exit(); }} className="flex items-center gap-1.5 font-semibold text-white/85 hover:text-white">
          <LayoutGrid className="h-3.5 w-3.5" /> Journeys
        </Link>
        <span className="truncate text-white/90">{j.persona} · <span className="text-white/60">{j.role}</span></span>
        <span className="flex items-center gap-1.5 text-white/60">
          <span className="flex gap-1" aria-hidden>
            {j.steps.map((s, i) => (
              <i key={i} className={cn("h-1.5 w-4 rounded-full", i < state.step ? "bg-[#25d366]" : i === state.step ? "bg-white" : "bg-white/20")} />
            ))}
          </span>
          Step {state.step + 1} of {j.steps.length}: <span className="text-white">{step.title}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          {last && (
            <button onClick={() => { const d = { ...state, done: true }; writeJourney(d); setState(d); }} className="rounded-md bg-[#25d366] px-2.5 py-1 font-semibold text-[#0b2a1b]">
              Finish
            </button>
          )}
          <button onClick={restart} disabled={busy} className="flex items-center gap-1 rounded-md px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button onClick={exit} className="flex items-center gap-1 rounded-md px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white">
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-[12.5px] text-[#9ef0bf]">
          <MousePointerClick className="h-3.5 w-3.5 shrink-0" /> {step.hint}
          {step.extra && (
            <a href={step.extra.href} className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20" {...(step.extra.href.endsWith(".pdf") ? { download: true } : {})}>
              <Download className="h-3 w-3" /> {step.extra.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
