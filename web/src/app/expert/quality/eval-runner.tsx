"use client";

/**
 * Runs the evaluation set one question at a time against the live agent, so each check is
 * seen as it happens: queued → checking → passed or failed, then the overall result.
 * A failed check that a known fix explains shows the fix; applying it changes the agent
 * (stored, until undone) and checks that question again.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, Loader2, Play, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type Fix = { key: string; title: string; why: string; change: string; applied?: boolean };
type Row = { fix?: Fix | null; question: string; expected_kind: string; got_kind: string; expected: string; outcome: string; cited: string[]; expected_rule: string | null; grounded: boolean; passed: boolean; note: string; ms: number };
type Item = { q: string; kind: string; expect: string; rule: string | null };
type State = { item: Item; status: "queued" | "running" | "done"; row?: Row };
const OUTCOME: Record<string, string> = { answer: "Answer, citing an approved rule", personal: "Personal: offer a plan", handoff: "Hand off, don't guess" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** fetch that fails loudly: a non-2xx answer is an error, not an empty result. */
async function call<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`The server answered ${r.status}`);
  return r.json();
}
const why = (e: unknown) => (e instanceof Error ? e.message : "Couldn't reach the server");

export function EvalRunner() {
  const [rows, setRows] = useState<State[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const loadFixes = () => call<Fix[]>(`${BASE}/eval/fixes`).then(setFixes).catch(() => {});
  useEffect(() => {
    loadFixes();
  }, []);

  async function check(i: number, state: State[]) {
    state = state.map((s, j) => (j === i ? { ...s, status: "running", row: undefined } : s));
    setRows(state);
    const [res] = await Promise.all([call<{ mode: string; rows: Row[] }>(`${BASE}/eval/run?i=${i}`, { method: "POST" }), sleep(650)]);
    setMode(res.mode);
    state = state.map((s, j) => (j === i ? { ...s, status: "done", row: res.rows[0] } : s));
    setRows(state);
    return state;
  }

  // A check that never came back goes back to the queue, so nothing spins forever.
  const requeue = () => setRows((r) => r?.map((s) => (s.status === "running" ? { ...s, status: "queued" } : s)) ?? null);

  async function applyFix(i: number, fix: Fix) {
    if (!rows) return;
    setFixing(i);
    try {
      await call(`${BASE}/eval/fixes/${fix.key}`, { method: "POST" });
      await check(i, rows);
    } catch (e) {
      requeue();
      toast.error(`Couldn't apply the fix: ${why(e)}`);
    } finally {
      await loadFixes();
      setFixing(null);
    }
  }

  async function undo(key: string) {
    setUndoing(key);
    try {
      await call(`${BASE}/eval/fixes/${key}?on=false`, { method: "POST" });
    } catch (e) {
      toast.error(`Couldn't undo the fix: ${why(e)}`);
    } finally {
      await loadFixes();
      setUndoing(null);
    }
  }

  async function go() {
    setBusy(true);
    try {
      const set = await call<Item[]>(`${BASE}/eval/set`);
      let state: State[] = set.map((item) => ({ item, status: "queued" }));
      setRows(state);
      for (let i = 0; i < set.length; i++) {
        state = await check(i, state);
        await sleep(150);
      }
    } catch (e) {
      requeue();
      toast.error(`The evaluation stopped: ${why(e)}. Run it again to retry.`);
    } finally {
      setBusy(false);
    }
  }

  const done = rows?.filter((r) => r.status === "done") ?? [];
  const passed = done.filter((r) => r.row?.passed).length;
  const total = rows?.length ?? 0;
  const finished = !!rows && done.length === total && !busy;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={go} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[14px] font-medium text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {busy ? `Checking ${done.length + 1} of ${total}…` : rows ? "Run again" : "Run the evaluation"}
        </button>
        {rows && (
          <div className="min-w-[240px] flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all duration-500", passed === done.length ? "bg-emerald-600" : "bg-amber-600")} style={{ width: `${(done.length / (total || 1)) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {finished ? (
                <b className={passed === total ? "text-emerald-700" : "text-amber-800"}>
                  {passed === total ? `All ${total} passed` : `${passed} of ${total} passed · ${total - passed} need${total - passed === 1 ? "s" : ""} a fix`}
                </b>
              ) : (
                `${passed} passed so far`
              )}
              {mode ? ` · ${mode}` : ""}
            </p>
          </div>
        )}
      </div>

      {rows && (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((s, n) => (
            <li key={s.item.q} className={cn("flex items-start gap-3.5 px-4 py-3 transition-colors", s.status === "running" && "bg-primary/5", s.row && !s.row.passed && "bg-rose-50/60")}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {s.status === "queued" && <span className="text-[12px] tabular-nums text-muted-foreground">{n + 1}</span>}
                {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {s.status === "done" && (s.row?.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <CircleX className="h-5 w-5 text-rose-600" />)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[14px]", s.status === "queued" ? "text-muted-foreground" : "text-foreground")}>{s.item.q}</p>
                <p className="text-[12.5px] text-muted-foreground">
                  Should: {s.item.kind === "personal" ? "be treated as personal" : "be treated as general"} · {OUTCOME[s.item.expect]}
                  {s.item.expect === "answer" && s.item.rule ? ` (${s.item.rule})` : ""}
                </p>
                {s.row && (
                  <p className={cn("mt-0.5 text-[12.5px]", s.row.passed ? "text-emerald-700" : "text-rose-700")}>
                    {s.row.passed ? "Passed" : s.row.note}
                    {s.row.cited.length ? ` · cited ${s.row.cited.join(", ")}` : ""} · {s.row.grounded ? "grounded" : "not grounded"} · {s.row.ms} ms
                  </p>
                )}
                {s.row && !s.row.passed && s.row.fix && (
                  <div className="mt-2.5 rounded-lg border bg-card px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                      <Wrench className="h-3.5 w-3.5 text-primary" /> Suggested fix: {s.row.fix.title}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{s.row.fix.why}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">{s.row.fix.change}</p>
                    <button
                      onClick={() => applyFix(n, s.row!.fix!)}
                      disabled={busy || fixing !== null}
                      className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {fixing === n ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                      {fixing === n ? "Applying and checking…" : "Apply fix and check again"}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {fixes.some((f) => f.applied) && (
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">Fixes applied to the agent</p>
          <ul className="mt-1.5 space-y-1">
            {fixes.filter((f) => f.applied).map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="text-foreground">{f.title}</span>
                <button onClick={() => undo(f.key)} disabled={undoing !== null || busy} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50">{undoing === f.key ? "Undoing…" : "Undo"}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[12.5px] text-muted-foreground">
        Rules still pending validation by Kiyos&apos;s tax team are not approved for answers, so questions about them must be handed off.
      </p>
    </section>
  );
}
