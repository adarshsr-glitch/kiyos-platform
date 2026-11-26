"use client";

/**
 * Ask Kiyos: the WhatsApp agent, introduced by what it actually does for this customer.
 * Every capability listed is one the product performs today (services/converse.py,
 * document reading on upload, proposed profile changes, expert routing, the sensitive-
 * data guard). The suggested questions come from the customer's own record; choosing
 * one opens the chat with the question typed in, ready to send.
 */

import { useState } from "react";
import { SideSheet } from "@/components/side-sheet";
import { ArrowUpRight, FileSearch, GitPullRequestArrow, Lock, MessageCircle, Scale, Sparkles } from "lucide-react";
import type { CaseDetail } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { whatsappHref, whatsappTarget } from "@/lib/whatsapp";

const askHref = (text: string) =>
  whatsappHref.startsWith("http") ? `${whatsappHref}?text=${encodeURIComponent(text)}` : `${whatsappHref}?ask=${encodeURIComponent(text)}`;

export function AskKiyos({ caseData }: { caseData: CaseDetail }) {
  const [open, setOpen] = useState(false);
  const lead = caseData.case_captain;

  const cs = caseData.country_status ?? {};
  const next = (["IN", "US"] as const).map((c) => cs[c]).filter((x) => x?.due).sort((a, b) => a!.due.localeCompare(b!.due))[0];
  const prompts = [
    next ? `When is my ${next.filing} due, and what's left before it?` : "When are my returns due?",
    "What do you still need from me?",
    "What's my residency status this year, and why?",
    "Summarise my tax position in India and the US.",
  ];

  const can = [
    { icon: Sparkles, title: "Answers from your record", text: "Deadlines, what's outstanding, your residency status, in seconds, any time." },
    { icon: FileSearch, title: "Reads your documents", text: "When you upload one, it pulls the figures, messages you what it found and flags anything that doesn't match what you told us." },
    { icon: GitPullRequestArrow, title: "Notes changes you mention", text: "Say “I landed on 12 July” and it becomes a change for you to confirm here. Nothing updates on its own." },
    { icon: Scale, title: "Shows its working, knows its limits", text: `Cites the rule it used. Anything that needs judgement goes to ${lead} first, usually answered within a business day.` },
  ];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-[#25d366]" />
        </span>
        <span className="hidden sm:inline">Ask Kiyos</span>
        <MessageCircle className="h-4 w-4 sm:hidden" aria-label="Ask Kiyos" />
      </button>

      {/* A side panel, like every other detail in the workspace: nothing floats over the page. */}
      <SideSheet open={open} onClose={() => setOpen(false)} eyebrow="Works on your case" title="Kiyos on WhatsApp">
        <div className="-mx-5 -mt-1 sm:-mx-6">
          <div className="border-b px-5 pb-4 sm:px-6">
            <p className="text-[12.5px] text-muted-foreground">
              Knows your record: {caseData.topics.length} tax questions, {caseData.documents.length} documents
              {caseData.activated_at ? `, since ${formatDate(caseData.activated_at, { month: "short", year: "numeric" })}` : ""}.
            </p>
          </div>

          <ul className="space-y-3 px-5 py-4 sm:px-6">
            {can.map((c) => (
              <li key={c.title} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/10">
                  <c.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground">{c.title}</span>
                  <span className="block text-[12.5px] leading-snug text-muted-foreground">{c.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t bg-muted/30 px-5 py-4 sm:px-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Try asking</p>
            <ul className="space-y-1.5">
              {prompts.map((p) => (
                <li key={p}>
                  <a
                    href={askHref(p)}
                    target={whatsappTarget}
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-[13px] text-foreground hover:border-primary/40"
                  >
                    {p}
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Lock className="h-3 w-3" /> It never asks for your PAN, SSN or passwords in chat.
            </p>
          </div>

          <a
            href={whatsappHref}
            target={whatsappTarget}
            rel="noreferrer"
            className="mx-5 mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:mx-6"
          >
            <MessageCircle className="h-4 w-4" /> Open WhatsApp
          </a>
        </div>
      </SideSheet>
    </>
  );
}
