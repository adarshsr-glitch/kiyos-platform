"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, right-hand sheet from sm. Built on Radix Dialog, so keyboard focus
 * moves into the panel, stays there while it's open and returns to where it was on close;
 * the title names the panel for screen readers; Escape or the backdrop closes it.
 *
 * It's rendered at the document root (a parent with backdrop-filter or transform would trap
 * a fixed panel), so it takes on the page's side, `.portal` or `.workspace`, itself: same
 * fonts and colours as the page that opened it.
 */
export function SideSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  /** Room for a chart: up to 880px on wide screens. */
  wide?: boolean;
}) {
  const [scope, setScope] = useState("");
  // Callers open the panel themselves (no Radix Trigger), so remember what had focus and
  // give it back on close; otherwise keyboard users land at the top of the page.
  const opener = useRef<HTMLElement | null>(null);
  // Read during render, as the panel opens: a form inside may focus its own field on mount,
  // before any effect of ours runs.
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  }
  wasOpen.current = open;
  useEffect(() => {
    if (open) setScope(document.querySelector(".workspace") ? "workspace" : document.querySelector(".portal") ? "portal" : "");
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/30" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (opener.current?.isConnected) {
              e.preventDefault();
              opener.current.focus();
            }
          }}
          // A toast is not part of the page behind: clicking it mustn't close the panel.
          onPointerDownOutside={(e) => {
            if ((e.target as HTMLElement | null)?.closest?.("[data-sonner-toaster]")) e.preventDefault();
          }}
          className={cn(
            scope,
            "fixed inset-x-0 bottom-0 z-[70] max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 text-foreground shadow-xl focus:outline-none",
            "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:rounded-none sm:p-6",
            wide ? "sm:w-[min(880px,92vw)]" : "sm:w-[460px]"
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              {eyebrow && <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
              <Dialog.Title className="text-lg font-semibold leading-snug">{title}</Dialog.Title>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
