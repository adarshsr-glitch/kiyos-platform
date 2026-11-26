"use client";

/**
 * Below 1280px the case page has no room for the right rail, so the WhatsApp thread opens
 * in a side panel instead: from the "Thread" button in the case header, or from "Open
 * thread" on a customer's reply (the same `kiyos:open-thread` event the rail listens to).
 */

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { SideSheet } from "@/components/side-sheet";

const RAIL_MIN = 1280; // Tailwind `xl`, where the rail shows the thread itself.

export function ThreadSheet({ customer, children }: { customer: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => window.innerWidth < RAIL_MIN && setOpen(true);
    window.addEventListener("kiyos:open-thread", show);
    return () => window.removeEventListener("kiyos:open-thread", show);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-muted xl:hidden"
      >
        <MessageCircle className="h-4 w-4" /> Thread
      </button>
      <SideSheet open={open} onClose={() => setOpen(false)} eyebrow="WhatsApp thread" title={customer}>
        <div className="-mx-5 -mb-5 h-[70vh] border-t sm:-mx-6 sm:-mb-6 sm:h-[calc(100vh-7.5rem)]">{children}</div>
      </SideSheet>
    </>
  );
}
