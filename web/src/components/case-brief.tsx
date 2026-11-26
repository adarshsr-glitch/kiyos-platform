"use client";

/**
 * The expert's head start: what the Kiyos agent has prepared on this case. Facts are
 * checked against documents, discrepancies are found by calculation, gaps become
 * suggested document requests, and drafted answers wait for review. Every action
 * here writes a real record (request, note, clarification, status).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSearch, FileText, Lock, MessageSquareText, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { reviewAssessment } from "@/lib/api";
import { addNote, askClarification, requestDocuments, setReviewStatus, type Brief, type Residency } from "@/lib/residency";
import { ResidencyClock } from "@/components/charts/residency-clock";
import { SideSheet } from "@/components/side-sheet";
import { MoneyChart } from "@/components/charts/money-chart";
import { CaseGantt } from "@/components/charts/case-gantt";
import { EvidenceMatrix } from "@/components/charts/evidence-matrix";
import { DocumentReader } from "@/components/document-reader";

const STATUS_LABEL: Record<Brief["review_status"], string> = {
  in_review: "In review",
  awaiting_customer: "Awaiting customer",
  ready_for_signoff: "Ready for sign-off",
  signed_off: "Signed off",
};

function Box({ title, icon, children, right, tone }: { title: string; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; tone?: "warn" }) {
  return (
    <section className={cn("rounded-xl border bg-card", tone === "warn" && "border-amber-300")}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">{icon}{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** `lean`: inside the case workspace, where the money and headline numbers are already shown above. */
export function CaseBrief({ brief, residency, advisor, lean, noTimeline }: { brief: Brief; residency: Residency | null; advisor: string; lean?: boolean; /** The case page shows the timeline in the case picture. */ noTimeline?: boolean }) {
  const router = useRouter();
  const first = brief.client_name.split(" ")[0];
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<string[]>(brief.suggested_requests.map((s) => s.title));
  const d0 = brief.discrepancies[0];
  const clean = (v: string | number) => String(v).replace(/\s*\([^)]*\)\s*$/, "");
  const travel = !!d0 && /trip|days in india/i.test(d0.title);
  const [note, setNote] = useState(
    d0 ? `${d0.title}: ${d0.stated_source} says ${clean(d0.stated)}; ${d0.found_source} shows ${clean(d0.found)}. ${d0.effect}` : ""
  );
  const [question, setQuestion] = useState(
    d0
      ? travel
        ? /^\d+$/.test(clean(d0.found))
          ? `Your passport stamps show ${clean(d0.found)} days in India in ${d0.title.replace(/^Days in India, /, "")}, but you told us ${clean(d0.stated)}. Could you confirm which is right, or tell us about any trips we're missing?`
          : `Your passport shows ${clean(d0.found)}, but you told us ${clean(d0.stated)}. Could you confirm which is right, or tell us about any trips we're missing?`
        : `The document you sent (${d0.found_source}) shows ${clean(d0.found)} for your ${d0.title}, but you told us ${clean(d0.stated)}. Could you confirm which is right? If something has changed, tell us what.`
      : ""
  );
  const [entries, setEntries] = useState<[string, string][] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  const allowed: Brief["review_status"][] = ["in_review", "awaiting_customer", "ready_for_signoff"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        <span className="text-[13px] text-muted-foreground">Prepared by Kiyos for {advisor.split(" ")[0]} · everything below is calculated from the case records</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {allowed.map((s) => {
            const blocked = s === "ready_for_signoff" && !brief.can_sign_off;
            return (
              <button
                key={s}
                disabled={blocked || busy !== null}
                onClick={() => run("status", () => setReviewStatus(brief.case_id, s), `Status: ${STATUS_LABEL[s]}`)}
                title={blocked ? brief.blockers.join("; ") : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-40",
                  brief.review_status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      {!lean && <Kpis brief={brief} />}

      {residency && residency.india.length > 0 && (
        <Box title="Residency, calculated from the travel record" icon={<CheckCircle2 className="h-4 w-4 text-primary" />}>
          <ResidencyClock data={residency} namedReviewers />
        </Box>
      )}

      {!noTimeline && <Box title="Case timeline" icon={<FileText className="h-4 w-4" />}>
        <CaseGantt
          stays={brief.stays}
          india={brief.residency.india}
          us={brief.residency.us}
          deadlines={brief.deadlines}
          returnDate={brief.stays.some((s) => !s.departed) ? null : residency?.facts.find((f) => f.key === "india_return_date")?.value ?? null}
        />
      </Box>}

      {lean && (
        <div className="flex justify-end">
          <button onClick={() => setUploadOpen(true)} className="rounded-md border px-2.5 py-1 text-[12px] font-medium hover:bg-muted">Add a document for {first}</button>
        </div>
      )}

      {!lean && brief.holdings.length > 0 && (
        <Box
          title="Where the money is"
          icon={<FileText className="h-4 w-4" />}
          right={<button onClick={() => setUploadOpen(true)} className="rounded-md border px-2.5 py-1 text-[12px] font-medium hover:bg-muted">Add a document for {first}</button>}
        >
          <MoneyChart holdings={brief.holdings} />
        </Box>
      )}

      {brief.evidence.length > 0 && (
        <Box title="Evidence behind the assessment" icon={<CheckCircle2 className="h-4 w-4" />}>
          <EvidenceMatrix rows={brief.evidence} />
        </Box>
      )}

      {brief.discrepancies.length > 0 && (
        <Box title={`Doesn't match (${brief.discrepancies.length})`} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} tone="warn">
          <ul className="space-y-4">
            {brief.discrepancies.map((d) => (
              <li key={d.id} className="text-sm">
                <p className="font-semibold">{d.title}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Told us · {d.stated_source}</p>
                    <p className="mt-1 text-lg font-semibold">{d.stated}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-amber-900/70">Document · {d.found_source}</p>
                    <p className="mt-1 text-lg font-semibold text-amber-950">{d.found}</p>
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">{d.effect}</p>
                {d.entries && (
                  <button onClick={() => setEntries(d.entries)} className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-primary">
                    <FileSearch className="h-4 w-4" /> See the passport entries
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Box>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {(
          <Box title={`Ask ${first}`} icon={<MessageSquareText className="h-4 w-4" />}>
            {brief.clarifications.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {brief.clarifications.map((c) => (
                  <li key={c.id} className="rounded-lg bg-muted/50 p-3">
                    “{c.title}”<span className="mt-1 block text-xs text-muted-foreground">Sent on WhatsApp · waiting for {first}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={`Ask ${first} for information or a decision. It appears in their workspace and on WhatsApp.`} className="h-24 w-full rounded-lg border p-2.5 text-sm" />
                <button
                  disabled={!question.trim() || busy !== null}
                  onClick={() => run("ask", () => askClarification(brief.case_id, question), `Sent to ${first} on WhatsApp`)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" /> Send to {first}
                </button>
                <p className="mt-1.5 text-xs text-muted-foreground">Goes to {first}&apos;s WhatsApp thread and holds sign-off until answered.</p>
              </>
            )}
          </Box>
        )}

        <Box title="Notes (experts only)" icon={<StickyNote className="h-4 w-4" />}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="An observation for the case file" className="h-24 w-full rounded-lg border p-2.5 text-sm" />
          <button
            disabled={!note.trim() || busy !== null}
            onClick={() => run("note", async () => { await addNote(brief.case_id, note); setNote(""); }, "Note saved")}
            className="mt-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
          >
            Save note
          </button>
          {brief.notes.length > 0 && (
            <ul className="mt-3 space-y-2 border-t pt-3 text-[13px]">
              {brief.notes.map((n) => (
                <li key={n.id}><span className="text-muted-foreground">{n.author}:</span> {n.body}</li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      {(brief.gaps.length > 0 || brief.suggested_requests.length > 0) && (
        <Box title="Gaps before sign-off" icon={<FileText className="h-4 w-4" />}>
          <ul className="space-y-2 text-sm">
            {brief.gaps.map((g) => (
              <li key={g.label} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>{g.label}<span className="block text-[12.5px] text-muted-foreground">{g.why}</span></span></li>
            ))}
          </ul>
          {brief.suggested_requests.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-[13px] font-semibold">Suggested document requests</p>
              <ul className="space-y-2">
                {brief.suggested_requests.map((s) => (
                  <li key={s.title}>
                    <label className="flex cursor-pointer gap-3 rounded-lg border p-3 text-sm">
                      <input type="checkbox" className="mt-1" checked={pick.includes(s.title)} onChange={() => setPick((p) => (p.includes(s.title) ? p.filter((x) => x !== s.title) : [...p, s.title]))} />
                      <span><span className="font-medium">{s.title}</span><span className="block text-[12.5px] text-muted-foreground">Why: {s.why}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                disabled={!pick.length || busy !== null}
                onClick={() => run("req", () => requestDocuments(brief.case_id, brief.suggested_requests.filter((s) => pick.includes(s.title))), `Requested ${pick.length} document${pick.length > 1 ? "s" : ""} on WhatsApp`)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Request on WhatsApp
              </button>
            </div>
          )}
        </Box>
      )}

      {brief.requests.length > 0 && (
        <Box title="Documents requested" icon={<FileText className="h-4 w-4" />}>
          <ul className="divide-y text-sm">
            {brief.requests.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2"><span>{r.title}</span><span className="shrink-0 text-xs text-muted-foreground">{r.status}{r.due_date ? ` · due ${r.due_date}` : ""}</span></li>
            ))}
          </ul>
        </Box>
      )}

      {brief.drafts.length > 0 && (
        <Box title="Drafted by Kiyos, waiting for you" icon={<MessageSquareText className="h-4 w-4" />}>
          <ul className="space-y-3 text-sm">
            {brief.drafts.map((t) => (
              <li key={t.title} className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium">{t.title}</p>
                {t.draft && <p className="mt-1 text-muted-foreground">“{t.draft}”</p>}
                {t.rules?.length ? <p className="mt-1 text-xs text-muted-foreground">Based on: {t.rules.join(", ")}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">Review and send: {t.where}.</p>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {brief.assessment && (
        <Box title="Sign-off" icon={<Lock className="h-4 w-4" />}>
          <p className="text-sm">{brief.assessment.headline} <span className="text-muted-foreground">· {brief.assessment.status.replace("_", " ")}</span></p>
          <button
            disabled={!brief.can_sign_off || brief.assessment.status === "signed_off" || busy !== null}
            onClick={() => run("sign", () => reviewAssessment(brief.assessment!.id, "sign_off", advisor), "Assessment signed off")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Lock className="h-4 w-4" /> Sign off assessment
          </button>
          {!brief.can_sign_off && <p className="mt-2 text-xs text-muted-foreground">Blocked until {first} answers: {brief.clarifications.map((c) => `“${c.title}”`).join("; ")}</p>}
        </Box>
      )}

      <SideSheet open={uploadOpen} onClose={() => { setUploadOpen(false); router.refresh(); }} title={`Add a document for ${first}`} eyebrow="Received by email or in person">
        <DocumentReader caseId={brief.case_id} docType={null} by={advisor} onDone={() => router.refresh()} />
      </SideSheet>
      <SideSheet open={!!entries} onClose={() => setEntries(null)} title="Passport entry and exit stamps">
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {(entries ?? []).map(([k, d]) => (
              <tr key={k + d}><td className="py-2 text-muted-foreground">{k}</td><td className="py-2 text-right">{new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">These are the stays the Residency Clock counts.</p>
      </SideSheet>
    </div>
  );
}

function Kpis({ brief }: { brief: Brief }) {
  const now = new Date().toISOString().slice(0, 10);
  const next = brief.deadlines.find((d) => d.date >= now);
  const days = next ? Math.round((new Date(next.date).getTime() - Date.now()) / 864e5) : null;
  const backed = brief.evidence.filter((e) => e.accepted || e.read).length;
  const cur = brief.residency.india.find((y) => y.current);
  const tiles = [
    { label: "India status now", value: cur ? cur.status : "—", sub: cur ? `${cur.year} · ${cur.days} days` : "No travel record" },
    { label: "Evidence", value: `${backed}/${brief.evidence.length}`, sub: "facts backed by a document" },
    { label: "Next deadline", value: days !== null ? `${days}d` : "—", sub: next ? next.label : "Nothing due" },
    { label: "Open with customer", value: String(brief.clarifications.length + brief.requests.filter((r) => r.status === "pending" || r.status === "rejected").length), sub: "questions and documents" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}
