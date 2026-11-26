"use client";

/**
 * Expert view of the thread: what Kiyos uses for each reply. Case state (read through tools,
 * not remembered), the last 20 messages, and a summary of anything older that is rebuilt as
 * the conversation grows.
 */

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type Memory = { case_state: { label: string; value: string }[]; recent: number; older: number; summary: string | null; refreshed_at: string };

export function AgentMemory({ conversationId }: { conversationId: number }) {
  const [open, setOpen] = useState(false);
  const [m, setM] = useState<Memory | null>(null);
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) setM(await fetch(`${BASE}/conversations/${conversationId}/memory`, { cache: "no-store" }).then((r) => r.json()).catch(() => null));
  }
  return (
    <div className="mx-auto my-2 w-[92%] rounded-lg bg-white/90 text-[12px] text-[#3b4a54] shadow-sm">
      <button onClick={toggle} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left font-medium">
        <Brain className="h-3.5 w-3.5 text-[#008069]" /> What Kiyos uses to reply
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && m && (
        <div className="space-y-2 border-t px-3 py-2">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            {m.case_state.map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="text-[10.5px] text-[#667781]">{s.label}</dt>
                <dd className="truncate">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p>
            <span className="font-medium">Last {m.recent} messages</span> word for word
            {m.older ? `, and ${m.older} older ones as a summary:` : ". Nothing older yet."}
          </p>
          {m.summary && <p className="rounded bg-[#f0f2f5] px-2 py-1.5 leading-snug">{m.summary}</p>}
          <p className="text-[10.5px] text-[#667781]">
            Facts come from the case through tools, never from this summary. Summary refreshed {formatDate(m.refreshed_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.
          </p>
        </div>
      )}
    </div>
  );
}
