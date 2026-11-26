/**
 * The expert's Home (Review 06: EX-02 hero, EX-03 prepared work, EX-04 heatmap, EX-05 runway).
 * Server-rendered from one desk call. Every sentence and number links to the records behind
 * it; nothing is sent, accepted or signed from here: cards open the item in Triage.
 */

import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarDays, Check, MessageCircleQuestion, Sparkles, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, firstOf, fmt, plural, urgency, type BriefLine, type Desk, type DeskRow, type Stage } from "@/lib/desk";
import { Face } from "./face";
import { RemindButton } from "./remind-button";
import { KIND, KindTile, TONE } from "./kinds";

const DISPLAY = "[font-family:var(--font-display),var(--font-inter),sans-serif]";
const triage = (q: string, all: boolean) => `/expert/work?${q}${all ? "&all=1" : ""}`;

/* ───────────────────────────────────────────── hero */

function BriefSentence({ b, all }: { b: BriefLine; all: boolean }) {
  const link = "border-b border-white/35 hover:border-white";
  if (b.kind === "documents")
    return (
      <>
        <b className="font-semibold text-white">{b.customer}</b> sent{" "}
        <Link href={triage(`item=${b.row}`, all)} className={link}>
          {b.what}
        </Link>
        .{" "}
        {b.read > 0 ? (b.conflicts ? `Kiyos read ${b.read} details; ${plural(b.conflicts, "conflict")} with what they told you.` : `Kiyos read ${b.read} details; none conflict with what they told you.`) : "Kiyos hasn't read it yet."}
      </>
    );
  if (b.kind === "question") {
    const answer = b.context ? b.what.replace(/^About “[^”]*”:\s*/, "") : b.what;
    return (
      <>
        <b className="font-semibold text-white">{b.customer}</b> {b.context ? "replied" : "asked"}{" "}
        <Link href={triage(`kind=question&case=${b.case_id}`, all)} className={link}>
          “{answer.length > 70 ? `${answer.slice(0, 68)}…` : answer}”
        </Link>
        {b.context ? ` to your question “${b.context.replace(/\?$/, "")}?”` : ""}
        {b.count > 1 ? `, ${b.count === 2 ? "twice" : `${b.count} times`}` : ""}. {b.grounded ? "Kiyos drafted a reply for you to check." : "Kiyos couldn't draft a reply, so it's yours."}
      </>
    );
  }
  return (
    <>
      <b className="font-semibold text-white">{plural(b.count, "item")}</b> {b.count === 1 ? "is" : "are"} past their date. The oldest is{" "}
      <Link href={triage(`item=${b.row}`, all)} className={link}>
        {b.customer}&apos;s {b.what.charAt(0).toLowerCase() + b.what.slice(1)}
      </Link>
      {b.days ? `, ${plural(b.days, "day")}` : ""}.
    </>
  );
}

const BRIEF_ICON = { documents: KIND.documents.icon, question: MessageCircleQuestion, overdue: AlarmClock };

export function Hero({ d, name, greeting, all }: { d: Desk; name: string | null; greeting: string; all: boolean }) {
  const open = d.queue.filter((r) => r.tier !== "later");
  const late = open.filter((r) => r.tier === "late");
  const oldest = late.reduce<string | null>((m, r) => (r.due && (!m || r.due < m) ? r.due : m), null);
  const soon = open.filter((r) => r.tier === "soon").sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const questions = open.filter((r) => r.kind === "question").sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const qDue = questions[0]?.due ? daysBetween(d.today, questions[0].due) : null;
  const cleared = d.done_today.length;
  const stats = [
    { key: "late", label: "Overdue", icon: AlarmClock, value: late.length, note: oldest ? `oldest ${plural(daysBetween(oldest, d.today), "day")}` : "nothing overdue", href: triage("tier=late", all), hot: late.length > 0 },
    { key: "prep", label: "Prepared by Kiyos", icon: Sparkles, value: d.counts.prepared, note: "waiting for your decision", href: triage("prepared=1", all) },
    { key: "soon", label: "Due this week", icon: CalendarDays, value: soon.length, note: soon[0]?.due ? `next: ${fmt(soon[0].due, { weekday: "short", day: "numeric", month: "short" })}` : "nothing this week", href: triage("tier=soon", all) },
    { key: "q", label: "Questions waiting", icon: MessageCircleQuestion, value: questions.length, note: qDue === null ? "none open" : qDue < 0 ? "a reply is overdue" : qDue === 0 ? "reply due today" : qDue === 1 ? "reply due by tomorrow" : `next reply due ${fmt(questions[0].due!)}`, href: triage("kind=question", all) },
  ];

  return (
    <section aria-labelledby="h-hero" className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(900px_380px_at_92%_-20%,rgba(191,227,209,.30),transparent_60%),linear-gradient(135deg,#0D3829_0%,#14523C_58%,#10442F_100%)] px-6 py-7 text-white sm:px-9 sm:py-8">
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(90deg,transparent_40%,#000)]" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#BFE3D1]">{fmt(d.today, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 id="h-hero" className={cn("mt-2.5 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]", DISPLAY)}>
            {greeting}
            {name ? `, ${firstOf(name)}` : ""}.
          </h1>
          <p className="mb-2.5 mt-4 text-[13px] text-white/60">{d.brief.length ? "Since yesterday" : "Nothing new since yesterday."}</p>
          <ul className="flex flex-col gap-2.5">
            {d.brief.map((b, n) => {
              const Icon = BRIEF_ICON[b.kind];
              return (
                <li key={n} className="flex items-start gap-3 text-[14.5px] leading-[1.45] text-white/90">
                  <span aria-hidden className="mt-[-2px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-white/10">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <BriefSentence b={b} all={all} />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={triage("start=1", all)} className="inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-white px-[18px] text-[14px] font-semibold text-[#0E3B2C] transition-transform hover:-translate-y-px">
              Start triage <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#h-weeks" className="inline-flex h-[42px] items-center gap-2 rounded-[11px] border border-white/25 bg-white/[0.08] px-4 text-[14px] font-semibold text-white hover:bg-white/[0.14]">
              <CalendarDays className="h-4 w-4" aria-hidden /> Plan the next four weeks
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={cn(
                  "rounded-2xl bg-white/[0.07] px-4 pb-3.5 pt-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.13)] transition-colors hover:bg-white/[0.12]",
                  s.hot && "bg-[rgba(253,237,235,.13)] shadow-[inset_0_0_0_1px_rgba(255,180,170,.35)]"
                )}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  {s.hot ? <span className="h-[7px] w-[7px] rounded-full bg-[#FF8F80]" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
                  {s.label}
                </span>
                <span className={cn("mt-3 block text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums", DISPLAY, s.hot && "text-[#FFC9C2]")}>{s.value}</span>
                <span className="mt-1.5 block text-[12px] text-white/60">{s.note}</span>
              </Link>
            );
          })}
          <div className="col-span-2 flex items-center gap-3 px-1 pt-0.5 text-[12.5px] text-white/70">
            <span>Cleared today</span>
            <span aria-hidden className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.12]">
              <span className="block h-full rounded-full bg-[#BFE3D1]" style={{ width: `${Math.max(2, (cleared / Math.max(1, cleared + open.length)) * 100)}%` }} />
            </span>
            <span className="tabular-nums">
              {cleared} of {cleared + open.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────── prepared by Kiyos */

const money = (v: string) => /[₹$]/.test(v);

function CardBody({ r }: { r: DeskRow }) {
  if (r.kind === "documents") {
    const seen: string[] = [];
    const docs = r.detail.documents;
    return (
      <div className="overflow-hidden rounded-xl bg-[#FAF9F6] shadow-[inset_0_0_0_1px_#EFEDE8]">
        {docs.slice(0, 4).map((doc) => {
          const dup = seen.includes(doc.filename);
          seen.push(doc.filename);
          const figure = doc.fields.find((f) => money(String(f.value)));
          return (
            <div key={doc.id} className="flex items-center justify-between gap-3 border-t border-[#EFEDE8] px-3 py-2 text-[12.5px] first:border-0">
              <span className="truncate text-foreground/75">{[doc.title ?? doc.filename, doc.issuer].filter(Boolean).join(" · ")}</span>
              <b className={cn("shrink-0 tabular-nums", dup || !figure ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>
                {dup ? "same file again" : figure ? figure.value : doc.fields.length ? plural(doc.fields.length, "detail") : "not read"}
              </b>
            </div>
          );
        })}
        {docs.length > 4 && <div className="border-t border-[#EFEDE8] px-3 py-2 text-[12px] text-muted-foreground">and {docs.length - 4} more</div>}
      </div>
    );
  }
  if (r.kind === "mismatch")
    return (
      <>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded-xl bg-[#FAF9F6] p-3 shadow-[inset_0_0_0_1px_#EFEDE8]">
            <span className="block text-[11.5px] text-muted-foreground">{firstOf(r.customer)} told you</span>
            <span className={cn("mt-1 block text-[30px] font-semibold leading-none tabular-nums", DISPLAY)}>{r.detail.stated}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div className="rounded-xl bg-[#EEE9FB] p-3 shadow-[inset_0_0_0_1px_#DCD3F6]">
            <span className="block text-[11.5px] text-muted-foreground">The document shows</span>
            <span className={cn("mt-1 block text-[30px] font-semibold leading-none tabular-nums text-[#5B3BB0]", DISPLAY)}>{r.detail.found}</span>
          </div>
        </div>
        <p className="text-[12.5px] leading-relaxed text-foreground/75">{r.detail.effect}</p>
      </>
    );
  if (r.kind === "question") {
    const answer = r.detail.context ? r.detail.question.replace(/^About “[^”]*”:\s*/, "") : r.detail.question;
    return (
      <>
        <div className="flex flex-col gap-2">
          {r.detail.context && (
            <div className="max-w-[88%] self-start rounded-[14px] rounded-bl-[4px] bg-[#F1F0EC] px-3 py-2 text-[13px] leading-snug">
              <span className="block text-[11px] text-muted-foreground">You asked</span>
              {r.detail.context}
            </div>
          )}
          <div className={cn("max-w-[88%] self-end rounded-[14px] rounded-br-[4px] bg-[#E6EEFA] px-3 py-2 leading-snug", answer.length < 24 ? "text-[15px] font-semibold" : "text-[13px]")}>
            <span className="block text-[11px] font-normal text-muted-foreground">{firstOf(r.customer)}</span>“{answer.length > 140 ? `${answer.slice(0, 138)}…` : answer}”
          </div>
        </div>
        <p className={cn("flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12.5px] leading-snug", r.detail.grounded ? "bg-[#F1F7F3] text-foreground/80" : "bg-[#FFF8EC] text-foreground/80 shadow-[inset_0_0_0_1px_#F1DDBA]")}>
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {r.detail.grounded
            ? `Kiyos drafted a reply citing ${r.detail.rules.map((x) => `${x.id}${x.status !== "active" ? ` (${x.status.replace(/_/g, " ")})` : ""}`).join(", ")}.`
            : "Kiyos couldn't draft a grounded reply from the case record. This one is yours."}
        </p>
      </>
    );
  }
  if (r.kind === "signoff")
    return (
      <ul className="flex flex-col gap-2 text-[13px] text-foreground/75">
        {[
          r.detail.open_questions === 0 ? `No open questions with ${firstOf(r.customer)}` : null,
          r.detail.blockers.length === 0 ? "Nothing blocks sign-off" : null,
          r.detail.rules.length ? `Relies on ${r.detail.rules.map((x) => x.id).join(", ")}` : null,
        ]
          .filter(Boolean)
          .map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#DDF0E5] text-[#0F5132]">
                <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              </span>
              {t}
            </li>
          ))}
      </ul>
    );
  return null;
}

function cardTitle(r: DeskRow): string {
  if (r.kind === "documents") {
    const dates = r.detail.documents.map((x) => x.received).filter(Boolean) as string[];
    const one = dates.length && dates.every((x) => x === dates[0]);
    return `${plural(r.detail.documents.length, "document")} ${firstOf(r.customer)} sent${one ? ` on ${fmt(dates[0])}` : ""}`;
  }
  if (r.kind === "question") return "";
  return r.title;
}

function footNote(r: DeskRow): string {
  if (r.kind === "documents") return `${r.detail.mismatches ? plural(r.detail.mismatches, "mismatch", "mismatches") : "No mismatches"}${r.detail.scans_clean ? " · scans clean" : ""}`;
  if (r.kind === "mismatch") return `From ${r.detail.found_source}`;
  if (r.kind === "question") return r.detail.asked_at ? `Received ${new Date(r.detail.asked_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : "";
  if (r.kind === "signoff") return r.detail.status === "draft" ? "Draft" : "In review";
  return "";
}

const ACTION: Record<string, string> = { documents: "Review", mismatch: "Resolve", question: "Reply", signoff: "Review & sign off" };

export function PreparedDeck({ d, all }: { d: Desk; all: boolean }) {
  // One card per customer for questions: repeat messages fold into the one with context.
  const all_ = d.queue.filter((r) => r.prepared && r.tier !== "later");
  const extraMsgs = new Map<number, number>();
  const prepared = all_.filter((r) => {
    if (r.kind !== "question") return true;
    const same = all_.filter((x) => x.kind === "question" && x.case_id === r.case_id);
    const keep = same.find((x) => x.kind === "question" && x.detail.context) ?? same[same.length - 1];
    if (keep.key === r.key) extraMsgs.set(r.case_id, same.length - 1);
    return keep.key === r.key;
  });
  const shown = prepared.slice(0, 6);
  const rest = prepared.slice(6);
  return (
    <section aria-labelledby="h-prepared">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="h-prepared" className={cn("flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.01em]", DISPLAY)}>
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-[9px] bg-[#0E3B2C] text-[#BFE3D1]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Prepared by Kiyos
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Read, checked and drafted for you. Nothing is sent, accepted or signed until you decide.</p>
        </div>
        {prepared.length > 0 && (
          <Link href={triage("prepared=1", all)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E3B2C] hover:underline">
            Open all {prepared.length} in triage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {prepared.length === 0 ? (
        <p className="rounded-2xl bg-card px-5 py-6 text-[13.5px] text-muted-foreground shadow-[0_0_0_1px_rgba(16,24,40,.06)]">Nothing prepared is waiting. New documents, replies and drafts land here first.</p>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r, n) => {
            const u = urgency(r, d.today);
            const title = cardTitle(r);
            return (
              <li
                key={r.key}
                className={cn(
                  "flex min-h-[280px] min-w-0 flex-col gap-3.5 rounded-2xl bg-card p-[18px] pb-4 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(16,24,40,.25),0_0_0_1px_rgba(16,24,40,.1)]",
                  n === 0 && "shadow-[0_10px_30px_-12px_rgba(14,59,44,.28),0_0_0_1.5px_#0E3B2C]"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <KindTile kind={r.kind} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{r.kind === "documents" ? "Documents read" : KIND[r.kind].label}</span>
                  <span className={cn("ml-auto inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", TONE[u.tone])}>{u.text}</span>
                </span>
                <span className="flex items-center gap-2.5 text-[14px] font-semibold">
                  <Face name={r.customer} size={28} />
                  {r.customer}
                </span>
                {title && <p className={cn("-mt-1 text-[16px] font-semibold leading-[1.35]", DISPLAY)}>{title}</p>}
                <CardBody r={r} />
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-[#EFEDE8] pt-3">
                  <span className="truncate text-[12px] text-muted-foreground">{r.kind === "question" && extraMsgs.get(r.case_id) ? `${extraMsgs.get(r.case_id)! + 1} messages · latest ${footNote(r).replace("Received ", "")}` : footNote(r)}</span>
                  <Link
                    href={triage(`item=${r.key}`, all)}
                    className={cn(
                      "inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold",
                      n === 0 ? "bg-[#0E3B2C] text-white hover:bg-[#14523C]" : "border bg-card text-foreground hover:border-foreground/30"
                    )}
                  >
                    {ACTION[r.kind] ?? "Open"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {rest.length > 0 && (
        <Link href={triage("prepared=1", all)} className="mt-3.5 flex items-center justify-between gap-3 rounded-[14px] bg-[#EFEEE9] px-4 py-3 text-[13px] text-foreground/75 hover:bg-[#E9E8E2]">
          <span>
            <b className="font-semibold text-foreground">{rest.length} more prepared:</b>{" "}
            {rest
              .slice(0, 4)
              .map((r) => `${r.customer} (${r.kind === "signoff" ? "sign-off" : r.kind === "question" ? "reply" : r.kind})`)
              .join(" · ")}
          </span>
          <span className="shrink-0 font-semibold text-[#0E3B2C]">Show</span>
        </Link>
      )}
    </section>
  );
}

/* ───────────────────────────────────────────── the weeks ahead */

const shade = (n: number) => (n === 0 ? "bg-[#F2F1ED]" : n === 1 ? "bg-[#D6EBDF]" : n <= 3 ? "bg-[#A7D1BB]" : n <= 7 ? "bg-[#6BAE8C] text-white" : "bg-[#2F7D57] text-white");

export function Heatmap({ d, all }: { d: Desk; all: boolean }) {
  const weeks = [0, 1, 2, 3].map((w) => d.heatmap.days.slice(w * 7, w * 7 + 7));
  const late = d.queue.filter((r) => r.tier === "late");
  const nf = d.heatmap.next_filing;
  return (
    <article aria-labelledby="h-heat" className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] sm:px-[22px]">
      <div>
        <h3 id="h-heat" className={cn("text-[16px] font-semibold", DISPLAY)}>
          Next four weeks
        </h3>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">Your dated work per day, and what customers owe you. Pick a day to open it in triage.</p>
      </div>
      <div className="mt-[18px] overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-[5px]">
          <thead>
            <tr>
              <th className="w-[88px]" />
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
                <th key={x} scope="col" className="text-center text-[11px] font-medium text-muted-foreground">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w[0].date}>
                <th scope="row" className="whitespace-nowrap pr-1 text-left text-[11.5px] font-normal text-muted-foreground">
                  {fmt(w[0].date)} – {fmt(w[6].date, { day: "numeric" })}
                </th>
                {w.map((c) => {
                  const today = c.date === d.today;
                  const filing = d.heatmap.filings.find((f) => f.due === c.date);
                  const label = `${fmt(c.date, { weekday: "long", day: "numeric", month: "long" })}: ${c.yours ? `${c.yours} of yours due` : "nothing of yours due"}${c.owed ? `, customers owe you ${c.owed}` : ""}${filing ? `, ${filing.country === "IN" ? "India" : "US"} filing date` : ""}`;
                  const inner = (
                    <>
                      <span className="absolute left-[7px] top-1.5 text-[10.5px] opacity-70">{Number(c.date.slice(8))}</span>
                      {c.owed > 0 && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-[5px] bg-[#C9822B] px-[3px] text-center text-[10px] font-semibold leading-4 text-white">{c.owed}</span>}
                      {filing && <Stamp className="absolute bottom-1.5 left-[7px] h-3.5 w-3.5" aria-hidden />}
                      <span className={cn("absolute bottom-1.5 right-[7px] text-[17px] font-semibold leading-none tabular-nums", DISPLAY)}>{c.yours || ""}</span>
                    </>
                  );
                  const cls = cn(
                    "relative block h-[50px] rounded-[10px] text-foreground",
                    c.past ? "bg-[repeating-linear-gradient(135deg,#F2F1ED_0_5px,#ECEBE6_5px_10px)] opacity-70" : shade(c.yours),
                    today && "shadow-[0_0_0_2px_#0E3B2C]"
                  );
                  return (
                    <td key={c.date} className="p-0">
                      {c.yours > 0 && !c.past ? (
                        <Link href={triage(`day=${c.date}`, all)} aria-label={label} className={cn(cls, "transition-transform hover:-translate-y-px")}>
                          {inner}
                        </Link>
                      ) : (
                        <span role="img" aria-label={label} className={cls}>
                          {inner}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {late.length > 0 && (
        <Link href={triage("tier=late", all)} className="mt-3 flex items-center justify-between rounded-xl bg-[#FDEDEB] px-3.5 py-2.5 text-[13px] font-semibold text-[#B42318] hover:bg-[#FBE2DE]">
          <span className="flex items-center gap-2">
            <AlarmClock className="h-[15px] w-[15px]" aria-hidden /> Overdue, before today
          </span>
          <span className="tabular-nums">
            {plural(late.length, "item")} · {plural(new Set(late.map((r) => r.case_id)).size, "customer")}
          </span>
        </Link>
      )}
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          Fewer
          <span aria-hidden className="inline-flex gap-[3px]">
            {["#F2F1ED", "#D6EBDF", "#A7D1BB", "#6BAE8C", "#2F7D57"].map((c) => (
              <i key={c} className="block h-2.5 w-3.5 rounded-[3px]" style={{ background: c }} />
            ))}
          </span>
          more
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-4 min-w-4 rounded-[5px] bg-[#C9822B] px-[3px] text-center text-[10px] font-semibold leading-4 text-white">2</span> customers owe you
        </span>
        {nf && !d.heatmap.filings.length && (
          <span>
            Next filing date: {nf.country === "IN" ? "India" : "US"} · {fmt(nf.due, { day: "numeric", month: "short", year: "numeric" })}, in {nf.days} days
          </span>
        )}
      </p>
    </article>
  );
}

const STAGE: Record<Stage, { label: string; color: string }> = {
  documents: { label: "Owe documents", color: "bg-[#C9822B]" },
  review: { label: "In review", color: "bg-[#7C8595]" },
  ready: { label: "Ready to sign off", color: "bg-[#8FD1B0]" },
  signed: { label: "Signed off", color: "bg-[#0E3B2C]" },
};
const STAGES: Stage[] = ["documents", "review", "ready", "signed"];

export function Runway({ d }: { d: Desk }) {
  return (
    <article aria-labelledby="h-runway" className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)] sm:px-[22px]">
      <h3 id="h-runway" className={cn("text-[16px] font-semibold", DISPLAY)}>
        Filing runway
      </h3>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">Customers by stage for each coming filing date</p>
      {d.runway.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted-foreground">No filing dates are set yet.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-[18px]">
          {d.runway.map((f) => {
            const n = (s: Stage) => f.customers.filter((c) => c.stage === s).length;
            return (
              <li key={`${f.country}${f.due}`}>
                <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <b className="font-semibold">
                    {f.country === "IN" ? "India" : "US"} {f.customers.length === 1 ? "return" : "returns"} · {fmt(f.due, { day: "numeric", month: "short", year: "numeric" })}
                  </b>
                  <span className="whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
                    {f.days} days · {plural(f.customers.length, "customer")}
                  </span>
                </span>
                <span aria-hidden className="mt-2 flex h-3 gap-[2px] overflow-hidden rounded-[7px]">
                  {STAGES.filter((s) => n(s)).map((s) => (
                    <i key={s} className={cn("block h-full", STAGE[s].color)} style={{ width: `${(n(s) / f.customers.length) * 100}%` }} />
                  ))}
                </span>
                <span className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="flex">
                    {f.customers.slice(0, 5).map((c, k) => (
                      <Link key={c.case_id} href={`/expert/cases/${c.case_id}`} title={`${c.customer}: ${STAGE[c.stage].label.toLowerCase()}`} className={cn("rounded-full ring-2 ring-card", k > 0 && "-ml-2")}>
                        <Face name={c.customer} size={24} />
                      </Link>
                    ))}
                  </span>
                  {f.customers.length > 5 && <span>+{f.customers.length - 5}</span>}
                  <span>
                    {STAGES.filter((s) => n(s))
                      .map((s) => `${n(s)} ${STAGE[s].label.toLowerCase()}`)
                      .join(" · ")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {STAGES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <i aria-hidden className={cn("block h-2.5 w-2.5 rounded-[3px]", STAGE[s].color)} />
            {STAGE[s].label}
          </span>
        ))}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#EFEDE8] pt-4">
        {[
          { label: "Documents accepted", ...{ done: d.book.docs.accepted, total: d.book.docs.total } },
          { label: "Assessments signed off", ...d.book.signed },
        ].map((m) => (
          <div key={m.label}>
            <span className="flex items-baseline justify-between text-[12.5px]">
              <span>{m.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {m.done}/{m.total}
              </span>
            </span>
            <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-[#0E3B2C]" style={{ width: `${m.total ? (m.done / m.total) * 100 : 0}%` }} />
            </span>
          </div>
        ))}
      </div>
      {d.no_filing_date.length > 0 && <p className="mt-3 text-[12px] text-muted-foreground">No filing date yet: {d.no_filing_date.map(firstOf).join(", ")}</p>}
    </article>
  );
}

/* ───────────────────────────────────────────── what customers owe */

export function OwedCard({ d, me }: { d: Desk; me: string | null }) {
  const owed = d.owed;
  return (
    <article aria-labelledby="h-owed" className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,.05),0_0_0_1px_rgba(16,24,40,.06)]">
      <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4 sm:px-[22px]">
        <h3 id="h-owed" className={cn("text-[16px] font-semibold", DISPLAY)}>
          Customers owe you
        </h3>
        <span className="text-[12px] text-muted-foreground">{owed.length ? plural(owed.length, "item") : ""}</span>
      </div>
      {owed.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-muted-foreground sm:px-[22px]">Nothing outstanding from customers.</p>
      ) : (
        <ul className="pb-1.5">
          {owed.slice(0, 4).map((o) => (
            <li key={o.key} className="flex items-center gap-3 border-t border-[#EFEDE8] px-5 py-3 sm:px-[22px]">
              <Face name={o.customer} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{o.customer}</span>
                <span className="block truncate text-[12.5px] text-foreground/70">{o.title}</span>
              </span>
              {o.due && <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", o.late ? TONE.late : TONE.owed)}>{o.late ? `Overdue · ${fmt(o.due)}` : `Due ${fmt(o.due)}`}</span>}
              {o.item_id != null && <RemindButton itemId={o.item_id} by={me} customer={o.customer} />}
            </li>
          ))}
          {owed.length > 4 && <li className="border-t border-[#EFEDE8] px-5 py-2.5 text-[12.5px] text-muted-foreground sm:px-[22px]">and {owed.length - 4} more, on each case</li>}
        </ul>
      )}
    </article>
  );
}
