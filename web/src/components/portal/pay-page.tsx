"use client";

/**
 * The payment page a WhatsApp payment link opens: pre-filled with the customer and the plan
 * they chose, valid for 24 hours. Paying activates the plan and sends the confirmation on
 * WhatsApp; the same link afterwards shows the confirmation. Prototype: no money moves.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, MessageCircle } from "lucide-react";
import { payWithLink, type MagicLinkInfo } from "@/lib/residency";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const METHODS = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Indian card" },
  { key: "netbanking", label: "Netbanking" },
] as const;

function left(until: string | null) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function PayPage({ token, link }: { token: string; link: MagicLinkInfo }) {
  const router = useRouter();
  const p = link.payload!;
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">(p.payment_method);
  const [state, setState] = useState<"ready" | "paying" | "paid">(link.status === "used" ? "paid" : "ready");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(left(link.expires_at));
  useEffect(() => {
    const t = setInterval(() => setRemaining(left(link.expires_at)), 30000);
    return () => clearInterval(t);
  }, [link.expires_at]);

  // The workspace to open after paying: as the payment confirms it.
  const [caseId, setCaseId] = useState(link.case_id);

  async function pay() {
    setState("paying");
    setError(null);
    try {
      const out = await payWithLink(token, method);
      setCaseId(out.case_id);
      setState("paid");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The payment didn't go through. Nothing was charged; try again.");
      setState("ready");
    }
  }
  function openWorkspace() {
    document.cookie = `kiyos-case=${caseId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.push("/portal/overview");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-10 sm:items-center">
      <div className="w-full max-w-[460px] space-y-4">
        <p className="flex items-center justify-between">
          <span className="font-serif text-[22px] tracking-wide text-primary">KIYOS</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Secure payment
          </span>
        </p>

        {state === "paid" ? (
          <section className="rounded-2xl bg-card p-7 shadow-[0_0_0_1px_hsl(var(--border))]">
            <CheckCircle2 className="h-8 w-8 text-emerald-700" />
            <h1 className="mt-3 text-[22px] font-semibold text-foreground">Payment received</h1>
            <p className="mt-1 text-[14.5px] text-muted-foreground">
              {p.name} · {p.household === "couple" ? "you and your spouse" : "just you"} · {inr(p.price_inr)} incl. GST
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-[13.5px] text-foreground">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              Your confirmation and receipt are on WhatsApp, and your expert has been assigned.
            </p>
            <button onClick={openWorkspace} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-[15px] font-medium text-primary-foreground">
              Open my workspace
            </button>
          </section>
        ) : (
          <section className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border))] sm:p-7">
            <p className="text-[13px] text-muted-foreground">Paying as</p>
            <p className="text-[17px] font-semibold text-foreground">{link.client_name}</p>
            <p className="text-[13px] text-muted-foreground">WhatsApp {link.phone}</p>

            <dl className="mt-5 space-y-2 border-y py-4 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="text-foreground">{p.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Covers</dt>
                <dd className="text-foreground">{p.household === "couple" ? "You and your spouse" : "Just you"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Scope, terms and NDA</dt>
                <dd className="text-foreground">Confirmed</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-serif text-[28px] leading-none tabular-nums text-foreground">{inr(p.price_inr)}</dd>
              </div>
              <p className="text-right text-[12px] text-muted-foreground">incl. 18% GST</p>
            </dl>

            <p className="mt-4 text-[13px] text-muted-foreground">Pay with</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={cn("h-9 rounded-full border px-4 text-[13.5px]", method === m.key ? "border-primary bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-[13px] text-rose-700">{error}</p>}
            <button onClick={pay} disabled={state === "paying"} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-[15px] font-medium text-primary-foreground disabled:opacity-70">
              {state === "paying" ? "Processing…" : `Pay ${inr(p.price_inr)}`}
            </button>
            <p className="mt-3 text-center text-[12px] text-muted-foreground">
              Through Razorpay · link valid {remaining === "expired" ? "no longer" : `for ${remaining}`} (until {formatDate(link.expires_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}) · Prototype: no money moves
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
