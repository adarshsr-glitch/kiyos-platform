"use client";

/**
 * Expert sign-in (Kiyos work email, then a one-time code) and sign-up (name, work email,
 * qualification). The signed-in expert is shown in the expert workspace's side rail.
 * Prototype: any six digits work as the code.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { expertCode, expertSignIn, expertSignUp, FieldError, type Expert } from "@/lib/residency";

const input = "h-11 w-full rounded-lg border bg-background px-3 text-[15px] outline-none focus:border-primary";
export const EXPERT_COOKIE = "kiyos-expert";

function remember(e: Expert) {
  document.cookie = `${EXPERT_COOKIE}=${encodeURIComponent(JSON.stringify(e))}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
}

export function ExpertAuth({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [qual, setQual] = useState("CA");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof FieldError || e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (mode === "signup")
      return run(async () => {
        const e = await expertSignUp({ name, email, qualification: qual });
        remember(e);
        router.push("/expert");
      });
    if (!sent) return run(async () => void (await expertCode(email), setSent(true)));
    return run(async () => {
      const e = await expertSignIn(email, code);
      remember(e);
      router.push("/expert");
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] space-y-4 rounded-2xl bg-card p-7 shadow-[0_0_0_1px_hsl(var(--border))]">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">K</span> Kiyos experts
        </p>
        <h1 className="text-[22px] font-semibold text-foreground">{mode === "signup" ? "Create your expert account" : "Sign in to the expert workspace"}</h1>
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted-foreground">Full name</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted-foreground">Kiyos work email</span>
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kiyos.example" disabled={sent} />
        </label>
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted-foreground">Qualification</span>
            <select className={input} value={qual} onChange={(e) => setQual(e.target.value)}>
              {["CA", "EA", "CPA", "CA, EA", "Other"].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </label>
        )}
        {sent && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted-foreground">Six-digit code sent to {email}</span>
            <input className={input} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            <span className="mt-1 block text-[12px] text-muted-foreground">Prototype: any six digits work.</span>
          </label>
        )}
        {error && <p className="text-[13px] text-rose-700">{error}</p>}
        <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-primary-foreground disabled:opacity-70">
          <Briefcase className="h-4 w-4" />
          {mode === "signup" ? "Create account" : sent ? "Sign in" : "Send me a code"}
        </button>
        <p className="text-center text-[13px] text-muted-foreground">
          {mode === "signup" ? "Already have an account? " : "New to the team? "}
          <Link href={mode === "signup" ? "/expert/signin" : "/expert/signup"} className="font-medium text-primary hover:underline">
            {mode === "signup" ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
