"use client";

/**
 * Agent quality: run the evaluation set, review what failed, apply a fix, run again, and keep
 * or roll back. Every run is kept with the agent's fixes as they were, so any earlier state can
 * be restored. Runs call the same agent customers talk to on WhatsApp; nothing is saved to a
 * customer's case (the run is rolled back).
 *
 * The loop: Run → Failures (each with what the agent said, Kiyos's read of why, and a fix when
 * one is known) → Apply fix and re-run everything (so a fix can't quietly break something
 * else) → Before / after → Keep, or Roll back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleStop, History, Loader2, Play, RotateCcw, Sparkles, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DISPLAY = "[font-family:var(--font-display),var(--font-inter),sans-serif]";
type Fix = { key: string; title: string; why: string; change: string; applied?: boolean };
type Row = {
  fix?: Fix | null; question: string; expected_kind: string; got_kind: string; expected: string; outcome: string; cited: string[]; expected_rule: string | null;
  grounded: boolean; passed: boolean; note: string; ms: number; reply: string; draft: string | null; index: number;
};
type Item = { q: string; intent: string; intent_title: string; variant: string; kind: string; expect: string; rule: string | null };
type Intent = { key: string; title: string; covers: string; cases: number };
type Run = { id: number; at: string; label: string | null; passed: number; total: number; failed: number[]; fixes: Record<string, boolean> };
type Compare = { before: Run; after: Run; fixKey: string };
const OUTCOME: Record<string, string> = { answer: "answer and cite the rule", personal: "treat as personal and offer a plan", handoff: "hand off, don't guess" };
const GOT: Record<string, string> = { answer: "answered", personal: "treated it as personal", handoff: "handed it off" };

async function call<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) throw new Error(`The server answered ${r.status}`);
  return r.json();
}
const why = (e: unknown) => (e instanceof Error ? e.message : "Couldn't reach the server");
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const card = "rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]";

export function EvalRunner() {
  const [items, setItems] = useState<Item[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [results, setResults] = useState<Record<number, Row>>({});
  const [running, setRunning] = useState<{ label: string; at: number; done: number; total: number; current: number | null; started: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [runs, setRuns] = useState<Run[]>([]);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openIntent, setOpenIntent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stop = useRef(false);

  const loadRuns = useCallback(() => call<Run[]>(`${BASE}/eval/runs`).then(setRuns).catch(() => {}), []);
  const loadFixes = useCallback(() => call<Fix[]>(`${BASE}/eval/fixes`).then(setFixes).catch(() => {}), []);
  useEffect(() => {
    Promise.all([call<Item[]>(`${BASE}/eval/set`), call<Intent[]>(`${BASE}/eval/intents`)])
      .then(([set, ints]) => (setItems(set), setIntents(ints)))
      .catch((e) => setLoadError(why(e)));
    loadRuns();
    loadFixes();
  }, [loadRuns, loadFixes]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  /** Run some or all questions, one at a time; returns the results, or null if stopped. */
  async function runSet(label: string, idx: number[]): Promise<Record<number, Row> | null> {
    stop.current = false;
    const out: Record<number, Row> = {};
    setRunning({ label, at: 0, done: 0, total: idx.length, current: idx[0] ?? null, started: Date.now() });
    setResults((r) => {
      const n = { ...r };
      idx.forEach((i) => delete n[i]);
      return n;
    });
    try {
      for (let k = 0; k < idx.length; k++) {
        if (stop.current) return null;
        const i = idx[k];
        setRunning((s) => s && { ...s, current: i, done: k });
        // At least a beat per question, so progress can be followed even when the agent is instant.
        const [res] = await Promise.all([call<{ rows: Row[] }>(`${BASE}/eval/run?i=${i}`, { method: "POST" }), new Promise((r) => setTimeout(r, 90))]);
        out[i] = res.rows[0];
        setResults((r) => ({ ...r, [i]: res.rows[0] }));
      }
      return out;
    } catch (e) {
      toast.error(`The run stopped: ${why(e)}`);
      return null;
    } finally {
      setRunning(null);
    }
  }

  async function save(label: string, all: Record<number, Row>): Promise<Run | null> {
    const failed = Object.values(all).filter((r) => !r.passed).map((r) => r.index);
    try {
      const run = await call<Run>(`${BASE}/eval/runs`, { method: "POST", body: JSON.stringify({ label, passed: items.length - failed.length, total: items.length, failed }) });
      await loadRuns();
      return run;
    } catch {
      return null;
    }
  }

  async function runAll() {
    setCompare(null);
    setSelected(null);
    const res = await runSet("Running all questions", items.map((_, i) => i));
    if (res) {
      const run = await save("Full run", res);
      const failed = Object.values(res).filter((r) => !r.passed);
      toast[failed.length ? "warning" : "success"](failed.length ? `${items.length - failed.length} of ${items.length} passed · ${failed.length} to review` : `All ${items.length} passed`);
      if (failed.length) setSelected(failed[0].index);
      if (run) setResults(res);
    }
  }

  async function runIntent(key: string) {
    setOpenIntent(key);
    await runSet(`Running “${intents.find((i) => i.key === key)?.title}”`, items.map((it, i) => (it.intent === key ? i : -1)).filter((i) => i >= 0));
  }

  /** Apply a fix, run everything again, and show before / after with Keep or Roll back. */
  async function applyAndRerun(fix: Fix) {
    const before = runs[0];
    if (!before) return toast.error("Run the full set once first, so there's something to compare against");
    setBusy(fix.key);
    try {
      await call(`${BASE}/eval/fixes/${fix.key}`, { method: "POST" });
      await loadFixes();
      const res = await runSet(`Re-running all ${items.length} with “${fix.title}”`, items.map((_, i) => i));
      if (!res) return;
      const after = await save(`After: ${fix.title}`, res);
      if (after) setCompare({ before, after, fixKey: fix.key });
      setSelected(null);
    } catch (e) {
      toast.error(`Couldn't apply the fix: ${why(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function rollback(to: Run, msg: string) {
    setBusy(`restore-${to.id}`);
    try {
      await call(`${BASE}/eval/runs/${to.id}/restore`, { method: "POST" });
      await loadFixes();
      setCompare(null);
      // Results on screen were from the agent before the rollback; run again to see it as it is now.
      setResults({});
      setSelected(null);
      toast.success(`${msg} Run again to see it as it is now.`);
    } catch (e) {
      toast.error(`Couldn't roll back: ${why(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const done = Object.values(results);
  const failures = done.filter((r) => !r.passed).sort((a, b) => a.index - b.index);
  const passed = done.length - failures.length;
  const last = runs[0];
  const prev = runs[1];
  const byIntent = useMemo(() => intents.map((it) => ({ ...it, idx: items.map((x, i) => (x.intent === it.key ? i : -1)).filter((i) => i >= 0) })), [intents, items]);

  if (loadError) return <p className={cn(card, "p-5 text-[13.5px] text-rose-700")}>Couldn&apos;t load the evaluation set: {loadError}</p>;

  return (
    <section className="flex flex-col gap-6">
      {/* ───────── run */}
      <div className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
          <div className="flex gap-8">
            <Stat label="Questions" value={items.length} note={`${intents.length} intents`} />
            <Stat label="Last run" value={last ? `${last.passed}/${last.total}` : "—"} note={last ? when(last.at) : "not run yet"} tone={last ? (last.passed === last.total ? "ok" : "bad") : undefined} />
            {last && prev && <Stat label="Change" value={`${last.passed - prev.passed >= 0 ? "+" : ""}${last.passed - prev.passed}`} note="vs the run before" tone={last.passed >= prev.passed ? "ok" : "bad"} />}
          </div>
          <span className="flex-1" />
          {running ? (
            <button onClick={() => (stop.current = true)} className="inline-flex h-11 items-center gap-2 rounded-[12px] border bg-card px-4 text-[14px] font-semibold hover:bg-muted">
              <CircleStop className="h-4 w-4 text-[#B42318]" aria-hidden /> Stop
            </button>
          ) : (
            <button onClick={runAll} disabled={!items.length || !!busy} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#0E3B2C] px-5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(14,59,44,.6)] hover:bg-[#14523C] disabled:opacity-60">
              <Play className="h-4 w-4" aria-hidden /> {done.length ? `Run all ${items.length} again` : `Run all ${items.length}`}
            </button>
          )}
        </div>
        {running && (
          <div className="border-t border-[#EFEDE8] bg-[#F7F9F7] px-5 py-4" aria-live="polite">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
              <span className="flex items-center gap-2 font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-[#0E3B2C]" aria-hidden /> {running.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {running.done} of {running.total} · {Math.max(0, (now - running.started) / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#E3E7E3]">
              <div className="h-full rounded-full bg-[#0E3B2C] transition-all duration-300" style={{ width: `${(running.done / Math.max(1, running.total)) * 100}%` }} />
            </div>
            {running.current !== null && items[running.current] && (
              <p className="mt-2.5 truncate text-[13px] text-foreground/80">
                <span className="text-muted-foreground">{items[running.current].intent_title} · </span>“{items[running.current].q}”
              </p>
            )}
          </div>
        )}
        {!running && done.length > 0 && (
          <div className="border-t border-[#EFEDE8] px-5 py-3.5">
            <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-muted">
              <span className="block h-full bg-[#0F5132]" style={{ width: `${(passed / items.length) * 100}%` }} />
              <span className="block h-full bg-[#B42318]" style={{ width: `${(failures.length / items.length) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {passed} passed · {failures.length} failed{done.length < items.length ? ` · ${items.length - done.length} not run` : ""}
            </p>
          </div>
        )}
      </div>

      {/* ───────── before / after a fix */}
      {compare && <CompareCard c={compare} items={items} busy={busy} onKeep={() => (setCompare(null), toast.success("Kept. The fix stays on."))} onRollback={() => rollback(compare.before, "Rolled back. The agent is as it was before the fix.")} />}

      {/* ───────── failures */}
      {failures.length > 0 && !running && (
        <section aria-labelledby="h-failures" className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="h-failures" className={cn("flex items-center gap-2 text-[16px] font-semibold", DISPLAY)}>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#B42318] px-1.5 text-[12px] font-semibold text-white">{failures.length}</span> Failed, to review
            </h2>
            <span className="text-[12.5px] text-muted-foreground">Open one to see what the agent said and the fix Kiyos suggests</span>
          </div>
          <ul className="pb-2">
            {failures.map((r) => {
              const it = items[r.index];
              const on = selected === r.index;
              return (
                <li key={r.index} className="border-t border-[#EFEDE8]">
                  <button type="button" aria-expanded={on} onClick={() => setSelected(on ? null : r.index)} className={cn("flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#FAF9F6]", on && "bg-[#FAF9F6]")}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FDEDEB] text-[#B42318]">
                      <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">“{it.q}”</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {it.intent_title} · {r.note}
                      </span>
                    </span>
                    {r.fix && (
                      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[#E6EEFA] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1F4E8C] sm:inline-flex">
                        <Wrench className="h-3 w-3" aria-hidden /> Fix ready
                      </span>
                    )}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", on && "rotate-180")} aria-hidden />
                  </button>
                  {on && <FailureDetail r={r} it={it} busy={busy} running={!!running} hasBaseline={!!last} onApply={applyAndRerun} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ───────── the set, by intent */}
      <section aria-labelledby="h-set">
        <h2 id="h-set" className={cn("mb-3 text-[16px] font-semibold", DISPLAY)}>
          The set, by intent
        </h2>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {byIntent.map((g) => {
            const gDone = g.idx.filter((i) => results[i]);
            const gPass = gDone.filter((i) => results[i].passed).length;
            const isOpen = openIntent === g.key;
            return (
              <li key={g.key} className={cn(card, "overflow-hidden")}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenIntent(isOpen ? null : g.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn("block text-[14.5px] font-semibold", DISPLAY)}>{g.title}</span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        {g.cases} {g.cases === 1 ? "way" : "ways"} of asking · {g.covers}
                      </span>
                    </span>
                  </button>
                  {gDone.length > 0 && (
                    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold tabular-nums", gPass === gDone.length ? "bg-[#DDF0E5] text-[#0F5132]" : "bg-[#FDEDEB] text-[#B42318]")}>
                      {gPass === gDone.length ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                      {gPass}/{gDone.length}
                    </span>
                  )}
                  <button onClick={() => runIntent(g.key)} disabled={!!running || !!busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[12.5px] font-semibold hover:border-[#0E3B2C]/40 disabled:opacity-50">
                    <Play className="h-3.5 w-3.5" aria-hidden /> Run these
                  </button>
                </div>
                {isOpen && (
                  <ul className="border-t border-[#EFEDE8]">
                    {g.idx.map((i) => {
                      const it = items[i];
                      const r = results[i];
                      const isRunning = running?.current === i;
                      return (
                        <li key={it.q} className={cn("flex items-start gap-3 border-b border-[#EFEDE8] px-4 py-2.5 last:border-0", isRunning && "bg-[#0E3B2C]/[0.04]")}>
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
                            {isRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#0E3B2C]" aria-label="Running" />
                            ) : r ? (
                              <span className={cn("grid h-5 w-5 place-items-center rounded-full", r.passed ? "bg-[#DDF0E5] text-[#0F5132]" : "bg-[#FDEDEB] text-[#B42318]")}>
                                {r.passed ? <Check className="h-3 w-3" strokeWidth={3} aria-label="Passed" /> : <X className="h-3 w-3" strokeWidth={3} aria-label="Failed" />}
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-[#D9D7D0]" aria-label="Not run" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13.5px]">
                              “{it.q}”
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", it.variant.startsWith("trap") ? "bg-[#FBF0DE] text-[#7A3F06]" : "bg-[#F1F0EC] text-foreground/65")}>{it.variant}</span>
                            </span>
                            <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                              Should {OUTCOME[it.expect]}
                              {it.expect === "answer" && it.rule ? ` (${it.rule})` : ""}
                              {r && !r.passed && <span className="text-[#B42318]"> · {r.note}</span>}
                            </span>
                          </span>
                          {r && !r.passed && (
                            <button type="button" onClick={() => (setSelected(i), document.getElementById("h-failures")?.scrollIntoView({ behavior: "smooth" }))} className="shrink-0 text-[12.5px] font-semibold text-[#0E3B2C] hover:underline">
                              Review
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ───────── history and rollback */}
      <section aria-labelledby="h-history" className={card}>
        <h2 id="h-history" className={cn("flex items-center gap-2 px-5 pb-2 pt-4 text-[16px] font-semibold", DISPLAY)}>
          <History className="h-4 w-4 text-muted-foreground" aria-hidden /> Run history
          <span className="font-sans text-[12.5px] font-normal text-muted-foreground">each run keeps the agent&apos;s fixes as they were, so you can go back</span>
        </h2>
        {runs.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="pb-1.5">
            {runs.slice(0, 10).map((r, n) => {
              const on = Object.entries(r.fixes).filter(([, v]) => v).map(([k]) => fixes.find((f) => f.key === k)?.title ?? k);
              const current = fixes.length > 0 && fixes.every((f) => !!f.applied === !!r.fixes[f.key]);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#EFEDE8] px-5 py-3">
                  <span className={cn("w-[64px] text-[15px] font-semibold tabular-nums", DISPLAY, r.passed === r.total ? "text-[#0F5132]" : "text-foreground")}>
                    {r.passed}/{r.total}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">
                      {r.label ?? "Run"} <span className="text-muted-foreground">· {when(r.at)}</span>
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">{on.length ? `Fixes on: ${on.join(", ")}` : "No fixes on"}</span>
                  </span>
                  {current ? (
                    <span className="rounded-full bg-[#DDF0E5] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0F5132]">{n === 0 ? "Current" : "Same as now"}</span>
                  ) : (
                    <button onClick={() => rollback(r, `Rolled back to the run from ${when(r.at)}`)} disabled={!!busy || !!running} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[12.5px] font-semibold hover:border-[#0E3B2C]/40 disabled:opacity-50">
                      {busy === `restore-${r.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />} Roll back to this
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string | number; note: string; tone?: "ok" | "bad" }) {
  return (
    <div>
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em]", DISPLAY, tone === "ok" && "text-[#0F5132]", tone === "bad" && "text-[#B42318]")}>{value}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{note}</p>
    </div>
  );
}

function FailureDetail({ r, it, busy, running, hasBaseline, onApply }: { r: Row; it: Item; busy: string | null; running: boolean; hasBaseline: boolean; onApply: (f: Fix) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-[#EFEDE8] bg-[#FAF9F6] px-5 py-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-muted-foreground">Should</dt>
          <dd>
            {it.kind === "personal" ? "Be read as personal" : "Be read as general"}, then {OUTCOME[it.expect]}
            {it.expect === "answer" && it.rule ? ` (${it.rule})` : ""}
          </dd>
          <dt className="text-muted-foreground">Did</dt>
          <dd className="text-[#B42318]">
            Read it as {r.got_kind === "personal" ? "personal" : "general"}, {GOT[r.outcome] ?? r.outcome}
            {r.cited.length ? `, citing ${r.cited.join(", ")}` : ""}
          </dd>
        </dl>
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">What the agent said</p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl bg-card p-3 text-[13px] leading-relaxed shadow-[0_0_0_1px_rgba(16,24,40,.07)]">{r.reply || "No reply text."}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-[#F1F7F3] p-3.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0E3B2C]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Kiyos&apos;s read of why
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{r.draft}</p>
        </div>
        {r.fix ? (
          <div className="rounded-xl bg-card p-3.5 shadow-[0_0_0_1px_rgba(16,24,40,.08)]">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Wrench className="h-3.5 w-3.5 text-[#0E3B2C]" aria-hidden /> Suggested fix: {r.fix.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{r.fix.why}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed">{r.fix.change}</p>
            <button
              onClick={() => onApply(r.fix!)}
              disabled={!!busy || running || !hasBaseline}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#0E3B2C] px-3.5 text-[13px] font-semibold text-white hover:bg-[#14523C] disabled:opacity-60"
            >
              {busy === r.fix.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Wrench className="h-3.5 w-3.5" aria-hidden />}
              Apply and re-run all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">Re-runs the whole set so a fix can&apos;t quietly break another answer. You can roll back afterwards.</p>
          </div>
        ) : (
          <p className="rounded-xl bg-card p-3.5 text-[12.5px] leading-relaxed text-muted-foreground shadow-[0_0_0_1px_rgba(16,24,40,.08)]">
            No automatic fix for this one. It needs a change to the agent or a rule written and validated by the tax team.
          </p>
        )}
      </div>
    </div>
  );
}

function CompareCard({ c, items, busy, onKeep, onRollback }: { c: Compare; items: Item[]; busy: string | null; onKeep: () => void; onRollback: () => void }) {
  const fixed = c.before.failed.filter((i) => !c.after.failed.includes(i));
  const broke = c.after.failed.filter((i) => !c.before.failed.includes(i));
  const better = c.after.passed - c.before.passed;
  return (
    <section aria-labelledby="h-compare" className={cn(card, "overflow-hidden ring-1", broke.length ? "ring-[#F3C2BC]" : "ring-[#BFE3D1]")}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <h2 id="h-compare" className={cn("text-[16px] font-semibold", DISPLAY)}>
          After the fix
        </h2>
        <span className="flex items-center gap-3 text-[13px]">
          <span className="tabular-nums text-muted-foreground">
            Before <b className="text-foreground">{c.before.passed}/{c.before.total}</b>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="tabular-nums text-muted-foreground">
            After <b className={better >= 0 ? "text-[#0F5132]" : "text-[#B42318]"}>{c.after.passed}/{c.after.total}</b>
          </span>
        </span>
        <span className="flex-1" />
        <button onClick={onRollback} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border bg-card px-3.5 text-[13px] font-semibold hover:border-[#B42318]/40 disabled:opacity-50">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Roll back
        </button>
        <button onClick={onKeep} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#0E3B2C] px-3.5 text-[13px] font-semibold text-white disabled:opacity-50">
          <Check className="h-3.5 w-3.5" aria-hidden /> Keep
        </button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-[#EFEDE8] px-5 py-3.5 text-[13px] md:grid-cols-2">
        <div>
          <p className="font-semibold text-[#0F5132]">Now passing · {fixed.length}</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-foreground/80">{fixed.length ? fixed.map((i) => <li key={i}>“{items[i]?.q}”</li>) : <li className="text-muted-foreground">None</li>}</ul>
        </div>
        <div>
          <p className={cn("font-semibold", broke.length ? "text-[#B42318]" : "text-muted-foreground")}>Newly failing · {broke.length}</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-foreground/80">{broke.length ? broke.map((i) => <li key={i}>“{items[i]?.q}”</li>) : <li className="text-muted-foreground">None. The fix didn&apos;t break anything else.</li>}</ul>
        </div>
      </div>
    </section>
  );
}
