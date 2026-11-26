"use client";

/** Prototype housing: the only place journeys are chosen. Each starts a fresh persona on the real product. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEYS, type Journey } from "./journeys";
import { startJourney } from "./journey-bar";
import { RecordingReset } from "./recording-reset";

export function Housing() {
  const customer = JOURNEYS.filter((j) => j.side === "customer");
  const expert = JOURNEYS.filter((j) => j.side === "expert");
  return (
    <div className="min-h-screen bg-[#eef0ec]">
      <header className="bg-[#14201b] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="brand-wordmark text-lg uppercase text-[#9ef0bf]">Kiyos</p>
          <h1 className="mt-3 max-w-2xl font-serif text-3xl font-medium leading-tight sm:text-4xl">See the product through the people who use it</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Each journey starts a fresh demo customer and runs on the real product: the live Kiyos agent, real calculations, real records. A small bar at the top suggests what to try.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <RecordingReset />
        <Group title="Customers" icon={<MessageCircle className="h-4 w-4" />} note="WhatsApp is the front door; the workspace is where dates, money and documents go.">
          {customer.map((j, i) => <Card key={j.key} j={j} n={i + 1} />)}
        </Group>
        <Group title="Experts" icon={<Briefcase className="h-4 w-4" />} note="Kiyos's tax experts work from a separate workspace, starting from a brief the agent prepared.">
          {expert.map((j, i) => <Card key={j.key} j={j} n={customer.length + i + 1} />)}
        </Group>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-muted-foreground sm:px-6">
        For the team: explore without a journey. <Link href="/portal" className="text-primary hover:underline">Customer portal</Link> ·{" "}
        <Link href="/expert" className="text-primary hover:underline">Expert workspace</Link>.
      </footer>
    </div>
  );
}

function Group({ title, icon, note, children }: { title: string; icon: React.ReactNode; note: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#14201b]/70">{icon}{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Card({ j, n }: { j: Journey; n: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      router.push(await startJourney(j.key));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start. Is the API running?");
      setBusy(false);
    }
  };
  return (
    <button onClick={start} disabled={busy} className="group flex flex-col rounded-2xl border bg-card p-5 text-left transition-shadow hover:shadow-md disabled:opacity-70">
      <div className="flex w-full items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Journey {n}</p>
          <h3 className="mt-0.5 text-lg font-semibold">{j.persona}</h3>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", j.side === "customer" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800")}>{j.role}</span>
      </div>
      <dl className="mt-3 space-y-1.5 text-[13px]">
        <div><dt className="inline text-muted-foreground">Relationship: </dt><dd className="inline">{j.relationship}</dd></div>
        <div><dt className="inline text-muted-foreground">Starts: </dt><dd className="inline">{j.start}</dd></div>
      </dl>
      <p className="mt-3 text-sm">{j.demonstrates}</p>
      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[13px]"><span className="font-medium">Outcome: </span>{j.outcome}</p>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <span className="mt-auto flex w-full items-center justify-between pt-4 text-sm font-semibold text-primary">
        {busy ? <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Preparing a fresh demo customer…</span> : <>Start · {j.steps.length} steps</>}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
