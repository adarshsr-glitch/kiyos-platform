"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { signIn } from "@/lib/api";
import type { CaseDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIGITS = 6;

/** Show only the last four digits of the WhatsApp number. */
function maskPhone(phone: string | null) {
  if (!phone) return "your WhatsApp number";
  const digits = phone.replace(/\D/g, "");
  const code = phone.trim().startsWith("+1") ? "+1" : "+91";
  return `${code} ••••• ${digits.slice(-4)}`;
}

/**
 * Sign-in with the WhatsApp number and a one-time code (PRD §7: the verified phone
 * number is the customer's identity). No passwords, no separate account form — the
 * number the customer just chatted from is the account.
 */
export function SignIn({ caseData, areas }: { caseData: CaseDetail; areas: number }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
  const [busy, setBusy] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const first = caseData.client_name.split(" ")[0];
  const phone = maskPhone(caseData.phone);
  const full = code.join("");

  function sendCode() {
    setSent(true);
    setTimeout(() => inputs.current[0]?.focus(), 0);
  }

  function setDigit(i: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setCode((c) => c.map((d, j) => (j === i ? "" : d)));
      return;
    }
    // Pasting the whole code fills every box.
    setCode((c) => {
      const next = [...c];
      digits.slice(0, DIGITS - i).split("").forEach((d, k) => (next[i + k] = d));
      return next;
    });
    inputs.current[Math.min(i + digits.length, DIGITS - 1)]?.focus();
  }

  async function verify() {
    if (full.length !== DIGITS) return;
    setBusy(true);
    try {
      await signIn(caseData.id, full);
      router.push("/portal/assessment");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That code didn't work");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-4 lg:mx-0 lg:py-10">
      <p className="text-xs font-medium text-muted-foreground">Kiyos workspace</p>
      <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight tracking-tight text-foreground">
        Welcome, {first}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Your risk map{areas ? ` (${areas} areas)` : ""} is saved here. Sign in with the number you use on WhatsApp — it
        is your Kiyos account, so there&apos;s no password to remember.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <label className="text-[12px] font-medium text-muted-foreground">WhatsApp number</label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-[15px] tabular-nums text-foreground">
          <MessageCircle className="h-4 w-4 text-[#00a884]" />
          {phone}
          <span className="ml-auto text-[11px] text-muted-foreground">from your chat</span>
        </div>

        {!sent ? (
          <button
            onClick={sendCode}
            className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground"
          >
            Send me a code
          </button>
        ) : (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <p className="text-[13px] text-foreground">Enter the 6-digit code we sent to {phone} on WhatsApp.</p>
            <div className="mt-3 flex gap-2">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={d}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1}`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !d && i > 0) inputs.current[i - 1]?.focus();
                  }}
                  className={cn(
                    "h-12 w-full min-w-0 rounded-lg border bg-background text-center text-lg font-medium tabular-nums outline-none",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20"
                  )}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={full.length !== DIGITS || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Open my workspace
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Prototype: any six digits work.</p>
          </form>
        )}
      </div>

      <ul className="mt-6 space-y-2.5 text-[13px] text-muted-foreground">
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          Documents and ID numbers only ever go here, never into the chat.
        </li>
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          One account per household — add your spouse&apos;s details later, inside your profile.
        </li>
      </ul>
    </div>
  );
}
