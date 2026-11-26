"use client";

/**
 * The customer's questions that came to the expert, as a board (like a Jira board):
 * one column per state, one card per question with its key, reply time and owner.
 * Clicking a card opens it in a side panel, where the expert answers (Kiyos's draft is
 * pre-filled) or closes it. Columns come from the ticket's real state only.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { resolveTicket } from "@/lib/api";
import type { Ticket } from "@/lib/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/side-sheet";

const key = (t: Ticket) => `KY-${t.id}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

function sla(iso: string | null): { text: string; late: boolean } | null {
  if (!iso) return null;
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs}m` : abs < 48 * 60 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return mins >= 0 ? { text: `reply in ${text}`, late: false } : { text: `${text} overdue`, late: true };
}

type Column = { id: "open" | "answered" | "closed"; title: string; hint: string; tickets: Ticket[] };

export function TicketList({ tickets, advisor, customer }: { tickets: Ticket[]; advisor: string; customer?: string }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const answered = (t: Ticket) => t.status === "resolved" && !!t.resolution && t.resolution !== "Closed without reply";
  const columns: Column[] = [
    { id: "open", title: "Needs your answer", hint: "Kiyos has drafted an answer", tickets: tickets.filter((t) => t.status === "open").sort((a, b) => (a.sla_due_at ?? "").localeCompare(b.sla_due_at ?? "")) },
    { id: "answered", title: "Answered", hint: "Sent to the customer", tickets: tickets.filter((t) => t.status === "resolved" && answered(t)) },
    { id: "closed", title: "Closed without reply", hint: "No answer sent", tickets: tickets.filter((t) => t.status === "resolved" && !answered(t)) },
  ];
  const overdue = columns[0].tickets.filter((t) => sla(t.sla_due_at)?.late).length;
  const selected = tickets.find((t) => t.id === openId) ?? null;

  if (tickets.length === 0) {
    return (
      <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        No questions yet. When the customer asks something Kiyos shouldn&apos;t answer alone, it lands here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        <b className="font-semibold text-foreground">{columns[0].tickets.length}</b> waiting on you
        {overdue > 0 && <> · <b className="font-semibold text-rose-700">{overdue} overdue</b></>} · {tickets.length - columns[0].tickets.length} done
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((c) => (
          <section key={c.id} aria-label={c.title} className="flex min-h-[160px] flex-col rounded-xl bg-muted/50 p-2">
            <header className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                {c.title} <span className="ml-1 tabular-nums">{c.tickets.length}</span>
              </h3>
            </header>
            <ul className="space-y-2">
              {c.tickets.map((t) => (
                <li key={t.id}>
                  <Card t={t} column={c.id} onOpen={() => setOpenId(t.id)} />
                </li>
              ))}
            </ul>
            {c.tickets.length === 0 && <p className="px-1.5 py-3 text-[12px] text-muted-foreground">Nothing here.</p>}
          </section>
        ))}
      </div>
      <SideSheet
        open={!!selected}
        onClose={() => setOpenId(null)}
        wide
        eyebrow={selected ? `${key(selected)} · ${selected.status === "open" ? "Needs your answer" : answered(selected) ? "Answered" : "Closed"}` : undefined}
        title={selected?.question ?? ""}
      >
        {selected && <Detail key={selected.id} t={selected} customer={customer} advisor={advisor} answered={answered(selected)} onDone={() => setOpenId(null)} />}
      </SideSheet>
    </div>
  );
}

function Card({ t, column, onOpen }: { t: Ticket; column: Column["id"]; onOpen: () => void }) {
  const s = column === "open" ? sla(t.sla_due_at) : null;
  const who = column === "open" ? t.owner : t.resolved_by ?? t.owner;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg border bg-card p-3 text-left shadow-sm transition hover:border-foreground/25 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        s?.late && "border-l-[3px] border-l-rose-500"
      )}
    >
      <p className={cn("line-clamp-3 text-[13px] font-medium leading-snug text-foreground", column !== "open" && "text-foreground/75")}>{t.question}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {column === "open" && t.draft_answer && (
          <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-800">
            <Sparkles className="h-3 w-3" /> Draft ready
          </span>
        )}
        {s && (
          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium", s.late ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground")}>
            <Clock className="h-3 w-3" /> {s.text}
          </span>
        )}
        {column !== "open" && t.resolved_at && <span className="text-muted-foreground">{when(t.resolved_at)}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-sky-600 text-white"><MessageCircleQuestion className="h-3 w-3" /></span>
          {key(t)}
        </span>
        {who && (
          <span title={who} className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
            {initials(who)}
          </span>
        )}
      </div>
    </button>
  );
}

function Detail({ t, customer, advisor, answered, onDone }: { t: Ticket; customer?: string; advisor: string; answered: boolean; onDone: () => void }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(t.draft_answer ?? "");
  const [busy, setBusy] = useState(false);
  const s = sla(t.sla_due_at);

  async function resolve(reply: boolean) {
    setBusy(true);
    try {
      await resolveTicket(t.id, advisor, reply ? answer : null, reply ? undefined : "Closed without reply");
      toast.success(reply ? "Answer sent to the customer" : "Question closed");
      onDone();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  const facts: [string, React.ReactNode][] = [
    ["Asked by", t.client_name ?? customer ?? "Customer"],
    ["Asked", when(t.created_at)],
    ["Owner", t.owner ?? "Unassigned"],
    ...(t.status === "open" && s ? ([["Reply", <span key="s" className={cn(s.late && "font-medium text-rose-700")}>{s.text}</span>]] as [string, React.ReactNode][]) : []),
    ...(t.status === "resolved" ? ([["Done by", `${t.resolved_by ?? "—"} · ${when(t.resolved_at)}`]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 text-[12.5px]">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      {t.reason && (
        <div>
          <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Why it came to you</h4>
          <p className="text-[13px] text-foreground">{t.reason}</p>
        </div>
      )}
      {t.cited_rules && t.cited_rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.cited_rules.map((r) => (
            <span key={r} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{r}</span>
          ))}
        </div>
      )}

      {t.status === "open" ? (
        <div className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your answer {t.draft_answer && <span className="normal-case tracking-normal text-violet-700">· starts from Kiyos&apos;s draft; check it before sending</span>}
          </h4>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="min-h-[140px] w-full rounded-lg border p-3 text-[13.5px]"
            placeholder="The reviewed answer the customer will see"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button disabled={busy} onClick={() => resolve(false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> Close without reply
            </button>
            <button disabled={busy || !answer.trim()} onClick={() => resolve(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" /> Send answer
            </button>
          </div>
          <p className="text-[11.5px] text-muted-foreground">Sent to the customer&apos;s workspace and WhatsApp.</p>
        </div>
      ) : (
        <div>
          <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{answered ? "Answer sent" : "Closed"}</h4>
          <p className="rounded-lg border bg-card p-3 text-[13.5px] text-foreground">{t.resolution ?? "Closed without reply."}</p>
        </div>
      )}
    </div>
  );
}
