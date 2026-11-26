"use client";

/**
 * What the customer has sent the expert to deal with, as one stack of cards: their
 * questions first (oldest first; each has a reply time), then their documents (longest
 * waiting first). One card is open at a time; the strip above jumps to any of them, and
 * answering or deciding one brings up the next. The stack stays one card tall however
 * many are waiting, so the case picture below never gets pushed away.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, MessageCircleQuestion } from "lucide-react";
import type { Ticket } from "@/lib/types";
import type { DocReading } from "@/lib/residency";
import { Question } from "./question-queue";
import { Doc } from "./documents-to-review";
import { cn } from "@/lib/utils";

type Card = { key: string; kind: "question" | "document"; label: string; late: boolean; node: React.ReactNode };

export function ReviewStack({ tickets, readings, advisor, customer }: { tickets: Ticket[]; readings: DocReading[]; advisor: string; customer: string }) {
  const now = new Date().toISOString();
  const cards: Card[] = [
    ...tickets
      .filter((t) => t.status === "open")
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((t) => ({ key: `q-${t.id}`, kind: "question" as const, label: t.question, late: !!t.sla_due_at && t.sla_due_at < now, node: <Question t={t} advisor={advisor} /> })),
    ...readings
      .filter((r) => r.status !== "reviewed" && r.status !== "rejected")
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      .map((r) => ({ key: `d-${r.id}`, kind: "document" as const, label: r.extraction?.title ?? r.filename, late: false, node: <Doc r={r} advisor={advisor} holder={customer} /> })),
  ];
  const [at, setAt] = useState(0);
  const i = Math.min(at, Math.max(0, cards.length - 1));
  const q = cards.filter((c) => c.kind === "question").length;
  const d = cards.length - q;
  const first = customer.split(" ")[0];
  // Nothing waiting: "Up next" already says so; no empty box here.
  if (cards.length === 0) return null;

  return (
    <section id="q-h" aria-labelledby="h-review" className="scroll-mt-20">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-review" className="text-[17px] font-semibold text-foreground">
          To review
          <span className="ml-2 text-[13px] font-normal text-muted-foreground">
            {cards.length ? [q && `${q} question${q > 1 ? "s" : ""}`, d && `${d} document${d > 1 ? "s" : ""}`].filter(Boolean).join(" · ") + ` from ${first}` : `nothing from ${first} right now`}
          </span>
        </h2>
        {cards.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setAt(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-full border text-foreground hover:bg-muted disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-14 text-center text-[12.5px] tabular-nums text-muted-foreground">{i + 1} of {cards.length}</span>
            <button onClick={() => setAt(Math.min(cards.length - 1, i + 1))} disabled={i === cards.length - 1} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-full border text-foreground hover:bg-muted disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-4 text-[13.5px] text-muted-foreground">No questions or documents waiting on you.</p>
      ) : (
        <>
          {cards.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Waiting items">
              {cards.map((c, n) => {
                const Icon = c.kind === "question" ? MessageCircleQuestion : FileText;
                return (
                  <button
                    key={c.key}
                    role="tab"
                    aria-selected={n === i}
                    onClick={() => setAt(n)}
                    className={cn(
                      "flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                      n === i ? "border-foreground bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                    {c.late && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-label="overdue" />}
                  </button>
                );
              })}
            </div>
          )}
          {/* The open card, with the next ones peeking out behind it. */}
          <div className="relative">
            {cards.length > 2 && <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-xl border bg-card/60" />}
            {cards.length > 1 && <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-full rounded-xl border bg-card/80" />}
            <div className="relative rounded-xl border bg-card shadow-sm">
              <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-[12px] font-medium text-muted-foreground">
                {cards[i].kind === "question" ? <><MessageCircleQuestion className="h-3.5 w-3.5" /> {first}&apos;s question</> : <><FileText className="h-3.5 w-3.5" /> Document {first} sent</>}
              </p>
              <ul key={cards[i].key}>{cards[i].node}</ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
