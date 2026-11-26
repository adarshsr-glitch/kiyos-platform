"use client";

/**
 * What the customer's expert has put on the case, for Overview: a way to save as a figure card,
 * and what changed since the last visit as counts. Each opens the side panel with the detail
 * (one-panel rule). Asking about a way to save opens a message to edit and send; nothing is
 * sent on one click.
 */

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BriefItem, Briefing, Saving } from "@/lib/residency";
import { formatDate, formatMoneyCompact } from "@/lib/format";
import { SideSheet } from "@/components/side-sheet";
import { Cite } from "@/components/source/cite";
import { TaskSheet, type MessageTask } from "../task-sheet";
import { PanelRow, RowList } from "../blocks";

const day = (s: string) => formatDate(s, { day: "numeric", month: "short" });
const fullDay = (s: string) => formatDate(s, { day: "numeric", month: "short", year: "numeric" });
const todayIso = () => new Date().toISOString().slice(0, 10);

type Update = { key: string; at: string; title: string; body?: string | null; before?: string | null; names?: string[]; href?: string | null; link?: string };

/** The expert's actions as one plain sentence each; similar document steps read as one line. */
function updates(items: BriefItem[]): Update[] {
  const out: Update[] = [];
  const quote = (t: string) => `“${t}”`;
  for (const i of items) {
    const base = { at: i.at, body: i.detail, href: i.href };
    if (i.kind === "corrected") out.push({ ...base, key: `c-${i.at}`, title: `Corrected the answer to ${quote(i.title)}`, before: i.before });
    else if (i.kind === "answered") out.push({ ...base, key: `a-${i.at}`, title: `Answered ${quote(i.title)}` });
    else if (i.kind === "confirmed") out.push({ ...base, key: `f-${i.at}`, title: `Confirmed Kiyos's answer to ${quote(i.title)}` });
    else if (i.kind === "settled") out.push({ ...base, key: `s-${i.title}-${i.at}`, title: `Settled: ${i.title}` });
    else if (i.kind === "estimate") out.push({ ...base, key: `e-${i.title}-${i.at}`, title: `Updated your ${i.title}` });
    else if (i.kind === "signed_off") out.push({ ...base, key: `o-${i.title}-${i.at}`, title: `Signed off: ${i.title}` });
    else if (i.kind === "saving") out.push({ ...base, key: `w-${i.title}-${i.at}`, title: `Added a way to save: ${i.title}` });
    else if (i.kind === "document_returned") out.push({ ...base, key: `r-${i.title}-${i.at}`, title: `Sent back ${i.title}`, body: i.detail ?? "A new copy is needed." });
  }
  const group = (kind: BriefItem["kind"], verb: string) => {
    const list = items.filter((i) => i.kind === kind);
    if (!list.length) return;
    const names = list.map((i) => i.title);
    out.push({
      key: kind,
      at: list[0].at,
      title: list.length === 1 ? `${verb} ${names[0]}` : `${verb} ${list.length} documents`,
      names: list.length > 1 ? names : undefined,
      body: list.length === 1 ? list[0].detail : null,
      href: "/portal/documents",
      link: "Your documents",
    });
  };
  group("document_accepted", "Accepted");
  group("request", "Asked for");
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** A way to save, in full. Asking about it opens a message to edit and send. */
function SavingSheet({ saving, expert, onClose, onAsk }: { saving: Saving | null; expert: string; onClose: () => void; onAsk: (t: MessageTask) => void }) {
  const first = expert.split(" ")[0];
  return (
    <SideSheet open={!!saving} onClose={onClose} eyebrow={`Way to save · from ${first}`} title={saving?.title ?? ""}>
      {saving && (
        <div className="space-y-4 text-[14px]">
          {saving.amount != null && saving.currency && (
            <p className="flex items-baseline gap-2">
              <span className="text-muted-foreground">Could save about</span>
              <span className="font-serif text-[24px] leading-none tabular-nums text-foreground">
                <Cite node={{ title: saving.title, value: formatMoneyCompact(saving.amount, saving.currency), evidence: { kind: "expert", by: saving.author, at: saving.date } }}>
                  {formatMoneyCompact(saving.amount, saving.currency)}
                </Cite>
              </span>
            </p>
          )}
          {saving.deadline && (saving.deadline < todayIso() ? <p className="text-muted-foreground">The deadline was {fullDay(saving.deadline)}</p> : <p className="text-amber-800">Act by {fullDay(saving.deadline)}</p>)}
          {saving.why && <p className="leading-relaxed text-foreground">{saving.why}</p>}
          <dl className="space-y-2 rounded-lg bg-muted/50 px-3.5 py-3 text-[13px]">
            <div>
              <dt className="text-muted-foreground">What it is</dt>
              <dd className="text-foreground">{saving.what}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Where it comes from in law</dt>
              <dd className="text-foreground">{saving.law}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Added by</dt>
              <dd className="text-foreground">
                {saving.author}, {fullDay(saving.date)}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => {
              const s = saving;
              onClose();
              onAsk({
                kind: "message",
                key: `ask-saving-${s.id}`,
                send: "ask",
                title: s.title,
                prefill: `About "${s.title}": what would I need to do, and is it still right for me?`,
              });
            }}
            className="flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-semibold text-foreground hover:bg-muted"
          >
            Ask {first} about this
          </button>
        </div>
      )}
    </SideSheet>
  );
}

/** One update from the expert, in full. */
function UpdateSheet({ update, expert, onClose }: { update: Update | null; expert: string; onClose: () => void }) {
  return (
    <SideSheet open={!!update} onClose={onClose} eyebrow={update ? `From ${expert.split(" ")[0]} · ${fullDay(update.at)}` : undefined} title={update?.title ?? ""}>
      {update && (
        <div className="space-y-4 text-[14px]">
          {update.body && <p className="leading-relaxed text-foreground">{update.body}</p>}
          {update.names && (
            <ul className="divide-y rounded-lg border text-[13.5px]">
              {update.names.map((n) => (
                <li key={n} className="px-3.5 py-2 text-foreground">
                  {n}
                </li>
              ))}
            </ul>
          )}
          {update.before && (
            <div className="rounded-lg bg-muted/50 px-3.5 py-3 text-[13px]">
              <p className="text-muted-foreground">What Kiyos had said before</p>
              <p className="mt-1 text-foreground">{update.before}</p>
            </div>
          )}
          {!update.body && !update.names && !update.before && <p className="text-muted-foreground">Nothing more to add on this one.</p>}
          {update.href && (
            <Link href={update.href} className="inline-flex text-[14px] font-medium text-primary hover:underline">
              {update.link ?? "See it"} →
            </Link>
          )}
        </div>
      )}
    </SideSheet>
  );
}

/**
 * Overview: a way to save as a figure card. The expert's figure is the headline, the title is
 * the one line of context, and the deadline sits in the footer. The card opens the full detail.
 */
export function WayToSave({ savings, expert, caseId, customer }: { savings: Saving[]; expert: string; caseId: number; customer: string }) {
  const [open, setOpen] = useState<Saving | null>(null);
  const [ask, setAsk] = useState<MessageTask | null>(null);
  const first = expert.split(" ")[0];
  if (savings.length === 0) return null;
  // Current ways to save first, soonest deadline first; ones whose deadline has passed go last.
  const t0 = todayIso();
  const passed = (s: Saving) => !!s.deadline && s.deadline < t0;
  const ordered = [...savings].sort((a, b) => Number(passed(a)) - Number(passed(b)) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  const [top, ...rest] = ordered;
  return (
    <section aria-labelledby="h-save" className="rounded-[14px] border bg-card px-5 pt-[18px]">
      <h2 id="h-save" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        A way to save, from {first}
      </h2>
      {top.amount != null && top.currency ? (
        <p className="mt-2.5 flex items-baseline gap-2">
          <span className="font-serif text-[32px] leading-none text-foreground">
            <Cite node={{ title: top.title, value: formatMoneyCompact(top.amount, top.currency), evidence: { kind: "expert", by: top.author, at: top.date } }}>
              {formatMoneyCompact(top.amount, top.currency)}
            </Cite>
          </span>
          <span className="text-[13px] text-muted-foreground">could be saved</span>
        </p>
      ) : null}
      <p className="mt-2 text-[13.5px] text-foreground">{top.title}</p>
      <div className="mt-3.5 flex items-center justify-between gap-2.5 border-t py-2.5">
        {top.deadline ? <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[12.5px] font-medium text-foreground">{passed(top) ? `Deadline passed ${fullDay(top.deadline)}` : `Act by ${fullDay(top.deadline)}`}</span> : <span />}
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(top)} className="text-[13px] font-medium text-primary hover:underline">
          See why →
        </button>
      </div>
      {rest.map((s) => (
        <button key={s.id} type="button" aria-haspopup="dialog" onClick={() => setOpen(s)} className="flex w-full items-center justify-between gap-3 border-t py-2.5 text-left text-[13px] hover:text-primary">
          <span className="min-w-0 truncate">{s.title}</span>
          {s.amount != null && s.currency && <span className="shrink-0 font-serif text-muted-foreground">{formatMoneyCompact(s.amount, s.currency)}</span>}
        </button>
      ))}
      <SavingSheet saving={open} expert={expert} onClose={() => setOpen(null)} onAsk={setAsk} />
      <TaskSheet task={ask} caseId={caseId} by={customer} lead={expert} onClose={() => setAsk(null)} />
    </section>
  );
}

/**
 * Overview: what the expert did since the last visit, as counts. The card opens the list of
 * updates in the side panel, each one in full.
 */
export function SinceLastVisit({ briefing, expert }: { briefing: Briefing | null; expert: string }) {
  const [list, setList] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  if (!briefing) return null;
  const fresh = briefing.items.length > 0;
  const items = fresh ? briefing.items : briefing.recent;
  if (items.length === 0) return null;
  const count = (kinds: BriefItem["kind"][]) => items.filter((i) => kinds.includes(i.kind)).length;
  const tally = (n: number, one: string, many: string, act = false) => ({ n, label: n === 1 ? one : many, act });
  const tallies = [
    tally(count(["document_accepted"]), "document accepted", "documents accepted"),
    tally(count(["request", "document_returned"]), "new ask", "new asks", true),
    tally(count(["answered", "confirmed", "corrected"]), "answer", "answers"),
    tally(count(["signed_off", "settled", "estimate", "saving"]), "other update", "other updates"),
  ]
    .filter((t) => t.n > 0);
  const all = updates(items);
  return (
    <section aria-labelledby="h-since" className="rounded-[14px] border bg-card">
      <h2 id="h-since" className="px-5 pt-[18px] text-[12.5px] font-medium text-muted-foreground">
        {fresh ? `Since your last visit, ${day(briefing.since)}` : `Latest from ${expert.split(" ")[0]}`}
      </h2>
      <button type="button" aria-haspopup="dialog" onClick={() => setList(true)} className="grid w-full grid-cols-3 gap-x-2 gap-y-3 rounded-b-[14px] px-5 pb-[18px] pt-2.5 text-left hover:bg-muted/30">
        {tallies.map((t) => (
          <span key={t.label} className="block">
            <span className={cn("block font-serif text-[24px] leading-tight", t.act ? "text-[#7A3F06]" : "text-foreground")}>{t.n}</span>
            <span className="block text-[12px] text-muted-foreground">{t.label}</span>
          </span>
        ))}
        <span className="sr-only">See every update</span>
      </button>
      <SideSheet open={list} onClose={() => setList(false)} eyebrow={`From ${expert.split(" ")[0]}`} title={fresh ? "Since your last visit" : "Latest updates"}>
        <RowList>
          {all.map((u) => (
            <PanelRow key={u.key} onOpen={() => { setList(false); setUpdate(u); }} label={u.title} meta={day(u.at)} />
          ))}
        </RowList>
      </SideSheet>
      <UpdateSheet update={update} expert={expert} onClose={() => setUpdate(null)} />
    </section>
  );
}

