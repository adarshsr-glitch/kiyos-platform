"use client";

/**
 * Customer replies, on the expert side. When a customer answers something the expert sent
 * (on WhatsApp or in their workspace), the expert sees it: a bell with a count in the side
 * rail (new until an expert opens that case), and a banner on top of the case itself while
 * the reply is the last word in the thread.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { getCaseReply, getExpertInbox, markExpertSeen, type CustomerReply } from "@/lib/residency";
import { ago } from "@/components/portal/inbox";

export function ExpertBell({ expert, pathname }: { expert: string | null; pathname: string }) {
  const [replies, setReplies] = useState<CustomerReply[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    // Live: when a customer writes, the open page refreshes so it shows straight away.
    const load = () =>
      getExpertInbox(expert)
        .then((r) => {
          const sig = r.map((x) => `${x.case_id}@${x.at}`).join("|");
          if (seen.current !== null && sig !== seen.current) router.refresh();
          seen.current = sig;
          setReplies(r);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [expert, pathname, router]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen(!open)}
        aria-label={replies.length ? `${replies.length} new from customers` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[17px] w-[17px]" />
        {replies.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-sidebar">
            {replies.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-50 w-[320px] overflow-hidden rounded-xl border bg-card shadow-lg">
          <p className="border-b px-4 py-2.5 text-[12px] font-semibold text-foreground">From your customers</p>
          {replies.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-muted-foreground">Nothing new from customers.</p>
          ) : (
            replies.map((r) => (
              <Link key={r.case_id} href={`/expert/cases/${r.case_id}`} onClick={() => setOpen(false)} className="block border-b px-4 py-3 last:border-0 hover:bg-muted/60">
                <p className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-foreground">{r.customer} {r.asked ? "asked you a question" : "replied"}</span>
                  <span className="shrink-0 text-[11.5px] text-muted-foreground">{ago(r.at)}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-[13px] text-foreground/80">“{r.texts[r.texts.length - 1]}”</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** On the case: the customer's reply to the expert, while it's the last word. Opening the case marks it seen. */
export function ReplyAlert({ caseId }: { caseId: number }) {
  const [reply, setReply] = useState<CustomerReply | null>(null);
  useEffect(() => {
    getCaseReply(caseId).then(setReply).catch(() => {});
    markExpertSeen(caseId).catch(() => {});
    const t = setInterval(() => getCaseReply(caseId).then(setReply).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [caseId]);
  if (!reply) return null;
  const first = reply.customer.split(" ")[0];
  return (
    <section aria-label={`${first} replied`} className="flex items-start gap-4 rounded-xl border border-rose-200 bg-rose-50/70 px-5 py-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
        <MessageCircle className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foreground">
          {reply.asked ? `${first} asked you a question` : `${first} replied to your message`}
          <span className="ml-2 text-[12.5px] font-normal text-muted-foreground">{ago(reply.at)} · {reply.asked ? "from his messages" : "WhatsApp"}</span>
        </p>
        {!reply.asked && <p className="mt-1 line-clamp-1 text-[12.5px] text-muted-foreground">You: {reply.to_message}</p>}
        {reply.texts.slice(-2).map((t, i) => (
          <p key={i} className="mt-1 text-[14px] leading-snug text-foreground">“{t}”</p>
        ))}
      </div>
      {reply.asked ? (
        <button
          onClick={() => {
            // The question is on the Today tab: open it (Today is the default, so drop ?tab), then scroll.
            const u = new URL(window.location.href);
            u.searchParams.delete("tab");
            window.history.replaceState(null, "", u);
            setTimeout(() => document.getElementById("q-h")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }}
          className="shrink-0 self-center rounded-lg bg-rose-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-rose-700"
        >
          Answer
        </button>
      ) : (
        <button
          onClick={() => window.dispatchEvent(new Event("kiyos:open-thread"))}
          className="shrink-0 self-center rounded-lg bg-rose-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-rose-700"
        >
          Open thread
        </button>
      )}
    </section>
  );
}
