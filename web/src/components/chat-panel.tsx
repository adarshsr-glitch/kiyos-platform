"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCheck,
  Clock,
  Hand,
  Lock,
  Paperclip,
  Phone,
  SendHorizontal,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { ConversationState, FreeUsage, Message } from "@/lib/types";
import {
  ApiError,
  getConversation,
  handBackConversation,
  sendAdvisorMessage,
  sendMessage,
  takeOverConversation,
} from "@/lib/api";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookCallDialog } from "@/components/portal/book-call-dialog";

const POLL_MS = 4000;
const RULE_ID_RE = /\b[A-Z]{2,4}-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g;

function renderWithRuleChips(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(RULE_ID_RE);
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span
        key={match.index}
        className="mx-0.5 rounded bg-black/5 px-1 font-mono text-[11px] text-[var(--wa-link)]"
      >
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function isEscalation(m: Message) {
  return (
    m.role === "assistant" &&
    (m.routed || /\bred[- ]tier\b|expert review raised|needs advisor/i.test(m.content))
  );
}

/** A synthetic welcome (id <= 0) only stands in for an empty thread. */
function mergeSynthetic(initial: Message[], server: Message[]) {
  return server.length > 0 ? server : initial.filter((m) => m.id <= 0);
}

function timeOf(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The customer conversation, rendered as a WhatsApp Business thread (WhatsApp is
 * the primary customer channel). Two perspectives:
 *  - portalMode: the customer's phone — their messages on the right.
 *  - advisor view: the business inbox — Kiyos and advisor messages on the right,
 *    with take over / hand back and reply-mode controls.
 */
export function ChatPanel({
  conversationId,
  initialMessages,
  caseClientName,
  suggestedPrompts,
  embedded,
  portalMode,
  advisorName,
  caseId,
  captainName,
  backHref,
  onBack,
  className,
}: {
  conversationId: number;
  initialMessages: Message[];
  caseClientName?: string;
  suggestedPrompts?: string[];
  /** Kept for existing call sites; layout is driven by the parent container. */
  fullPage?: boolean;
  embedded?: boolean;
  /** Customer view. Without it the panel is the advisor's view of the customer thread. */
  portalMode?: boolean;
  /** Advisor view only: who is replying / taking over. */
  advisorName?: string;
  /** Customer view: enables the call button in the header. */
  caseId?: number;
  captainName?: string;
  /** Shows a back arrow in the header (mobile full-screen chat). */
  backHref?: string;
  /** Shows a back arrow that runs this instead (e.g. closing a drawer). */
  onBack?: () => void;
  className?: string;
}) {
  const advisorView = !portalMode;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [controller, setController] = useState<{
    who: ConversationState["controller"];
    name: string | null;
  }>({ who: "agent", name: null });
  const [plan, setPlan] = useState<ConversationState["plan"]>("premium");
  const [usage, setUsage] = useState<FreeUsage | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyMode, setReplyMode] = useState<"direct" | "via_agent">("via_agent");
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastKey = useRef<string>("");

  const applyState = useCallback(
    (state: ConversationState) => {
      const u = state.usage;
      const key = `${state.messages.length}:${state.messages.at(-1)?.id}:${state.controller}:${state.plan}:${u?.messages_used}`;
      if (key === lastKey.current) return;
      lastKey.current = key;
      setMessages(mergeSynthetic(initialMessages, state.messages));
      setController({ who: state.controller, name: state.controller_name });
      setPlan(state.plan);
      setUsage(state.usage);
    },
    [initialMessages]
  );

  // Poll so advisor replies reach the customer and customer questions reach the advisor.
  useEffect(() => {
    let alive = true;
    const tick = () =>
      getConversation(conversationId)
        .then((s) => alive && applyState(s))
        .catch(() => {});
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [conversationId, applyState]);

  useEffect(() => {
    if (advisorView) setReplyMode(controller.who === "advisor" ? "direct" : "via_agent");
  }, [advisorView, controller.who]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const free = !advisorView && plan === "free" && usage !== null;
  const outOfMessages = free && usage.messages_used >= usage.messages_limit;

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending || outOfMessages) return;

      const optimistic: Message = {
        id: Date.now(),
        role: advisorView ? "advisor" : "user",
        content: text,
        author: advisorView ? advisorName : null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setSending(true);

      try {
        const result =
          advisorView && advisorName
            ? await sendAdvisorMessage(conversationId, advisorName, text, replyMode)
            : await sendMessage(conversationId, text);
        lastKey.current = "";
        applyState(result.conversation);
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        if (e instanceof ApiError && e.status === 402) {
          lastKey.current = "";
          getConversation(conversationId).then(applyState).catch(() => {});
        } else {
          toast.error("Message not sent. Check your connection and try again.");
          setInput(text);
        }
      } finally {
        setSending(false);
      }
    },
    [sending, outOfMessages, conversationId, advisorView, advisorName, replyMode, applyState]
  );

  const toggleControl = useCallback(async () => {
    if (!advisorName) return;
    try {
      const state =
        controller.who === "advisor"
          ? await handBackConversation(conversationId, advisorName)
          : await takeOverConversation(conversationId, advisorName);
      lastKey.current = "";
      applyState(state);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change thread control");
    }
  }, [advisorName, controller.who, conversationId, applyState]);

  const advisorInThread = controller.who === "advisor";
  const mine = advisorInThread && controller.name === advisorName;

  // Group consecutive messages by side so only the first bubble of a run gets a tail.
  const rows = useMemo(() => {
    let prevSide: string | null = null;
    let prevDay: string | null = null;
    return messages.map((m) => {
      const outgoing = advisorView ? m.role === "assistant" || m.role === "advisor" : m.role === "user";
      const side = m.role === "system" ? "system" : outgoing ? "out" : `in:${m.role}:${m.author ?? ""}`;
      const day = dayLabel(m.created_at);
      const newDay = day !== prevDay;
      const first = side !== prevSide || newDay;
      prevSide = side;
      prevDay = day;
      return { m, outgoing, first, newDay, day };
    });
  }, [messages, advisorView]);

  const last = messages.at(-1);
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content.trim()));
  const quickReplies = (suggestedPrompts ?? []).filter((p) => !asked.has(p));
  const showQuickReplies =
    !advisorView &&
    !sending &&
    !outOfMessages &&
    !advisorInThread &&
    quickReplies.length > 0 &&
    (!last || last.role !== "user");

  const subtitle = advisorView
    ? advisorInThread
      ? `${mine ? "You are" : `${controller.name} is`} replying · Kiyos paused`
      : "WhatsApp · Kiyos is answering"
    : sending && !advisorInThread
      ? "typing…"
      : advisorInThread
        ? `${controller.name} from Kiyos is in this chat`
        : "Business account";

  return (
    <div
      className={cn(
        "wa flex h-full min-h-0 flex-col overflow-hidden bg-[var(--wa-composer)]",
        embedded && "rounded-xl border",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-[56px] shrink-0 items-center gap-2.5 bg-[var(--wa-header)] px-3 text-white">
        {backHref ? (
          <Link href={backHref} aria-label="Back" className="-ml-1 rounded-full p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          onBack && (
            <button onClick={onBack} aria-label="Close chat" className="-ml-1 rounded-full p-1 hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )
        )}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
            advisorView ? "bg-[#dfe5e7] text-[#54656f]" : "bg-white text-[var(--wa-header)]"
          )}
        >
          {advisorView ? initials(caseClientName ?? "Customer") : (
            <span className="brand-wordmark text-[15px]">K</span>
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 truncate text-[15px] font-medium">
            {advisorView ? caseClientName ?? "Customer" : "Kiyos"}
            {!advisorView && <BadgeCheck className="h-4 w-4 shrink-0 fill-[#25d366] text-[var(--wa-header)]" />}
          </p>
          <p className="truncate text-[12px] text-white/80">{subtitle}</p>
        </div>
        {advisorView && advisorName ? (
          <button
            onClick={toggleControl}
            disabled={advisorInThread && !mine}
            className="flex shrink-0 items-center gap-1 rounded-full border border-white/40 px-2.5 py-1 text-[12px] font-medium hover:bg-white/10 disabled:opacity-50"
          >
            {advisorInThread ? <Undo2 className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
            {advisorInThread ? "Hand back" : "Take over"}
          </button>
        ) : (
          caseId &&
          captainName &&
          plan === "premium" && (
            <button
              onClick={() => setCallOpen(true)}
              aria-label={`Book a call with ${captainName}`}
              title={`Book your quarterly call with ${captainName}`}
              className="shrink-0 rounded-full p-2 hover:bg-white/10"
            >
              <Phone className="h-[18px] w-[18px]" />
            </button>
          )
        )}
      </div>

      {/* Free-plan allowance, pinned like a WhatsApp pinned message */}
      {free && (
        <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-white px-3 py-1.5 text-[12.5px] text-[#54656f]">
          <span className="font-medium text-[var(--wa-text)]">Free plan</span>
          <span className="tabular-nums">
            {Math.max(usage.generic_limit - usage.generic_used, 0)} of {usage.generic_limit} general questions left
          </span>
          <Link href="/portal/upgrade" className="ml-auto shrink-0 font-medium text-[var(--wa-header)] hover:underline">
            See plans
          </Link>
        </div>
      )}

      {/* Thread */}
      <div ref={scrollRef} className="wa-wallpaper min-h-0 flex-1 overflow-y-auto px-[5%] py-3 sm:px-6">
        <div className="mx-auto mb-3 max-w-[90%] rounded-lg bg-[var(--wa-notice)] px-3 py-1.5 text-center text-[12px] leading-snug text-[#54656f] shadow-sm">
          <Lock className="mr-1 inline h-3 w-3 -translate-y-px" />
          {advisorView
            ? "Customer's WhatsApp thread. Kiyos answers within its confidence limits; anything else routes to the captain."
            : "Answers come from Kiyos's reviewed tax rules. Anything specific to you is checked by your advisor. Never share ID numbers or documents here."}
        </div>

        {rows.map(({ m, outgoing, first, newDay, day }) => (
          <Fragment key={m.id}>
            {newDay && (
              <div className="my-2 flex justify-center">
                <span className="rounded-md bg-white px-2.5 py-1 text-[12px] text-[#54656f] shadow-sm">{day}</span>
              </div>
            )}
            <Bubble m={m} outgoing={outgoing} first={first} advisorView={advisorView} />
          </Fragment>
        ))}

        {sending && !advisorView && !advisorInThread && (
          <div className="mt-1 flex">
            <div className="wa-bubble flex gap-1 rounded-lg rounded-tl-none bg-[var(--wa-in)] px-3 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8696a0]"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {showQuickReplies && (
          <div className="mt-2 flex max-w-[85%] flex-col gap-1">
            {quickReplies.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="wa-bubble rounded-lg bg-[var(--wa-in)] px-3 py-2 text-center text-[14px] text-[var(--wa-link)] hover:bg-[#f5f6f6]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      {advisorView && advisorName && (
        <div className="flex shrink-0 items-center gap-1 px-3 pt-2 text-[12px]">
          {(
            [
              { key: "via_agent", label: "Via Kiyos" },
              { key: "direct", label: "As you" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              onClick={() => setReplyMode(o.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-2.5 py-0.5 transition-colors",
                replyMode === o.key ? "bg-[#d9fdd3] font-medium text-[#008069]" : "text-[#54656f] hover:bg-black/5"
              )}
            >
              {o.label}
            </button>
          ))}
          <span className="ml-auto hidden truncate text-[#8696a0] xl:inline">
            {replyMode === "via_agent" ? "Kiyos rewrites your note for the customer" : "Sent in your name"}
          </span>
        </div>
      )}

      {outOfMessages ? (
        <div className="flex shrink-0 flex-col items-center gap-2 px-4 py-3 text-center text-[13px] text-[#54656f]">
          <p>You&apos;ve reached the free chat limit. Choose a plan to keep the conversation going with your own advisor.</p>
          <Link
            href="/portal/upgrade"
            className="rounded-full bg-[var(--wa-send)] px-4 py-1.5 text-[13px] font-medium text-white hover:brightness-95"
          >
            See plans
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex shrink-0 items-center gap-2 px-2.5 py-2"
        >
          {!advisorView && (
            <Link
              href="/portal/documents"
              aria-label="Upload documents securely"
              title="Documents go to your secure workspace, not the chat"
              className="rounded-full p-2 text-[#54656f] hover:bg-black/5"
            >
              <Paperclip className="h-5 w-5" />
            </Link>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              advisorView
                ? replyMode === "via_agent"
                  ? "Note for Kiyos to relay"
                  : "Message as yourself"
                : "Message"
            }
            disabled={sending || (advisorView && !advisorName)}
            className="h-10 min-w-0 flex-1 rounded-lg bg-white px-3 text-[15px] text-[var(--wa-text)] placeholder:text-[#8696a0] outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wa-send)] text-white transition-opacity disabled:opacity-60"
          >
            <SendHorizontal className="h-[18px] w-[18px]" />
          </button>
        </form>
      )}

      {caseId && captainName && caseClientName && (
        <BookCallDialog
          open={callOpen}
          onOpenChange={setCallOpen}
          caseId={caseId}
          captain={captainName}
          clientName={caseClientName}
        />
      )}
    </div>
  );
}

function Bubble({
  m,
  outgoing,
  first,
  advisorView,
}: {
  m: Message;
  outgoing: boolean;
  first: boolean;
  advisorView: boolean;
}) {
  if (m.role === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="max-w-[85%] rounded-md bg-white/90 px-2.5 py-1 text-center text-[12px] text-[#54656f] shadow-sm">
          {m.content}
        </span>
      </div>
    );
  }

  const escalated = isEscalation(m);
  // Sender line, as in a WhatsApp Business chat answered by several agents.
  const sender =
    m.role === "advisor"
      ? `${m.author ?? "Advisor"} · Kiyos`
      : advisorView && m.role === "assistant"
        ? m.author && m.author !== "Kiyos"
          ? m.author
          : "Kiyos assistant"
        : !advisorView && m.role === "assistant" && m.author && m.author !== "Kiyos"
          ? m.author
          : null;

  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start", first ? "mt-2" : "mt-0.5")}>
      <div className={cn("relative max-w-[85%] sm:max-w-[75%]", first && (outgoing ? "rounded-tr-none" : "rounded-tl-none"))}>
        {first && <Tail outgoing={outgoing} />}
        <div
          className={cn(
            "wa-bubble rounded-lg px-2 pb-1.5 pt-1.5",
            outgoing ? "bg-[var(--wa-out)]" : "bg-[var(--wa-in)]",
            first && (outgoing ? "rounded-tr-none" : "rounded-tl-none")
          )}
        >
          {sender && (
            <p className={cn("px-1 text-[12.8px] font-medium", m.role === "advisor" ? "text-[#1f7aec]" : "text-[#008069]")}>
              {sender}
            </p>
          )}
          {escalated && (
            <p className="mx-1 mb-0.5 flex items-center gap-1 text-[12px] font-medium text-[#b25e09]">
              <Clock className="h-3 w-3" />
              {advisorView
                ? `Routed to advisor${m.confidence != null ? ` · ${Math.round(m.confidence * 100)}% confidence` : ""}`
                : "With your advisor for review"}
            </p>
          )}
          <div className="whitespace-pre-wrap break-words px-1">
            {advisorView ? renderWithRuleChips(m.content) : m.content}
            {/* Spacer so the timestamp never overlaps the last line */}
            <span className="inline-block w-[64px]" aria-hidden />
          </div>
          <div className="-mt-3.5 flex items-center justify-end gap-1 px-1 text-[11px] text-[var(--wa-meta)]">
            {advisorView && m.role === "assistant" && !escalated && m.confidence != null && (
              <span className="mr-1 tabular-nums">{Math.round(m.confidence * 100)}%</span>
            )}
            <span className="tabular-nums">{timeOf(m.created_at)}</span>
            {outgoing &&
              (m.id > 1e12 ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 text-[var(--wa-tick)]" />
              ))}
          </div>
        </div>
        {m.action && !advisorView && (
          <Link
            href={m.action.href}
            className="wa-bubble mt-0.5 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--wa-in)] px-3 py-2 text-[14px] text-[var(--wa-link)] hover:bg-[#f5f6f6]"
          >
            <ArrowUpRight className="h-4 w-4" />
            {m.action.label}
          </Link>
        )}
        {m.action && advisorView && (
          <p className="mt-0.5 text-right text-[11px] text-[var(--wa-meta)]">Button sent: {m.action.label}</p>
        )}
      </div>
    </div>
  );
}

function Tail({ outgoing }: { outgoing: boolean }) {
  return (
    <svg
      viewBox="0 0 8 13"
      width="8"
      height="13"
      aria-hidden
      className={cn("absolute top-0", outgoing ? "-right-2 text-[var(--wa-out)]" : "-left-2 text-[var(--wa-in)]")}
    >
      <path fill="currentColor" d={outgoing ? "M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" : "M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z"} />
    </svg>
  );
}
