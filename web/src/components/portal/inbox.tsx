"use client";

/**
 * The customer's alerts, in one place for the whole workspace: messages from their expert
 * they haven't read (the same thread as WhatsApp) and what they have to do. The bell in the
 * top bar carries the count; Messages in the side nav carries the unread messages; Overview
 * opens with the latest message. Opening Messages marks the messages read; to-dos stay
 * until they're done. Refreshed every few seconds, so a message the expert just sent shows
 * up without a reload.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileUp, MessageCircle, PenLine } from "lucide-react";
import { getInbox, markInboxRead, type CustomerInbox } from "@/lib/residency";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMPTY: CustomerInbox = { unread: [], todos: [], count: 0 };
const Ctx = createContext<{ inbox: CustomerInbox; refresh: () => void }>({ inbox: EMPTY, refresh: () => {} });
export const useInbox = () => useContext(Ctx);

export function InboxProvider({ caseId, children }: { caseId: number; children: React.ReactNode }) {
  const [inbox, setInbox] = useState<CustomerInbox>(EMPTY);
  const pathname = usePathname();
  const refresh = useCallback(() => {
    getInbox(caseId).then(setInbox).catch(() => {});
  }, [caseId]);

  useEffect(() => {
    if (pathname === "/portal/messages") markInboxRead(caseId).then(refresh).catch(refresh);
    else refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [caseId, pathname, refresh]);

  return <Ctx.Provider value={{ inbox, refresh }}>{children}</Ctx.Provider>;
}

export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return formatDate(iso, { day: "numeric", month: "short" });
};

const today = () => new Date().toISOString().slice(0, 10);
export function dueLabel(due: string | null) {
  if (!due) return null;
  const days = Math.round((new Date(due + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 864e5);
  if (days < 0) return { text: `${-days} day${days === -1 ? "" : "s"} late`, late: true };
  if (days === 0) return { text: "due today", late: true };
  if (days === 1) return { text: "due tomorrow", late: false };
  return { text: `due ${formatDate(due, { day: "numeric", month: "short" })}`, late: false };
}

export const TODO_ICON = { confirm: PenLine, upload: FileUp, reply: MessageCircle } as const;

/** Top bar: a bell with the number of things waiting on the customer. */
export function NotificationBell() {
  const { inbox } = useInbox();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={inbox.count ? `${inbox.count} waiting on you` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card text-foreground hover:bg-muted"
      >
        <Bell className="h-[18px] w-[18px]" />
        {inbox.count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10.5px] font-semibold tabular-nums text-white ring-2 ring-background">
            {inbox.count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-xl border bg-card shadow-lg">
          {inbox.count === 0 ? (
            <p className="px-4 py-5 text-[13.5px] text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <>
              {inbox.unread.length > 0 && (
                <div className="border-b">
                  <p className="px-4 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">New messages</p>
                  {inbox.unread.slice(-3).reverse().map((m) => (
                    <Link key={m.id} href="/portal/messages" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-muted/60">
                      <p className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-foreground">{m.author}</span>
                        <span className="text-[11.5px] text-muted-foreground">{ago(m.at)}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-foreground/80">{m.content}</p>
                    </Link>
                  ))}
                </div>
              )}
              {inbox.todos.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">To do</p>
                  {inbox.todos.map((t) => {
                    const Icon = TODO_ICON[t.kind];
                    const due = dueLabel(t.due);
                    return (
                      <Link key={t.key} href={t.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{t.title}</span>
                        {due && <span className={cn("shrink-0 text-[11.5px]", due.late ? "font-medium text-rose-700" : "text-muted-foreground")}>{due.text}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Side nav: unread messages from the expert on the Messages link. */
export function UnreadBadge({ className }: { className?: string }) {
  const { inbox } = useInbox();
  if (!inbox.unread.length) return null;
  return (
    <span className={cn("flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10.5px] font-semibold tabular-nums text-white", className)}>
      {inbox.unread.length}
    </span>
  );
}

/** Overview: the expert's latest unread message, above everything else. */
export function MessageAlert() {
  const { inbox } = useInbox();
  const last = inbox.unread[inbox.unread.length - 1];
  if (!last) return null;
  const n = inbox.unread.length;
  return (
    <Link
      href="/portal/messages"
      className="group flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-4 transition-colors hover:bg-rose-50"
    >
      <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
        <MessageCircle className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">
          {last.author} sent you {n > 1 ? `${n} messages` : "a message"}
          <span className="ml-2 text-[12.5px] font-normal text-muted-foreground">{ago(last.at)} · also on WhatsApp</span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-foreground/85">“{last.content}”</span>
      </span>
      {/* The banner goes to Messages, so it reads as a link (one-panel rule: only links change page). */}
      <span className="shrink-0 self-center text-[13px] font-semibold text-rose-700 group-hover:underline">Open Messages →</span>
    </Link>
  );
}
