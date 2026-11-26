"use client";

/** The expert's right rail: the shared case timeline, the WhatsApp thread itself, or the experts' notes. */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CaseRail({ activity, thread, notes }: { activity: React.ReactNode; thread: React.ReactNode; notes?: React.ReactNode }) {
  const [tab, setTab] = useState<"activity" | "thread" | "notes">("activity");
  // "Open thread" on a customer's reply switches the rail to the conversation.
  useEffect(() => {
    const open = () => setTab("thread");
    window.addEventListener("kiyos:open-thread", open);
    return () => window.removeEventListener("kiyos:open-thread", open);
  }, []);
  return (
    <div className="flex h-full flex-col">
      <div role="tablist" className="flex shrink-0 gap-4 border-b px-4">
        {(notes ? (["activity", "thread", "notes"] as const) : (["activity", "thread"] as const)).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("border-b-2 py-3 text-[13px] transition-colors", tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t === "activity" ? "Case activity" : t === "thread" ? "WhatsApp thread" : "Notes"}
          </button>
        ))}
      </div>
      <div className={cn("min-h-0 flex-1", tab !== "thread" ? "overflow-y-auto px-5 py-4" : "")}>{tab === "activity" ? activity : tab === "thread" ? thread : notes}</div>
    </div>
  );
}
