import { PageBar } from "@/components/page-header";
import {
  getCase,
  listMessages,
  listAuditLog,
  listCaseTickets,
  listCaseEvents,
  listDocumentRequests,
} from "@/lib/api";
import { CaseWorkspace } from "@/components/case-workspace";
import { ChatPanel } from "@/components/chat-panel";
import { getBrief, getResidency, listReadings } from "@/lib/residency";
import { pictureFromFacts, explainSplitYear } from "@/lib/financial-picture";
import { positionOf, STATUS_SHORT } from "@/lib/position";
import { formatDate } from "@/lib/format";
import { hasCaptain } from "@/lib/captain";
import { ReviewStack } from "@/components/case/review-stack";
import { ReplyAlert } from "@/components/case/expert-inbox";
import { CaseGantt } from "@/components/charts/case-gantt";
import { CaseActivity } from "@/components/case/case-activity";
import { CaseRail } from "@/components/case/case-rail";
import { ThreadSheet } from "@/components/case/thread-sheet";
import { ClampText } from "@/components/clamp-text";
import { UpNext } from "@/components/case/up-next";
import { CaseNotes } from "@/components/case/case-notes";
import { WorkingDetails } from "@/components/case/working-details";
import { IncomePicture } from "@/components/portal/home/income-picture";
import { CountryPosition } from "@/components/portal/home/country-position";
import { ExpertEntries } from "@/components/case/expert-entries";
import { listSavingOptions, listSavings } from "@/lib/residency";
import { estimatesOf } from "@/lib/position";
import { getDesk } from "@/lib/desk";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const c = await getCase(Number(params.id)).catch(() => null);
  return { title: c ? `${c.client_name} · Cases · Kiyos experts` : "Case · Kiyos experts" };
}

/**
 * The expert's individual case workspace: where the work on one customer happens.
 * Read top to bottom: who this is and where the case stands → "Up next": every action
 * on the case, one button each, and what's waiting on the customer → the item being
 * reviewed → the case picture (the same components the customer sees, so both sides read
 * one truth) → the expert's own entries → the working behind it, folded away. The rail
 * keeps the shared timeline, the thread and the notes.
 */

const REVIEW: Record<string, string> = {
  in_review: "In review",
  awaiting_customer: "Waiting on the customer",
  ready_for_signoff: "Ready for sign-off",
  signed_off: "Signed off",
};

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [caseData, auditLog, tickets, events, brief, residency, requests, readings] = await Promise.all([
    getCase(params.id),
    listAuditLog(params.id),
    listCaseTickets(params.id),
    listCaseEvents(params.id),
    getBrief(id).catch(() => null),
    getResidency(id).catch(() => null),
    listDocumentRequests(id).catch(() => []),
    listReadings(id).catch(() => []),
  ]);
  const messages = caseData.conversation_id ? await listMessages(caseData.conversation_id) : [];
  const [savings, savingOptions, desk] = await Promise.all([listSavings(id).catch(() => []), listSavingOptions().catch(() => []), getDesk(null, id).catch(() => null)]);

  const advisor = hasCaptain(caseData.case_captain) ? caseData.case_captain : "Kiyos team";
  const positions = { IN: positionOf(caseData, residency, "IN"), US: positionOf(caseData, residency, "US") };
  const split = explainSplitYear(pictureFromFacts(caseData.facts, caseData.members.map((m) => m.name)), caseData.facts);
  const household = caseData.members
    .map((m) => `${m.name.split(" ")[0]}${m.role === "primary" ? "" : m.role === "spouse" ? " (spouse)" : " (child)"}${m.visa_status ? `, ${m.visa_status}` : ""}`)
    .join(" · ");

  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Home", href: "/expert" }, { label: "Cases", href: "/expert/cases" }, { label: caseData.client_name }]}>
        <ThreadSheet customer={caseData.client_name}>
          {caseData.conversation_id ? (
            <ChatPanel conversationId={caseData.conversation_id} initialMessages={messages} caseClientName={caseData.client_name} advisorName={advisor} />
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversation yet.</p>
          )}
        </ThreadSheet>
      </PageBar>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1080px] space-y-8 px-4 pb-24 pt-6 sm:px-6">
            {/* ------------------------------------------------ who and where the case stands */}
            <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-foreground">{caseData.client_name}</h1>
                  {brief?.review_status && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-foreground">{REVIEW[brief.review_status] ?? brief.review_status}</span>}
                </div>
                {/* The summary folds to one line, so the work starts above the fold. */}
                <ClampText className="mt-1 max-w-[720px] text-[13px] text-muted-foreground" text={caseData.summary || caseData.name} />
                {household && <p className="mt-0.5 text-[13px] text-muted-foreground">{household}</p>}
              </div>
              <dl className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
                {(["IN", "US"] as const).map((c) => (
                  <div key={c}>
                    <dt className="text-[11.5px] text-muted-foreground">{c === "IN" ? "India" : "US"} now</dt>
                    <dd className="font-semibold text-foreground">{positions[c].status ? STATUS_SHORT[positions[c].status!] ?? positions[c].status : "Pending"}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[11.5px] text-muted-foreground">Next filing</dt>
                  <dd className="font-semibold text-foreground">
                    {[positions.IN, positions.US].filter((p) => p.due).sort((a, b) => a.due!.localeCompare(b.due!))[0]
                      ? formatDate([positions.IN, positions.US].filter((p) => p.due).sort((a, b) => a.due!.localeCompare(b.due!))[0].due, { day: "numeric", month: "short", year: "numeric" })
                      : "Not mapped"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11.5px] text-muted-foreground">Expert</dt>
                  <dd className="font-semibold text-foreground">{advisor}</dd>
                </div>
              </dl>
            </section>

            {/* ------------------------------------------------ what the customer just did, before anything else */}
            <ReplyAlert caseId={id} />

            {/* ------------------------------------------------ the case, as tabs: today's work first, then the full record */}
            <CaseWorkspace
              bare
              caseData={caseData}
              auditLog={auditLog}
              tickets={tickets}
              events={events}
              brief={null}
              residency={residency}
              today={
                <div className="space-y-8">
            {/* ------------------------------------------------ what needs the expert, and what's waiting on the customer */}
            {brief && (
              <UpNext brief={brief} tickets={tickets} readings={readings} items={caseData.action_items} advisor={advisor} customer={caseData.client_name} desk={desk ? { rows: desk.queue, today: desk.today } : null} />
            )}

            {/* ------------------------------------------------ what the customer sent: one card at a time */}
            <ReviewStack tickets={tickets} readings={readings} advisor={advisor} customer={caseData.client_name} />

            {/* ------------------------------------------------ the case picture */}
            <section aria-labelledby="h-picture" className="space-y-3">
              <h2 id="h-picture" className="text-[17px] font-semibold text-foreground">
                Case picture
                <span className="ml-2 text-[13px] font-normal text-muted-foreground">exactly what {caseData.client_name.split(" ")[0]} sees</span>
              </h2>
              <CountryPosition caseData={caseData} residency={residency} requests={requests} expert />
              {brief && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="mb-3 text-[14px] font-semibold text-foreground">Case timeline</h3>
                  <CaseGantt
                    stays={brief.stays}
                    india={brief.residency.india}
                    us={brief.residency.us}
                    deadlines={brief.deadlines}
                    returnDate={brief.stays.some((s) => !s.departed) ? null : residency?.facts.find((f) => f.key === "india_return_date")?.value ?? null}
                  />
                </div>
              )}
              <IncomePicture picture={split.items} move={split.move} />
            </section>

            {/* ------------------------------------------------ what only the expert enters */}
            <section aria-labelledby="h-entries" className="space-y-3">
              <h2 id="h-entries" className="text-[17px] font-semibold text-foreground">
                Tax figures and ways to save
                <span className="ml-2 text-[13px] font-normal text-muted-foreground">entered by you, shown to {caseData.client_name.split(" ")[0]}</span>
              </h2>
              <ExpertEntries caseId={id} advisor={advisor} customer={caseData.client_name} estimates={estimatesOf(caseData.facts)} savings={savings} options={savingOptions} />
            </section>

            {/* ------------------------------------------------ the working behind the picture, folded away */}
            {brief && (
              <WorkingDetails brief={brief} residency={residency} />
            )}

            {/* ------------------------------------------------ the rail, inline below xl (the rail is hidden) */}
            <section aria-labelledby="h-activity-inline" className="space-y-3 xl:hidden">
              <h2 id="h-activity-inline" className="text-[17px] font-semibold text-foreground">Case activity</h2>
              <div className="rounded-xl border bg-card p-4">
                <CaseActivity events={events} customer={caseData.client_name} />
              </div>
              {brief && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="mb-3 text-[14px] font-semibold text-foreground">Notes</h3>
                  <CaseNotes caseId={id} notes={brief.notes} />
                </div>
              )}
            </section>

                </div>
              }
            />
          </div>
        </main>

        <aside className="hidden w-[340px] shrink-0 border-l bg-background xl:block">
          <CaseRail
            activity={<CaseActivity events={events} customer={caseData.client_name} />}
            notes={brief ? <CaseNotes caseId={id} notes={brief.notes} /> : undefined}
            thread={
              caseData.conversation_id ? (
                <ChatPanel conversationId={caseData.conversation_id} initialMessages={messages} caseClientName={caseData.client_name} advisorName={advisor} />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No conversation yet.</p>
              )
            }
          />
        </aside>
      </div>
    </div>
  );
}
