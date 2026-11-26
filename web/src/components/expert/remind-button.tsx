"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { remindCustomer } from "@/lib/residency";

/** Sends the customer a WhatsApp reminder about one open item (writes a real record). */
export function RemindButton({ itemId, by, customer }: { itemId: number; by: string | null; customer: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const first = customer.split(" ")[0];
  if (state === "sent")
    return (
      <span className="inline-flex items-center gap-1 text-[12.5px] text-primary">
        <Check className="h-3.5 w-3.5" aria-hidden /> Reminded
      </span>
    );
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          await remindCustomer(itemId, by ?? undefined);
          setState("sent");
          toast.success(`Reminder sent to ${first} on WhatsApp`);
          router.refresh();
        } catch (e) {
          setState("idle");
          toast.error(e instanceof Error ? e.message : "That didn't send");
        }
      }}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-60"
    >
      {state === "busy" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      Remind
    </button>
  );
}
