"use client";

/**
 * What a customer sees when a WhatsApp link can't be used: expired (with a one-tap fresh link
 * on WhatsApp), already used (a paid payment link), or not recognised. Each offers the
 * sign-in with a code as the way in.
 */

import { useState } from "react";
import Link from "next/link";
import { Clock, Link2Off, MessageCircle, ShieldCheck } from "lucide-react";
import { renewLink } from "@/lib/residency";

const COPY = {
  expired: { icon: Clock, title: "This link has expired", body: "Links from WhatsApp work for a short time so nobody else can use them. We can send you a fresh one." },
  used: { icon: ShieldCheck, title: "This link has already been used", body: "The payment it was for went through. Open your workspace to see your receipt." },
  invalid: { icon: Link2Off, title: "We don't recognise this link", body: "It may be incomplete. Sign in with the number you use on WhatsApp instead." },
} as const;

export function LinkState({ status, token, purpose }: { status: "expired" | "used" | "invalid"; token?: string; purpose?: "signin" | "pay" | null }) {
  const c = COPY[status];
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function renew() {
    if (!token) return;
    setBusy(true);
    try {
      await renewLink(token);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[440px] rounded-2xl bg-card p-7 shadow-[0_0_0_1px_hsl(var(--border))]">
        <p className="font-serif text-[22px] tracking-wide text-primary">KIYOS</p>
        <c.icon className="mt-6 h-7 w-7 text-muted-foreground" />
        <h1 className="mt-3 text-[22px] font-semibold text-foreground">{c.title}</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{c.body}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {status === "expired" && token && (
            <button onClick={renew} disabled={busy || sent} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground disabled:opacity-70">
              <MessageCircle className="h-4 w-4" /> {sent ? "Sent. Check WhatsApp" : `Send me a new ${purpose === "pay" ? "payment " : ""}link`}
            </button>
          )}
          <Link href={status === "used" ? "/portal/overview" : "/portal/signin"} className="inline-flex h-10 items-center rounded-full border px-4 text-[14px] font-medium text-foreground hover:bg-muted">
            {status === "used" ? "Open my workspace" : "Sign in with a code"}
          </Link>
        </div>
      </div>
    </main>
  );
}
