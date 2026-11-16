import { MessageCircle } from "lucide-react";
import type { CaseDetail, CountryStatus, DocumentRequest, ProfileChange, Reviewer, Ticket } from "@/lib/types";
import { formatDate, initials, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whatsappHref } from "@/lib/whatsapp";
import { ArrowLink, COUNTRY, PageHeader, Section } from "./kit";
import { NeedsYou, type Todo } from "./needs-you";
import { profileLabel } from "./profile-labels";

interface Work {
  id: string;
  title: string;
  owner: string;
  next: string | null;
  note?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function addBusinessDay(iso: string) {
  const d = new Date(iso);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString();
}

/**
 * PRD §6 Overview, ordered per Review 02 (CD-03): what needs you, where you stand, what Kiyos is
 * doing, then filing deadlines. Desktop adds a side panel with the team and deadlines.
 */
export function Overview({
  caseData,
  requests,
  changes,
  tickets,
}: {
  caseData: CaseDetail;
  requests: DocumentRequest[];
  changes: ProfileChange[];
  tickets: Ticket[];
}) {
  const first = caseData.client_name.split(" ")[0];
  const lead = caseData.case_captain;

  const todos: (Todo & { urgent: boolean })[] = [
    ...changes
      .filter((c) => c.status === "proposed")
      .map((c) => ({
        id: `change-${c.id}`,
        title: "Confirm a change to your details",
        detail: `${profileLabel(c.fact_key)}: ${formatValue(c.fact_key, c.proposed_value)}, from your WhatsApp message on ${formatDate(c.created_at, { day: "numeric", month: "short" })}`,
        why: c.affects,
        due: null,
        cta: "Review change",
        task: { kind: "confirm" as const, change: c },
        urgent: true,
      })),
    ...requests
      .filter((r) => r.status === "pending" || r.status === "rejected")
      .map((r) => ({
        id: `req-${r.id}`,
        title: r.title,
        detail: r.status === "rejected" ? r.rejection_reason : null,
        why: r.why,
        due: r.due_date,
        country: r.country,
        rejected: r.status === "rejected",
        cta: r.status === "rejected" ? "Upload new copy" : "Upload",
        task: { kind: "upload" as const, request: r },
        urgent: r.status === "rejected",
      })),
    ...caseData.action_items
      .filter((i) => i.assignee === "customer" && i.status !== "done")
      .filter((i) => !requests.some((r) => i.title.toLowerCase().includes(r.title.toLowerCase().split(" ")[0])))
      .map((i) => ({
        id: `item-${i.id}`,
        title: i.title,
        detail: i.status === "blocked" ? "Waiting on something else first" : i.notes,
        due: i.due_date,
        cta: "Reply on WhatsApp",
        href: whatsappHref,
        urgent: false,
      })),
  ];
  todos.sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const work: Work[] = [
    ...tickets
      .filter((t) => t.status === "open")
      .map((t) => ({
        id: `ticket-${t.id}`,
        title: `Your question: “${t.question}”`,
        owner: t.owner ?? lead,
        next: t.sla_due_at,
        note: "Reviewed answer on WhatsApp",
      })),
    ...caseData.topics
      .filter((t) => t.status !== "resolved" && t.owner && !t.owner.startsWith(first))
      .map((t) => ({ id: `topic-${t.id}`, title: t.title, owner: t.owner!, next: t.due_date, note: t.next_action ?? undefined })),
    ...caseData.action_items
      .filter((i) => i.assignee !== "customer" && i.status !== "done")
      .map((i) => ({ id: `ai-${i.id}`, title: i.title, owner: i.owner ?? lead, next: i.due_date })),
  ];
  if (work.length === 0 && caseData.activated_at) {
    work.push({
      id: "kickoff",
      title: "Turning your initial scan into a checklist and plan",
      owner: lead,
      next: addBusinessDay(caseData.activated_at),
      note: "First update on WhatsApp",
    });
  }

  const status = caseData.country_status ?? {};
  // CD-04: statutory and filing dates only. Document due dates stay on their task rows, and a
  // filing deadline is never pushed off the list by a cap.
  const deadlines = (["IN", "US"] as const)
    .filter((c) => status[c] && status[c]!.due >= today())
    .map((c) => ({ date: status[c]!.due, country: c, filing: status[c]!.filing }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextDeadline = [...todos.map((t) => t.due), ...deadlines.map((d) => d.date)]
    .filter((d): d is string => !!d && d >= today())
    .sort()[0];

  const team = teamOf(caseData.reviewers, lead);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${first}`}
        meta={
          <>
            <span className="font-semibold text-foreground">
              {todos.length ? `${todos.length} thing${todos.length > 1 ? "s" : ""} need${todos.length > 1 ? "" : "s"} you` : "Nothing needs you"}
            </span>
            {nextDeadline && ` · next deadline ${formatDate(nextDeadline, { day: "numeric", month: "short" })}`}
          </>
        }
      />

      <ExpertLine lead={team.lead} className="-mt-2 mb-5 lg:hidden" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <NeedsYou todos={todos} caseId={caseData.id} by={caseData.client_name} lead={lead} />

          <Section title="Your position" action={<ArrowLink href="/portal/assessment">Tax position</ArrowLink>} flush>
            <ul className="divide-y sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {(["IN", "US"] as const).map((c) => (
                <PositionRow key={c} code={c} status={status[c]} reviewers={caseData.reviewers} lead={lead} />
              ))}
            </ul>
          </Section>

          <Section title="Kiyos is on it" count={work.length} flush>
            <ul className="divide-y">
              {work.map((w) => (
                <li key={w.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary" title={w.owner}>
                    {initials(w.owner)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-foreground">{w.title}</p>
                    <p className="line-clamp-1 text-[12.5px] text-muted-foreground">
                      {w.owner}
                      {w.note ? ` · ${w.note}` : ""}
                    </p>
                  </div>
                  {w.next && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">Next update</p>
                      <p className={cn("text-xs font-medium tabular-nums", w.next.slice(0, 10) < today() ? "text-rose-600" : "text-foreground")}>
                        {formatDate(w.next, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Deadlines deadlines={deadlines} className="lg:hidden" />
        </div>

        <aside className="hidden space-y-5 lg:block">
          <TeamPanel team={team} />
          <Deadlines deadlines={deadlines} />
        </aside>
      </div>
    </div>
  );
}

type Member = Pick<Reviewer, "name" | "qualification">;

/** PRD §9: customers see the lead expert and the India and US reviewers, with qualifications. */
function teamOf(reviewers: Reviewer[] | null, lead: string) {
  const find = (pred: (r: Reviewer) => boolean) => reviewers?.find(pred) ?? null;
  return {
    lead: find((r) => r.role === "Lead tax expert") ?? { name: lead, qualification: "" },
    india: find((r) => r.country === "IN" && r.role !== "Lead tax expert"),
    us: find((r) => r.country === "US" && r.role !== "Lead tax expert"),
  };
}

function ExpertLine({ lead, className }: { lead: Member; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
        {initials(lead.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{lead.name} · your lead expert</p>
        <p className="text-[13px] text-muted-foreground">Replies within 1 business day</p>
      </div>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Message ${lead.name} on WhatsApp`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-primary hover:bg-muted"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}

function TeamPanel({ team }: { team: ReturnType<typeof teamOf> }) {
  return (
    <Section title="Your Kiyos team">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials(team.lead.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{team.lead.name}</p>
          <p className="text-[13px] text-muted-foreground">
            Lead expert{team.lead.qualification ? ` · ${team.lead.qualification}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">Owns your case. Replies within 1 business day. Includes a call every quarter.</p>
      {(team.india || team.us) && (
        <ul className="mt-3 space-y-1.5 border-t pt-3 text-[13px]">
          {[
            { who: team.india, label: "India reviewer" },
            { who: team.us, label: "US reviewer" },
          ].map(
            ({ who, label }) =>
              who && (
                <li key={label}>
                  <span className="block font-medium text-foreground">{who.name}</span>
                  <span className="text-muted-foreground">
                    {label}
                    {who.qualification ? ` · ${who.qualification}` : ""}
                  </span>
                </li>
              )
          )}
        </ul>
      )}
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Message on WhatsApp
        </a>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">Message your team any time on WhatsApp.</p>
      )}
    </Section>
  );
}

/** CD-08 (Home half): one compact row per country; the full panels live on Tax position. */
function PositionRow({
  code,
  status,
  reviewers,
  lead,
}: {
  code: "IN" | "US";
  status?: CountryStatus;
  reviewers: Reviewer[] | null;
  lead: string;
}) {
  // CD-01: name the reviewer of this country, or say plainly that nobody has yet.
  const reviewer = status?.reviewed_by ? reviewers?.find((r) => r.name === status.reviewed_by) : null;
  return (
    <li className="flex gap-3 px-5 py-3.5">
      <span className="mt-0.5 flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
        {code}
      </span>
      {status ? (
        <div className="min-w-0 space-y-0.5 text-[13px]">
          <p className="text-[14px] font-semibold text-foreground">
            {status.status} · {status.year}
          </p>
          <p className="text-muted-foreground">
            {status.filing} due {formatDate(status.due, { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="text-muted-foreground">Stage: {status.state.toLowerCase()}</p>
          <p className={status.reviewed_by ? "text-foreground" : "text-muted-foreground"}>
            {status.reviewed_by
              ? `Reviewed by ${status.reviewed_by}${reviewer?.qualification ? `, ${reviewer.qualification}` : ""}`
              : "Not yet reviewed"}
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {lead} is working out your position in {COUNTRY[code].name}. You&apos;ll see it here once it&apos;s reviewed.
        </p>
      )}
    </li>
  );
}

function Deadlines({ deadlines, className }: { deadlines: { date: string; country: "IN" | "US"; filing: string }[]; className?: string }) {
  return (
    <Section title="Upcoming deadlines" className={className} flush>
      {deadlines.length === 0 ? (
        <p className="px-5 py-3 text-[13px] text-muted-foreground">Your filing deadlines appear here once your expert maps your returns.</p>
      ) : (
        <ol className="divide-y">
          {deadlines.map((d) => (
            <li key={d.country} className="flex gap-3 px-5 py-3">
              <span className="w-14 shrink-0 tabular-nums">
                <span className="block text-sm font-semibold text-foreground">{formatDate(d.date, { day: "numeric", month: "short" })}</span>
                <span className="text-xs text-muted-foreground">{d.date.slice(0, 4)}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{COUNTRY[d.country].name} return due</span>
                <span className="text-[13px] text-muted-foreground">
                  {d.filing} · {relativeDays(d.date)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function formatValue(key: string, value: string) {
  return /date|return/.test(key) ? formatDate(value, { day: "numeric", month: "long", year: "numeric" }) ?? value : value;
}
