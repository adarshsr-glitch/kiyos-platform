/**
 * Since your last visit: what the expert did on the case, read from the record (answers,
 * document reviews, requests, sign-offs). The headline is counted from the items; an answer
 * is "corrected" only when the expert's answer differs from Kiyos's draft, and the draft is
 * shown alongside so the customer sees what changed.
 */

import Link from "next/link";
import type { BriefItem, Briefing } from "@/lib/residency";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const day = (s: string) => formatDate(s, { day: "numeric", month: "short" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** "Sidhant corrected 1 answer, accepted 2 documents and asked for 4 more." */
function headline(items: BriefItem[], expert: string): string {
  const n = (k: BriefItem["kind"]) => items.filter((i) => i.kind === k).length;
  const parts = [
    n("corrected") && `corrected ${plural(n("corrected"), "answer")}`,
    n("answered") && `answered ${plural(n("answered"), "question")}`,
    n("confirmed") && `confirmed ${plural(n("confirmed"), "answer")} from Kiyos`,
    n("settled") && `settled ${plural(n("settled"), "tax question")}`,
    n("signed_off") && `signed off ${plural(n("signed_off"), "assessment")}`,
    n("estimate") && `updated ${plural(n("estimate"), "tax estimate")}`,
    n("saving") && `added ${plural(n("saving"), "way", "ways")} to save`,
    n("document_accepted") && `accepted ${plural(n("document_accepted"), "document")}`,
    n("document_returned") && `sent back ${plural(n("document_returned"), "document")}`,
    n("request") && `asked for ${plural(n("request"), "document")}`,
  ].filter(Boolean) as string[];
  return parts.length ? `${expert} ${join(parts)}.` : "";
}

type Row = { key: string; at: string; title: React.ReactNode; body?: React.ReactNode; href?: string | null; tone?: "change" };

/** Similar items close together read as one line: "Accepted 5 documents: …". */
function rows(items: BriefItem[]): Row[] {
  const out: Row[] = [];
  const grouped = (kind: BriefItem["kind"], verb: string, href: string) => {
    const list = items.filter((i) => i.kind === kind);
    if (!list.length) return;
    const names = list.map((i) => i.title);
    out.push({
      key: kind,
      at: list[0].at,
      title: list.length === 1 ? `${verb} ${names[0]}` : `${verb} ${list.length} documents`,
      body: list.length > 1 ? `${join(names.slice(0, 3))}${names.length > 3 ? ` and ${names.length - 3} more` : ""}` : list[0].detail,
      href: list.length === 1 ? list[0].href ?? href : href,
    });
  };
  for (const i of items) {
    if (i.kind === "corrected") {
      out.push({
        key: `t-${i.at}`,
        at: i.at,
        tone: "change",
        title: <>Corrected the answer to “{i.title}”</>,
        body: (
          <>
            <span className="block text-foreground">{i.detail}</span>
            {i.before && (
              <details className="mt-1.5 text-[12.5px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">What Kiyos had said</summary>
                <span className="mt-1 block text-muted-foreground line-through decoration-muted-foreground/40">{i.before}</span>
              </details>
            )}
          </>
        ),
      });
    } else if (i.kind === "answered" || i.kind === "confirmed") {
      out.push({ key: `t-${i.at}`, at: i.at, title: <>{i.kind === "answered" ? "Answered" : "Confirmed Kiyos's answer to"} “{i.title}”</>, body: i.detail });
    } else if (i.kind === "settled") {
      out.push({ key: `s-${i.title}`, at: i.at, title: `Settled: ${i.title}`, body: i.detail, href: i.href });
    } else if (i.kind === "estimate") {
      out.push({ key: `e-${i.title}-${i.at}`, at: i.at, title: `Updated your ${i.title}`, href: i.href });
    } else if (i.kind === "saving") {
      out.push({ key: `w-${i.title}-${i.at}`, at: i.at, tone: "change", title: `Added a way to save: ${i.title}`, href: i.href });
    } else if (i.kind === "signed_off") {
      out.push({ key: `a-${i.title}`, at: i.at, title: `Signed off: ${i.title}`, href: i.href });
    } else if (i.kind === "document_returned") {
      out.push({ key: `r-${i.title}-${i.at}`, at: i.at, title: `Sent back ${i.title}`, body: i.detail ?? "A new copy is needed.", href: i.href });
    }
  }
  grouped("document_accepted", "Accepted", "/portal/documents");
  grouped("request", "Asked for", "/portal/documents");
  // A correction changes something the customer was told, so it leads; the rest by date.
  return out.sort((a, b) => Number(b.tone === "change") - Number(a.tone === "change") || b.at.localeCompare(a.at));
}

export function SinceLastVisit({ briefing, expert, firstVisit, compact }: { briefing: Briefing; expert: string; firstVisit: boolean; /** One line per item; only a correction shows what changed. */ compact?: boolean }) {
  const first = expert.split(" ")[0];
  const fresh = briefing.items.length > 0;
  const list = rows(fresh ? briefing.items : briefing.recent);
  const when = firstVisit ? `since ${day(briefing.since)}` : `since your last visit on ${day(briefing.since)}`;

  return (
    <section aria-labelledby="h-since" className="rounded-2xl border bg-card">
      <header className="border-b px-5 py-4">
        <h2 id="h-since" className="text-[15px] font-semibold text-foreground">
          {fresh ? headline(briefing.items, first) : `Nothing new ${when}.`}
        </h2>
        <p className="text-[12.5px] text-muted-foreground">{fresh ? `What changed ${when}` : list.length ? "The most recent from your case" : null}</p>
      </header>
      {list.length > 0 && (
        <ul className="divide-y">
          {list.slice(0, compact ? 4 : 5).map((r) => {
            const inner = (
              <>
                <span className="flex items-baseline justify-between gap-4">
                  <span className={cn("text-[14px] font-medium leading-snug text-foreground", r.tone === "change" && "text-foreground")}>{r.title}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{day(r.at)}</span>
                </span>
                {r.body && (!compact || r.tone === "change") && <span className="mt-1 block text-[13.5px] leading-relaxed text-muted-foreground">{r.body}</span>}
              </>
            );
            return (
              <li key={r.key} className={cn(compact ? "px-5 py-2.5" : "px-5 py-3.5", r.tone === "change" && "border-l-2 border-l-primary")}>
                {r.href ? (
                  <Link href={r.href} className="block hover:opacity-80">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
