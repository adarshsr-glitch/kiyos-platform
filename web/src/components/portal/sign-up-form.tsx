"use client";

/**
 * Web sign-up: name, WhatsApp number and (optionally) email, checked as you go. A number that
 * already has an account is caught and sent to sign-in. On success Kiyos messages the customer
 * on WhatsApp to start the free check, as if they'd messaged first.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { FieldError, signUp } from "@/lib/residency";
import { cn } from "@/lib/utils";

const input = "h-11 w-full rounded-lg border bg-background px-3 text-[15px] outline-none focus:border-primary";

export function SignUpForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", code: "+91" as "+91" | "+1", number: "", email: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<number | null>(null);
  const [done, setDone] = useState<{ caseId: number; phone: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function check() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter your full name";
    if (f.number.replace(/\D/g, "").length !== 10) e.number = "Enter a 10-digit WhatsApp number";
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = "That email doesn't look right";
    if (!f.consent) e.consent = "Please accept the terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setExisting(null);
    if (!check()) return;
    setBusy(true);
    try {
      const r = await signUp({ name: f.name, country_code: f.code, number: f.number, email: f.email || null, consent: f.consent });
      document.cookie = `kiyos-case=${r.case_id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
      setDone({ caseId: r.case_id, phone: r.phone });
    } catch (e) {
      if (e instanceof FieldError) {
        if (e.caseId) setExisting(e.caseId);
        setErrors(e.field ? { [e.field]: e.message } : { form: e.message });
      }
    } finally {
      setBusy(false);
    }
  }
  function signInInstead() {
    if (existing) document.cookie = `kiyos-case=${existing}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.push("/portal/signin");
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-12 sm:items-center">
      <div className="w-full max-w-[440px]">
        <p className="font-serif text-[22px] tracking-wide text-primary">KIYOS</p>
        {done ? (
          <section className="mt-5 rounded-2xl bg-card p-7 shadow-[0_0_0_1px_hsl(var(--border))]">
            <CheckCircle2 className="h-8 w-8 text-emerald-700" />
            <h1 className="mt-3 text-[22px] font-semibold text-foreground">You&apos;re in, {f.name.split(" ")[0]}</h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">We&apos;ve messaged you on WhatsApp at {done.phone} to start your free five-minute check. Your answers become your Kiyos record.</p>
            <Link href="/portal/whatsapp" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-primary-foreground">
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-2xl bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border))] sm:p-7">
            <div>
              <h1 className="text-[22px] font-semibold text-foreground">Create your Kiyos account</h1>
              <p className="mt-1 text-[14px] text-muted-foreground">Your WhatsApp number is your account. No password.</p>
            </div>
            <Field label="Full name" error={errors.name}>
              <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label="WhatsApp number" error={errors.number}>
              <div className="flex gap-2">
                <select className={cn(input, "w-[92px] shrink-0")} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value as "+91" | "+1" })}>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <input className={input} inputMode="tel" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} autoComplete="tel-national" />
              </div>
              {existing && (
                <button type="button" onClick={signInInstead} className="mt-1.5 text-[13px] font-medium text-primary hover:underline">
                  Sign in with this number instead →
                </button>
              )}
            </Field>
            <Field label="Email (optional)" error={errors.email}>
              <input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
            </Field>
            <label className="flex items-start gap-2.5 text-[13.5px] text-foreground">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
              <span>
                I agree to the Kiyos terms and privacy notice, and to be contacted on WhatsApp.
                {errors.consent && <span className="block text-[12.5px] text-rose-700">{errors.consent}</span>}
              </span>
            </label>
            {errors.form && <p className="text-[13px] text-rose-700">{errors.form}</p>}
            <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-[15px] font-medium text-primary-foreground disabled:opacity-70">
              {busy ? "Creating your account…" : "Create account"}
            </button>
            <p className="text-center text-[13px] text-muted-foreground">
              Already with Kiyos?{" "}
              <Link href="/portal/signin" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12.5px] text-rose-700">{error}</span>}
    </div>
  );
}
