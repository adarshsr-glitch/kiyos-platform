"use client";

/**
 * Triage (Review 06, EX-06): the expert's work, list on the left and the item itself on the
 * right, rendered by kind, with its actions in a bar at the bottom. When an action succeeds
 * the next item opens. Keys: J / K move, and each action shows its own key.
 *
 * Nothing happens on its own: every send, accept, ask and sign-off is one press with the full
 * content on screen (Tax, Review 06). Every action calls an existing endpoint and writes a
 * real record.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTicket, reviewAssessment } from "@/lib/api";
import { askClarification, reviewDocument, setItemStatus } from "@/lib/residency";
import { hasCaptain } from "@/lib/captain";
import { mockFromReading } from "@/lib/mock-documents";
import { daysBetween, firstOf, fmt, plural, urgency, type Desk, type DeskRow, type Tier } from "@/lib/desk";
import { PdfBody } from "@/components/source/pdf-viewer";
import { Face } from "./face";
import { KIND, KindTile, TONE } from "./kinds";
import { Tabs } from "./tabs";

const DISPLAY = "[font-family:var(--font-display),var(--font-inter),sans-serif]";
const GROUPS: { tier: Tier; label: string }[] = [
  { tier: "late", label: "Overdue" },
  { tier: "waiting", label: "Waiting on you" },
  { tier: "soon", label: "Due this week" },
  { tier: "ready", label: "Ready to sign off" },
  { tier: "later", label: "Later" },
];
const TABS: { key: Tier | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "late", label: "Overdue" },
  { key: "waiting", label: "Waiting" },
  { key: "soon", label: "This week" },
  { key: "ready", label: "Sign-off" },
  { key: "later", label: "Later" },
];

export type TriageFilter = { tier?: string; day?: string; kind?: string; case?: string; prepared?: string; item?: string; start?: string; all?: string };

export function Triage({ desk, me, initial }: { desk: Desk; me: string | null; initial: TriageFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tier, setTier] = useState<Tier | "all">((TABS.find((t) => t.key === initial.tier)?.key as Tier) ?? "all");
  const [extra, setExtra] = useState<{ day?: string; kind?: string; case?: number; prepared?: boolean }>({
    day: initial.day,
    kind: initial.kind,
    case: initial.case ? Number(initial.case) : undefined,
    prepared: initial.prepared === "1",
  });
  const [done, setDone] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      desk.queue.filter(
        (r) =>
          (tier === "all" ? r.tier !== "later" || !!extra.day || !!extra.case : r.tier === tier) &&
          (!extra.day || r.due === extra.day) &&
          (!extra.kind || r.kind === extra.kind) &&
          (!extra.case || r.case_id === extra.case) &&
          (!extra.prepared || r.prepared)
      ),
    [desk.queue, tier, extra]
  );
  const firstOpen = (list: DeskRow[]) => list.find((r) => !done.has(r.key))?.key ?? null;
  const [selected, setSelected] = useState<string | null>(() =>
    initial.item && desk.queue.some((r) => r.key === initial.item) ? initial.item : initial.start || initial.prepared || initial.day || initial.kind || initial.tier ? firstOpen(rows) : null
  );
  const current = desk.queue.find((r) => r.key === selected) ?? null;

  // Keep the item in the URL so a refresh or a shared link lands on it.
  useEffect(() => {
    const p = new URLSearchParams({ view: "triage" });
    if (tier !== "all") p.set("tier", tier);
    if (extra.day) p.set("day", extra.day);
    if (extra.kind) p.set("kind", extra.kind);
    if (extra.case) p.set("case", String(extra.case));
    if (extra.prepared) p.set("prepared", "1");
    if (selected) p.set("item", selected);
    if (initial.all) p.set("all", "1");
    window.history.replaceState(null, "", `${pathname}${p.toString() ? `?${p}` : ""}`);
  }, [tier, extra, selected, pathname, initial.all]);

  const move = useCallback(
    (step: 1 | -1) => {
      const i = rows.findIndex((r) => r.key === selected);
      const next = rows[Math.min(rows.length - 1, Math.max(0, i + step))];
      if (next) setSelected(next.key);
    },
    [rows, selected]
  );

  /** After an action: mark it done here, move to the next open item, and reload the desk. */
  const finished = useCallback(
    (key: string) => {
      const i = rows.findIndex((r) => r.key === key);
      const after = rows.slice(i + 1).concat(rows.slice(0, i)).find((r) => !done.has(r.key) && r.key !== key);
      setDone((s) => new Set(s).add(key));
      setSelected(after?.key ?? null);
      router.refresh();
    },
    [rows, done, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j") {
        e.preventDefault();
        move(1);
      }
      if (e.key === "k") {
        e.preventDefault();
        move(-1);
      }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const count = (t: Tier | "all") => (t === "all" ? desk.queue.filter((r) => r.tier !== "later").length : desk.queue.filter((r) => r.tier === t).length);
  const extraLabel = extra.day
    ? fmt(extra.day, { weekday: "short", day: "numeric", month: "short" })
    : extra.prepared
      ? "Prepared by Kiyos"
      : extra.kind
        ? KIND[extra.kind as DeskRow["kind"]]?.label ?? extra.kind
        : extra.case
          ? desk.queue.find((r) => r.case_id === extra.case)?.customer
          : null;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)] md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[368px_minmax(0,1fr)]">
      {/* ───────── the list */}
      <section aria-label="Your work" className={cn("flex min-h-0 flex-col border-r bg-[#FBFAF7]", current && "hidden md:flex")}>
        <div className="px-[18px] pb-3 pt-5">
          <h1 className={cn("flex items-baseline gap-2 text-[22px] font-semibold tracking-[-0.01em]", DISPLAY)}>
            <span className="sr-only">Cases: </span>Triage
            <span className="font-sans text-[13.5px] font-normal text-muted-foreground">
              {plural(count("all"), "item")} · {plural(desk.customers, "customer")}
            </span>
          </h1>
          <Tabs
            className="mt-3.5"
            label="Show"
            value={extra.day ? null : tier}
            onChange={(k) => (setTier(k), setExtra({}))}
            tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: count(t.key), alert: t.key === "late" }))}
          />
          {extra.case && (
            <Link href={`/expert/cases/${extra.case}`} className="mt-2 flex items-center gap-1 text-[12.5px] font-medium text-[#0E3B2C] hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to {extraLabel}&apos;s case
            </Link>
          )}
          {extraLabel && (
            <button type="button" onClick={() => setExtra({})} className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#0E3B2C]/10 px-2.5 text-[12.5px] font-medium text-[#0E3B2C]">
              Only: {extraLabel} <X className="h-3.5 w-3.5" aria-label="Clear" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {rows.length === 0 && <p className="px-[18px] py-8 text-center text-[13px] text-muted-foreground">Nothing here. This view is clear.</p>}
          {GROUPS.map((g) => {
            const list = rows.filter((r) => r.tier === g.tier);
            if (!list.length) return null;
            return (
              <div key={g.tier} role="group" aria-label={g.label}>
                <p className={cn("flex justify-between px-[18px] pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.08em]", g.tier === "late" ? "text-[#B42318]" : "text-muted-foreground")}>
                  <span>{g.label}</span>
                  <span className="tabular-nums">{list.length}</span>
                </p>
                <ul>
                  {list.map((r) => {
                    const u = urgency(r, desk.today);
                    const on = r.key === selected;
                    const isDone = done.has(r.key);
                    return (
                      <li key={r.key} className="px-2.5">
                        <button
                          type="button"
                          aria-current={on || undefined}
                          onClick={() => setSelected(r.key)}
                          className={cn(
                            "relative grid w-full grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-[11px] rounded-xl px-2.5 py-2.5 text-left transition-colors",
                            on ? "bg-card shadow-[0_1px_3px_rgba(16,24,40,.08),0_0_0_1px_hsl(var(--border))]" : "hover:bg-black/[0.03]",
                            isDone && "opacity-45"
                          )}
                        >
                          {on && <span aria-hidden className="absolute -left-2.5 bottom-3 top-3 w-[3px] rounded-full bg-[#0E3B2C]" />}
                          {isDone ? (
                            <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[#DDF0E5] text-[#0F5132]">
                              <Check className="h-4 w-4" aria-label="Done" />
                            </span>
                          ) : (
                            <KindTile kind={r.kind} />
                          )}
                          <span className="min-w-0">
                            <span className={cn("block truncate text-[13px] font-semibold", isDone && "line-through")}>{r.customer}</span>
                            <span className="mt-px block truncate text-[12.5px] text-foreground/70">{rowLine(r)}</span>
                          </span>
                          <span className={cn("self-start whitespace-nowrap pt-0.5 text-[11.5px]", u.tone === "late" ? "font-semibold text-[#B42318]" : "text-muted-foreground")}>{short(r, desk.today)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="hidden gap-3.5 border-t px-[18px] py-3 text-[11.5px] text-muted-foreground md:flex">
          <span>
            <Kbd>J</Kbd> <Kbd>K</Kbd> move
          </span>
          <span>
            <Kbd>Esc</Kbd> close
          </span>
        </p>
      </section>

      {/* ───────── the item */}
      <section aria-label="Item" className={cn("min-h-0 flex-col bg-[#F5F4F0]", current ? "flex" : "hidden md:flex")}>
        {current ? (
          <Item key={current.key} r={current} desk={desk} actor={me ?? (hasCaptain(current.captain) ? current.captain : null)} isDone={done.has(current.key)} onDone={() => finished(current.key)} onBack={() => setSelected(null)} onNext={() => move(1)} />
        ) : (
          <div className="m-auto max-w-sm px-6 text-center">
            <p className={cn("text-[20px] font-semibold", DISPLAY)}>{rows.length ? "Pick something to work on" : "All clear"}</p>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">{rows.length ? "Or start at the top: the list is in the order to do it." : "Nothing in this view needs you."}</p>
            {rows.length > 0 && (
              <button type="button" onClick={() => setSelected(firstOpen(rows))} className="mt-4 inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#0E3B2C] px-4 text-[13.5px] font-semibold text-white">
                Start with {rows[0].customer} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function rowLine(r: DeskRow): string {
  if (r.kind === "documents") return `${r.detail.read ? `${plural(r.detail.documents.length, "document")} read` : `${plural(r.detail.documents.length, "document")} to check`} · ${r.detail.documents.map((d) => d.title?.split("·")[0].trim() ?? d.filename).filter((v, i, a) => a.indexOf(v) === i).join(", ")}`;
  if (r.kind === "question") return `${r.detail.context ? "Replied" : "Asked"} “${r.detail.context ? r.detail.question.replace(/^About “[^”]*”:\s*/, "") : r.detail.question}”${r.detail.grounded ? "" : " · no draft"}`;
  if (r.kind === "mismatch") return `${r.title}: told ${r.detail.stated}, document ${r.detail.found}`;
  return r.title;
}

function short(r: DeskRow, today: string): string {
  if (r.tier === "late" && r.due) return `${daysBetween(r.due, today)}d`;
  if (r.kind === "question" && r.detail.asked_at) {
    const day = new Date(r.detail.asked_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return day === today ? new Date(r.detail.asked_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : fmt(day);
  }
  if (r.due && (r.tier === "soon" || r.tier === "later")) return daysBetween(today, r.due) < 7 ? fmt(r.due, { weekday: "short" }) : fmt(r.due);
  if (r.since) return `${Math.max(0, daysBetween(r.since, today))}d`;
  return r.kind === "mismatch" ? "Found" : "";
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-[5px] border border-b-2 border-current/20 px-1 font-sans text-[10.5px] font-medium opacity-70">{children}</kbd>;
}

/* ───────────────────────────────────────────── one item */

type ItemProps = { r: DeskRow; desk: Desk; actor: string | null; isDone: boolean; onDone: () => void; onBack: () => void; onNext: () => void };

function Item(p: ItemProps) {
  const { r, desk } = p;
  const u = urgency(r, desk.today);
  const head = r.kind === "documents" ? `Check the ${plural(r.detail.documents.length, "document")} ${firstOf(r.customer)} sent` : r.kind === "question" ? `Reply to ${firstOf(r.customer)}` : r.kind === "mismatch" ? r.title : r.kind === "signoff" ? r.title : r.title;
  return (
    <>
      <header className="px-5 pt-5 sm:px-7">
        <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <button type="button" onClick={p.onBack} className="inline-flex items-center gap-1 md:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden /> List
          </button>
          <KindTile kind={r.kind} size={22} />
          {r.kind === "documents" && r.detail.read ? "Documents read by Kiyos" : KIND[r.kind].label}
          <span>·</span>
          <Link href={`/expert/cases/${r.case_id}`} className="inline-flex items-center gap-1 font-semibold text-[#0E3B2C] hover:underline">
            {r.customer}&apos;s case <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
        <div className="mt-3 flex items-start gap-3.5">
          <Face name={r.customer} size={28} className="mt-1 !h-9 !w-9" />
          <h2 className={cn("text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] sm:text-[24px]", DISPLAY)}>{head}</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", TONE[u.tone])}>
            {u.text}
            {r.tier === "late" && r.due ? ` · due ${fmt(r.due)}` : ""}
          </span>
          {r.kind === "documents" && r.detail.scans_clean && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#DDF0E5] px-2.5 text-[12px] font-medium text-[#0F5132]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Scans clean
            </span>
          )}
          {p.isDone && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#DDF0E5] px-2.5 text-[12px] font-medium text-[#0F5132]">
              <Check className="h-3.5 w-3.5" aria-hidden /> Done
            </span>
          )}
        </div>
      </header>
      {r.kind === "documents" ? (
        <Documents {...p} r={r} />
      ) : r.kind === "question" ? (
        <Question {...p} r={r} />
      ) : r.kind === "mismatch" ? (
        <Mismatch {...p} r={r} />
      ) : r.kind === "signoff" ? (
        <SignOff {...p} r={r} />
      ) : r.kind === "todo" ? (
        <Todo {...p} r={r} />
      ) : (
        <Plain {...p} />
      )}
    </>
  );
}

/** The bar at the bottom: the item's actions, then Next. */
function Bar({ children, left, onNext }: { children?: React.ReactNode; left?: React.ReactNode; onNext: () => void }) {
  return (
    <div className="sticky bottom-0 mx-5 mb-4 mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-[#12161C] px-3 py-2.5 text-white shadow-[0_14px_30px_-12px_rgba(18,22,28,.45)] sm:mx-7 sm:pl-[18px]">
      <span className="text-[12.5px] text-white/65">{left}</span>
      <span className="flex-1" />
      {children}
      <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold text-white/80 hover:text-white">
        Next <ArrowRight className="h-3.5 w-3.5" aria-hidden /> <Kbd>J</Kbd>
      </button>
    </div>
  );
}

function useRun() {
  const [busy, setBusy] = useState<string | null>(null);
  // A ref, not state: a second click or key press in the same instant must not send twice.
  const inFlight = useRef(false);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      after?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work. Nothing was changed.");
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };
  return { busy, run };
}

function Btn({ children, onClick, busy, kind = "ghost", hotkey, disabled }: { children: React.ReactNode; onClick: () => void; busy?: boolean; kind?: "primary" | "ghost"; hotkey?: string; disabled?: boolean }) {
  useHotkey(hotkey, onClick, !!disabled || !!busy);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-[13px] font-semibold disabled:opacity-50",
        kind === "primary" ? "bg-[#BFE3D1] text-[#0E3B2C] hover:bg-[#CFEBDD]" : "bg-white/10 text-white hover:bg-white/15"
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
      {hotkey && <Kbd>{hotkey.toUpperCase()}</Kbd>}
    </button>
  );
}

function useHotkey(key: string | undefined, fn: () => void, off: boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!key || off) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === key) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [key, off]);
}

const panel = "rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.07)]";
const body = "min-h-0 flex-1 overflow-y-auto px-5 pt-5 sm:px-7";

/* documents: the page and what Kiyos read, one document at a time */
function Documents({ r, actor, onDone, onNext }: ItemProps & { r: Extract<DeskRow, { kind: "documents" }> }) {
  const docs = r.detail.documents;
  const [at, setAt] = useState(0);
  const [handled, setHandled] = useState<Record<number, "accept" | "reject">>({});
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, run } = useRun();
  const doc = docs[at];
  const dupOf = docs.findIndex((d) => d.filename === doc.filename);
  const pending = docs.filter((d) => !handled[d.id]).length;

  const advance = (next: Record<number, "accept" | "reject">) => {
    const i = docs.findIndex((d, k) => k > at && !next[d.id]);
    const j = i >= 0 ? i : docs.findIndex((d) => !next[d.id]);
    if (j < 0) onDone();
    else setAt(j);
  };
  const decide = (decision: "accept" | "reject") => {
    if (!actor) return toast.error("Sign in to act on documents");
    if (decision === "reject" && !reason.trim()) return toast.error("Say what's wrong so the customer knows what to send");
    run(
      `${decision}${doc.id}`,
      () => reviewDocument(doc.id, decision, actor, decision === "reject" ? reason.trim() : undefined),
      decision === "accept" ? `Accepted ${doc.title ?? doc.filename}` : `Asked ${firstOf(r.customer)} for a new copy`,
      () => {
        const next = { ...handled, [doc.id]: decision };
        setHandled(next);
        setAsking(false);
        setReason("");
        advance(next);
      }
    );
  };

  return (
    <>
      <div role="tablist" aria-label="Documents" className="mx-5 mt-5 flex gap-1 overflow-x-auto border-b sm:mx-7">
        {docs.map((d, k) => (
          <button
            key={d.id}
            role="tab"
            type="button"
            aria-selected={k === at}
            onClick={() => (setAt(k), setAsking(false))}
            className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px]", k === at ? "border-[#0E3B2C] font-semibold text-foreground" : "border-transparent text-foreground/65 hover:text-foreground")}
          >
            <span className={cn("grid h-4 w-4 place-items-center rounded-full border-[1.5px]", handled[d.id] === "accept" ? "border-[#0F5132] bg-[#0F5132] text-white" : handled[d.id] === "reject" ? "border-[#B42318] bg-[#B42318] text-white" : "border-[#C9CCD2]")}>
              {handled[d.id] === "accept" ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-label="Accepted" /> : handled[d.id] === "reject" ? <X className="h-2.5 w-2.5" strokeWidth={3} aria-label="New copy asked" /> : null}
            </span>
            {d.title?.split("·")[0].trim() ?? d.filename}
            {docs.findIndex((x) => x.filename === d.filename) !== k && <span className="rounded-full bg-[#F1F0EC] px-2 py-0.5 text-[11px] font-medium text-foreground/70">same file again</span>}
          </button>
        ))}
      </div>
      <div className={cn(body, "grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]")}>
        <div className="min-w-0">
          {doc.fields.length ? (
            <PdfBody doc={mockFromReading({ title: doc.title ?? doc.filename, issuer: doc.issuer ?? "", period: doc.period ?? "", pages: doc.pages ?? 1, fields: doc.fields.map((f) => ({ label: f.label, value: String(f.value), page: f.page })) }, r.customer)} />
          ) : (
            <div className={cn(panel, "p-6 text-[13.5px] text-muted-foreground")}>
              <p className="font-medium text-foreground">{doc.filename}</p>
              <p className="mt-1">Received {doc.received ? fmt(doc.received, { day: "numeric", month: "long" }) : ""}. Kiyos hasn&apos;t read this one, so it can&apos;t be accepted from here: open it in the case to check it.</p>
              <Link href={`/expert/cases/${r.case_id}?tab=documents`} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[#0E3B2C] hover:underline">
                Open in the case <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3.5">
          <article className={cn(panel, "px-[18px] pb-2 pt-4")}>
            <h3 className={cn("mb-2 flex items-center gap-2 text-[15px] font-semibold", DISPLAY)}>
              <Sparkles className="h-4 w-4 text-[#1D6B5C]" aria-hidden /> What Kiyos read
            </h3>
            {doc.fields.length ? (
              <dl>
                {doc.fields.map((f) => (
                  <div key={f.label} className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center gap-3 border-t border-[#EFEDE8] py-2 text-[13px] first:border-0">
                    <dt className="text-foreground/70">{f.label}</dt>
                    <dd className="font-semibold tabular-nums">{String(f.value)}</dd>
                    <dd className="text-right text-[11px] text-muted-foreground">
                      {f.page ? `p.${f.page}` : ""}
                      {f.confidence != null ? ` · ${Math.round(f.confidence * 100)}%` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="pb-3 text-[13px] text-muted-foreground">Nothing read yet.</p>
            )}
          </article>
          <article className={cn(panel, "flex flex-col gap-2.5 px-[18px] py-3.5 text-[13px] text-foreground/75")}>
            {dupOf !== at && <Line warn>Same file name as {docs[dupOf].title?.split("·")[0].trim() ?? "another document"} in this set. It may be a second copy.</Line>}
            {doc.fields.length > 0 && <Line ok={!doc.mismatch}>{doc.mismatch ? "Conflicts with what they told you. Resolve it before accepting." : <><b className="text-foreground">Matches what {firstOf(r.customer)} told you.</b> No mismatch found.</>}</Line>}
            {doc.effects.map((e) => (
              <Line key={e} ok>
                Effect on the file: {e}
              </Line>
            ))}
            {doc.synthetic && <p className="text-[11.5px] text-muted-foreground">Prototype: sample document, reading simulated.</p>}
          </article>
          {asking && (
            <div className={cn(panel, "p-3.5")}>
              <label htmlFor="why-new" className="text-[12.5px] font-medium">
                What should {firstOf(r.customer)} send instead?
              </label>
              <textarea id="why-new" autoFocus rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The second page is missing" className="mt-1.5 w-full resize-y rounded-lg border bg-background px-2.5 py-2 text-[13.5px] outline-none focus:border-[#0E3B2C]" />
            </div>
          )}
        </div>
      </div>
      <Bar onNext={onNext} left={`Document ${at + 1} of ${docs.length}${pending < docs.length ? ` · ${docs.length - pending} done` : ""}`}>
        {asking ? (
          <>
            <Btn onClick={() => setAsking(false)}>Cancel</Btn>
            <Btn kind="primary" busy={busy === `reject${doc.id}`} onClick={() => decide("reject")}>
              Send request
            </Btn>
          </>
        ) : (
          <>
            <Btn hotkey="r" disabled={!!handled[doc.id]} onClick={() => setAsking(true)}>
              Ask for a new copy
            </Btn>
            <Btn kind="primary" hotkey="a" disabled={!!handled[doc.id] || !!doc.mismatch || !doc.fields.length} busy={busy === `accept${doc.id}`} onClick={() => decide("accept")}>
              <Check className="h-4 w-4" aria-hidden /> Accept
            </Btn>
          </>
        )}
      </Bar>
    </>
  );
}

function Line({ children, ok, warn }: { children: React.ReactNode; ok?: boolean; warn?: boolean }) {
  return (
    <p className="flex items-start gap-2.5 leading-relaxed">
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", warn ? "bg-[#FBF0DE] text-[#7A3F06]" : ok ? "bg-[#DDF0E5] text-[#0F5132]" : "bg-[#FDEDEB] text-[#B42318]")}>
        {warn ? "!" : ok ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : <X className="h-3 w-3" strokeWidth={3} aria-hidden />}
      </span>
      <span>{children}</span>
    </p>
  );
}

/* question: the conversation, Kiyos's draft (or why there isn't one), and the reply */
function Question({ r, actor, onDone, onNext }: ItemProps & { r: Extract<DeskRow, { kind: "question" }> }) {
  const [text, setText] = useState(r.detail.grounded ? r.detail.draft ?? "" : "");
  const { busy, run } = useRun();
  const answer = r.detail.context ? r.detail.question.replace(/^About “[^”]*”:\s*/, "") : r.detail.question;
  const send = () => {
    if (!actor) return toast.error("Sign in to reply");
    if (!text.trim()) return toast.error("Write the reply first");
    run("send", () => resolveTicket(r.detail.ticket_id, actor, text.trim()), `Reply sent to ${firstOf(r.customer)}`, onDone);
  };
  return (
    <>
      <div className={cn(body, "mx-auto w-full max-w-[760px]")}>
        <div className="flex flex-col gap-2.5">
          {r.detail.context && (
            <div className="max-w-[80%] self-start rounded-[16px] rounded-bl-[4px] bg-card px-4 py-3 text-[14px] shadow-[0_0_0_1px_rgba(16,24,40,.07)]">
              <span className="block text-[11.5px] text-muted-foreground">You asked</span>
              {r.detail.context}
            </div>
          )}
          <div className="max-w-[80%] self-end rounded-[16px] rounded-br-[4px] bg-[#E6EEFA] px-4 py-3 text-[15px] leading-snug">
            <span className="block text-[11.5px] text-muted-foreground">
              {firstOf(r.customer)}
              {r.detail.asked_at ? ` · ${new Date(r.detail.asked_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : ""}
            </span>
            <span className={answer.length < 30 ? "text-[18px] font-semibold" : ""}>“{answer}”</span>
          </div>
        </div>
        <p className={cn("mt-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed", r.detail.grounded ? "bg-[#F1F7F3]" : "bg-[#FFF8EC] shadow-[inset_0_0_0_1px_#F1DDBA]")}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {r.detail.grounded ? "Kiyos drafted the reply below. Check it before sending." : "Kiyos couldn't draft a grounded reply from the case record. Write this one yourself."}
            {r.detail.rules.length > 0 && (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {r.detail.rules.map((x) => (
                  <span key={x.id} className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11.5px]", x.status === "active" ? "bg-[#DDF0E5] text-[#0F5132]" : "bg-[#FBF0DE] text-[#7A3F06]")}>
                    {x.id} · {x.status.replace(/_/g, " ")}
                  </span>
                ))}
              </span>
            )}
          </span>
        </p>
        <label htmlFor="reply" className="mt-5 block text-[12.5px] font-medium">
          Your reply to {firstOf(r.customer)}
        </label>
        <textarea id="reply" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${firstOf(r.customer)}…`} className="mt-1.5 w-full resize-y rounded-xl border bg-card px-3.5 py-3 text-[14px] leading-relaxed outline-none focus:border-[#0E3B2C]" />
        <p className="mt-1.5 text-[12px] text-muted-foreground">Goes into {firstOf(r.customer)}&apos;s WhatsApp conversation as you, and closes the question.</p>
      </div>
      <Bar onNext={onNext} left={r.due ? `Reply due ${fmt(r.due)}` : undefined}>
        <Btn kind="primary" busy={busy === "send"} onClick={send}>
          Send reply
        </Btn>
      </Bar>
    </>
  );
}

/* mismatch: both numbers, the effect, and the question to the customer */
function Mismatch({ r, onDone, onNext }: ItemProps & { r: Extract<DeskRow, { kind: "mismatch" }> }) {
  const [text, setText] = useState(r.detail.ask);
  const { busy, run } = useRun();
  return (
    <>
      <div className={cn(body, "mx-auto w-full max-w-[760px]")}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className={cn(panel, "p-5")}>
            <span className="block text-[12px] text-muted-foreground">{firstOf(r.customer)} told you · {r.detail.stated_source}</span>
            <span className={cn("mt-1.5 block text-[40px] font-semibold leading-none tabular-nums", DISPLAY)}>{r.detail.stated}</span>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="rounded-2xl bg-[#EEE9FB] p-5 shadow-[inset_0_0_0_1px_#DCD3F6]">
            <span className="block text-[12px] text-muted-foreground">{r.detail.found_source}</span>
            <span className={cn("mt-1.5 block text-[40px] font-semibold leading-none tabular-nums text-[#5B3BB0]", DISPLAY)}>{r.detail.found}</span>
          </div>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-foreground/80">{r.detail.effect}</p>
        <label htmlFor="ask" className="mt-6 block text-[12.5px] font-medium">
          Ask {firstOf(r.customer)} which is right
        </label>
        <textarea id="ask" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5 w-full resize-y rounded-xl border bg-card px-3.5 py-3 text-[14px] leading-relaxed outline-none focus:border-[#0E3B2C]" />
        <p className="mt-1.5 text-[12px] text-muted-foreground">Sent on WhatsApp. Sign-off waits until {firstOf(r.customer)} answers.</p>
      </div>
      <Bar onNext={onNext}>
        <Link href={`/expert/cases/${r.case_id}`} className="inline-flex h-9 items-center rounded-[10px] bg-white/10 px-3.5 text-[13px] font-semibold hover:bg-white/15">
          Fix it in the case
        </Link>
        <Btn kind="primary" busy={busy === "ask"} onClick={() => (text.trim() ? run("ask", () => askClarification(r.case_id, text.trim()), `Asked ${firstOf(r.customer)} on WhatsApp`, onDone) : toast.error("Write the question first"))}>
          Ask {firstOf(r.customer)}
        </Btn>
      </Bar>
    </>
  );
}

/* sign-off: what is being signed, what it relies on, and the one button */
function SignOff({ r, actor, onDone, onNext }: ItemProps & { r: Extract<DeskRow, { kind: "signoff" }> }) {
  const { busy, run } = useRun();
  return (
    <>
      <div className={cn(body, "mx-auto w-full max-w-[760px]")}>
        <article className={cn(panel, "p-5")}>
          <p className="text-[12px] text-muted-foreground">Assessment · {r.detail.status === "draft" ? "draft" : "in review"}{r.since ? ` since ${fmt(r.since)}` : ""}</p>
          <p className={cn("mt-1.5 text-[18px] font-semibold leading-snug", DISPLAY)}>{r.title}</p>
          <div className="mt-4 flex flex-col gap-2.5 text-[13px] text-foreground/75">
            <Line ok>No open questions with {firstOf(r.customer)}</Line>
            <Line ok>Nothing blocks sign-off</Line>
            {r.detail.rules.map((x) => (
              <Line key={x.id} ok={x.status === "active"} warn={x.status !== "active"}>
                Relies on <span className="font-mono text-[12px]">{x.id}</span> ({x.status.replace(/_/g, " ")})
              </Line>
            ))}
          </div>
          <Link href={`/expert/cases/${r.case_id}#h-next`} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E3B2C] hover:underline">
            Read the full assessment in the case <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </article>
        <p className="mt-3 text-[12.5px] text-muted-foreground">Signing records your name and the time against this assessment. It can&apos;t be undone from here.</p>
      </div>
      <Bar onNext={onNext}>
        <Btn kind="primary" busy={busy === "sign"} onClick={() => (actor ? run("sign", () => reviewAssessment(r.detail.assessment_id, "sign_off", actor), "Assessment signed off", onDone) : toast.error("Sign in to sign off"))}>
          <Check className="h-4 w-4" aria-hidden /> Sign off
        </Btn>
      </Bar>
    </>
  );
}

function Todo({ r, actor, onDone, onNext }: ItemProps & { r: Extract<DeskRow, { kind: "todo" }> }) {
  const { busy, run } = useRun();
  return (
    <>
      <div className={cn(body, "mx-auto w-full max-w-[760px]")}>
        <article className={cn(panel, "p-5 text-[14px] leading-relaxed text-foreground/80")}>
          {r.detail.notes ? <p>{r.detail.notes}</p> : <p className="text-muted-foreground">No notes on this to-do.</p>}
          {r.detail.status === "blocked" && <p className="mt-2 font-medium text-[#7A3F06]">Marked blocked.</p>}
          <Link href={r.href} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E3B2C] hover:underline">
            Work on it in the case <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </article>
      </div>
      <Bar onNext={onNext} left={r.due ? `Due ${fmt(r.due, { day: "numeric", month: "short", year: "numeric" })}` : "No due date"}>
        <Btn kind="primary" hotkey="e" busy={busy === "done"} onClick={() => run("done", () => setItemStatus(r.detail.item_id, "done", actor ?? undefined), "Marked done", onDone)}>
          <Check className="h-4 w-4" aria-hidden /> Mark done
        </Btn>
      </Bar>
    </>
  );
}

function Plain({ r, onNext }: ItemProps) {
  return (
    <>
      <div className={cn(body, "mx-auto w-full max-w-[760px]")}>
        <article className={cn(panel, "p-5 text-[14px] leading-relaxed")}>
          {r.kind === "reply" ? r.detail.texts.map((t, k) => <p key={k}>“{t}”</p>) : <p>{r.title}</p>}
          <Link href={r.href} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E3B2C] hover:underline">
            Open in the case <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </article>
      </div>
      <Bar onNext={onNext} />
    </>
  );
}
