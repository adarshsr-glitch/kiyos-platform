"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Clock,
  Hand,
  Send,
  Sparkles,
  Undo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { ConversationState, Message } from "@/lib/types";
import {
  getConversation,
  handBackConversation,
  sendAdvisorMessage,
  sendMessage,
  takeOverConversation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const POLL_MS = 4000;

const SUGGESTED_PROMPTS = [
  "What documents do I need?",
  "What's my residency position?",
  "When is my next deadline?",
];

const RULE_ID_RE = /\b[A-Z]{2,4}-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g;

function renderWithRuleChips(text: string): React.ReactNode {
  const parts: (string | { rule: string })[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(RULE_ID_RE);
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ rule: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return text;
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <span
        key={i}
        className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1 py-0 font-mono text-[10px] text-primary mx-0.5"
      >
        {p.rule}
      </span>
    )
  );
}

function isEscalation(m: Message) {
  return (
    m.role === "assistant" &&
    (m.routed || /\bred[- ]tier\b|expert review raised|needs advisor/i.test(m.content))
  );
}

/** Seeded or synthetic messages (e.g. the dashboard greeting) carry id <= 0. */
function mergeSynthetic(initial: Message[], server: Message[]) {
  return [...initial.filter((m) => m.id <= 0), ...server];
}

export function ChatPanel({
  conversationId,
  initialMessages,
  caseClientName,
  suggestedPrompts,
  fullPage,
  embedded,
  portalMode,
  advisorName,
}: {
  conversationId: number;
  initialMessages: Message[];
  caseClientName?: string;
  suggestedPrompts?: string[];
  fullPage?: boolean;
  embedded?: boolean;
  /** Customer view. Without it the panel is the advisor's view of the customer thread. */
  portalMode?: boolean;
  /** Advisor view only: who is replying / taking over. */
  advisorName?: string;
}) {
  const advisorView = !portalMode;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [controller, setController] = useState<{
    who: ConversationState["controller"];
    name: string | null;
  }>({ who: "agent", name: null });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyMode, setReplyMode] = useState<"direct" | "via_agent">("via_agent");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastKey = useRef<string>("");

  const applyState = useCallback(
    (state: ConversationState) => {
      const key = `${state.messages.length}:${state.messages.at(-1)?.id}:${state.controller}`;
      if (key === lastKey.current) return;
      lastKey.current = key;
      setMessages(mergeSynthetic(initialMessages, state.messages));
      setController({ who: state.controller, name: state.controller_name });
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

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
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          {
            id: -Date.now(),
            role: "system",
            content: "Message not sent. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
        setInput(text);
      } finally {
        setSending(false);
      }
    },
    [sending, conversationId, advisorView, advisorName, replyMode, applyState]
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

  const prompts = advisorView ? [] : suggestedPrompts ?? SUGGESTED_PROMPTS;
  const advisorInThread = controller.who === "advisor";
  const mine = advisorInThread && controller.name === advisorName;

  const header = (
    <div className={cn("flex items-center justify-between px-4", embedded ? "h-10 border-b px-3" : "h-12")}>
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className={cn("text-primary", embedded ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <h3 className={cn("font-semibold text-foreground", embedded ? "text-xs" : "text-sm")}>
          {advisorView ? "Customer thread" : "Ask Kiyos"}
        </h3>
        {advisorView && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              advisorInThread ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
            )}
          >
            {advisorInThread ? `${mine ? "You" : controller.name} in thread` : "Kiyos answering"}
          </span>
        )}
      </div>
      {advisorView && advisorName ? (
        <Button
          size="sm"
          variant={advisorInThread ? "outline" : "default"}
          className="h-7 gap-1.5 text-xs"
          onClick={toggleControl}
          disabled={advisorInThread && !mine}
        >
          {advisorInThread ? <Undo2 className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
          {advisorInThread ? "Hand back" : "Take over"}
        </Button>
      ) : (
        caseClientName && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
            {caseClientName}
          </span>
        )
      )}
    </div>
  );

  return (
    <div className={cn("flex h-full flex-col bg-card", !fullPage && !embedded && "border-l", embedded && "rounded-lg border")}>
      {header}
      {!embedded && <Separator />}

      {!advisorView && advisorInThread && (
        <div className="flex items-center gap-2 border-b bg-emerald-50 px-4 py-2 text-xs text-emerald-900">
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          Your advisor {controller.name} has joined the conversation.
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((m) => (
            <ChatMessage key={m.id} m={m} advisorView={advisorView} />
          ))}
          {sending && !advisorView && !advisorInThread && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground animate-pulse">
                Kiyos is checking your case…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {prompts.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-t">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={sending}
                className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {advisorView && advisorName && (
        <div className="flex items-center gap-1 border-t px-4 pt-2">
          {(
            [
              { key: "via_agent", label: "Reply via Kiyos" },
              { key: "direct", label: "Reply as you" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              onClick={() => setReplyMode(o.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                replyMode === o.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className={cn("flex items-center gap-2 px-4 py-3", !(advisorView && advisorName) && "border-t")}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            advisorView
              ? replyMode === "via_agent"
                ? "Note for Kiyos to relay to the customer…"
                : "Message the customer directly…"
              : "Ask about your case…"
          }
          disabled={sending || (advisorView && !advisorName)}
          className="flex-1 text-sm"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ChatMessage({ m, advisorView }: { m: Message; advisorView: boolean }) {
  if (m.role === "system") {
    return (
      <p className="text-center text-[11px] text-muted-foreground italic px-6">{m.content}</p>
    );
  }

  const fromCustomer = m.role === "user";
  // Right-align whoever is "me" in this view.
  const mine = advisorView ? m.role === "advisor" : fromCustomer;
  const escalated = isEscalation(m);
  const label =
    m.role === "advisor"
      ? `${m.author ?? "Advisor"} · case captain`
      : m.role === "assistant" && m.author && m.author !== "Kiyos"
        ? m.author
        : advisorView && fromCustomer
          ? "Customer"
          : null;

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {label && <span className="mb-0.5 px-1 text-[10px] text-muted-foreground">{label}</span>}
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          mine
            ? "bg-primary text-primary-foreground"
            : m.role === "advisor"
              ? "border border-emerald-200 bg-emerald-50 text-foreground"
              : "bg-muted text-foreground"
        )}
      >
        {escalated &&
          (advisorView ? (
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              Routed to advisor
              {m.confidence != null && ` · ${Math.round(m.confidence * 100)}% confidence`}
            </div>
          ) : (
            <div className="mb-1.5 flex items-center gap-1.5 rounded bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-900">
              <Clock className="h-3 w-3" />
              We&apos;re checking with your advisor
            </div>
          ))}
        <div>{advisorView ? renderWithRuleChips(m.content) : m.content}</div>
        {advisorView && m.role === "assistant" && !escalated && m.confidence != null && (
          <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            {Math.round(m.confidence * 100)}% confidence
            {m.cited_rules?.length ? ` · ${m.cited_rules.join(", ")}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
