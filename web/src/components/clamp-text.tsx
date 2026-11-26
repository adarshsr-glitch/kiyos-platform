"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Long text shown as one line, with "More" to read the rest. "More" only appears when the
 * text is actually cut off.
 */
export function ClampText({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setCut(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div className={cn("flex min-w-0 items-baseline gap-2", className)}>
      <p ref={ref} className={cn("min-w-0", !open && "truncate")}>{text}</p>
      {(cut || open) && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline">
          {open ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
