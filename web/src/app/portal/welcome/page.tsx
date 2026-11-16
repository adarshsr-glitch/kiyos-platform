import Link from "next/link";
import { redirect } from "next/navigation";
import { FileLock2, ListChecks, MapPinned, MessageCircle, Tag } from "lucide-react";
import { getCase, getConversation } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { CountryTag, Pill } from "@/components/portal/kit";

const EXAMPLE_ROWS = [
  { country: "IN" as const, area: "Residency", finding: "You may qualify as RNOR for your first years back", input: "10 years or more", tone: "green" as const },
  { country: "BOTH" as const, area: "Retirement accounts", finding: "Your 401(k) needs a plan for Indian tax and Form 10-EE", input: "Yes", tone: "green" as const },
  { country: "US" as const, area: "Foreign accounts", finding: "Indian accounts may need FBAR/FATCA reporting", input: "Moving back to India", tone: "green" as const },
];

/** Before a case exists: the five-minute check runs in WhatsApp, value before sign-up. */
export default async function WelcomePage() {
  const caseData = await getCase(portalCaseId());
  if (tierOf(caseData) !== "onboarding") redirect("/portal");
  const convo = caseData.conversation_id ? await getConversation(caseData.conversation_id) : null;
  const progress = convo?.intake_progress ?? { answered: 0, total: 8 };
  const pct = Math.round((progress.answered / Math.max(progress.total, 1)) * 100);

  return (
    <div className="mx-auto max-w-3xl lg:mx-0">
      <p className="text-xs font-medium text-muted-foreground">Free · about five minutes · on WhatsApp</p>
      <h1 className="mt-2 font-serif text-[34px] font-medium leading-[1.12] tracking-tight text-foreground sm:text-[42px]">
        Tell us what&apos;s changing.
        <br />
        <span className="text-primary">We&apos;ll map it across India and the US.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        No forms and no tax jargon — answer a few questions in the chat and you&apos;ll see what likely
        needs attention in each country, before you share any contact details.
      </p>

      <div className="mt-6 flex max-w-md items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[#00a884] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {progress.answered} of {progress.total} answered
        </span>
      </div>
      <Link
        href="/portal/chat"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#00a884] px-5 py-2.5 text-sm font-medium text-white shadow-sm lg:hidden"
      >
        <MessageCircle className="h-4 w-4" />
        {progress.answered ? "Continue on WhatsApp" : "Start on WhatsApp"}
      </Link>
      <p className="mt-3 hidden text-sm text-foreground lg:block">
        {progress.answered ? "Pick up where you left off in the chat →" : "Answer the first question in the chat →"}
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.15fr] md:items-start">
        <ul className="space-y-5">
          {[
            { icon: MapPinned, title: "A risk map for both countries", body: "Every line shows which of your answers it came from." },
            { icon: ListChecks, title: "What we still need to know", body: "Said plainly — 'not sure' is always an allowed answer." },
            { icon: Tag, title: "An indicative price", body: "For the two plans, before you sign up for anything." },
            { icon: FileLock2, title: "Nothing sensitive in chat", body: "Documents and ID numbers only ever go to your secure workspace." },
          ].map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <figure className="rounded-2xl border bg-card p-1.5 shadow-sm">
          <div className="flex items-center justify-between px-3 pb-2 pt-2">
            <span className="text-[13px] font-semibold text-foreground">What you&apos;ll get</span>
            <Pill tone="gray">Example</Pill>
          </div>
          <ul className="divide-y rounded-xl bg-muted/40">
            {EXAMPLE_ROWS.map((r) => (
              <li key={r.area} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{r.area}</span>
                  <CountryTag code={r.country} />
                </div>
                <p className="mt-0.5 text-sm text-foreground">{r.finding}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Because you said <span className="rounded bg-background px-1.5 py-0.5 text-foreground">“{r.input}”</span>
                </p>
              </li>
            ))}
          </ul>
          <figcaption className="px-3 py-2 text-[11px] text-muted-foreground">
            A first scan from your answers — not a personal tax opinion.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
