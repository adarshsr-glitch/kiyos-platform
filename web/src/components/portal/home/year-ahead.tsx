"use client";

/**
 * The customer's year on one axis: trips to India, residency in each country, and every
 * dated step (documents due, expert steps, returns). Hover a mark for what it is; click
 * it for the detail in a side panel, with an honest note on how settled it is: whether
 * a document is needed yet, whether a figure is provisional, whether a status is projected.
 */

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Info, Upload } from "lucide-react";
import { CaseGantt, KIND_LABEL, type Deadline, type GanttSelection } from "@/components/charts/case-gantt";
import { SideSheet } from "@/components/side-sheet";
import type { ActionItem, DocumentRequest, TaxTopic } from "@/lib/types";
import type { Residency } from "@/lib/residency";
import { balanceText, COUNTRY_NAME, STATUS_LONG, type CountryPositionData } from "@/lib/position";
import { formatDate } from "@/lib/format";

const day = 24 * 60 * 60 * 1000;
const daysUntil = (iso: string) => Math.round((new Date(iso.slice(0, 10) + "T00:00:00").getTime() - Date.now()) / day);
const longDate = (iso: string | null | undefined) => formatDate(iso, { day: "numeric", month: "long", year: "numeric" });

export function YearAhead({
  residency,
  requests,
  items,
  topics,
  positions,
  captain,
  range,
}: {
  residency: Residency;
  requests: DocumentRequest[];
  items: ActionItem[];
  topics: TaxTopic[];
  positions: Record<"IN" | "US", CountryPositionData>;
  captain: string;
  /** Show one year only (ms since epoch). */
  range?: { start: number; end: number };
}) {
  const [sel, setSel] = useState<GanttSelection | null>(null);
  const first = captain.split(" ")[0];
  const returnDate = residency.facts.find((f) => f.key === "india_return_date")?.value ?? null;

  // Every dated step the customer should know about, from records they can see.
  const deadlines: Deadline[] = [
    ...requests
      .filter((r) => r.due_date && (r.status === "pending" || r.status === "rejected"))
      .map((r) => ({ id: `req-${r.id}`, date: r.due_date!, label: r.title, kind: "document" })),
    ...(["IN", "US"] as const)
      .filter((c) => positions[c].due)
      .map((c) => ({ id: `file-${c}`, date: positions[c].due!, label: `${c === "IN" ? "India" : "US"} return${positions[c].filing ? ` (${positions[c].filing})` : ""}`, kind: "filing" })),
    ...items
      .filter((i) => i.assignee !== "customer" && i.status !== "done" && i.due_date)
      .map((i) => ({ id: `item-${i.id}`, date: i.due_date!, label: i.title, kind: "review" })),
    ...topics
      .filter((t) => t.status === "in_progress" && t.due_date)
      .map((t) => ({ id: `topic-${t.id}`, date: t.due_date!, label: t.title, kind: "review" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <CaseGantt
        stays={residency.stays.filter((s) => s.country === "IN")}
        india={residency.india}
        us={residency.us}
        deadlines={range ? deadlines.filter((d) => { const t = new Date(d.date).getTime(); return t >= range.start && t < range.end; }) : deadlines}
        returnDate={returnDate}
        onSelect={setSel}
        range={range}
      />
      <SideSheet open={!!sel} onClose={() => setSel(null)} eyebrow={sel ? eyebrowOf(sel) : undefined} title={sel ? titleOf(sel) : ""}>
        {sel && <Detail sel={sel} requests={requests} items={items} topics={topics} positions={positions} residency={residency} first={first} returnDate={returnDate} />}
      </SideSheet>
    </>
  );
}

function eyebrowOf(s: GanttSelection) {
  if (s.type === "deadline") return KIND_LABEL[s.item.kind] ?? "Date";
  if (s.type === "year") return `${s.country === "IN" ? "India" : "US"} tax year`;
  if (s.type === "stay") return "Time in India";
  return "Your move";
}
function titleOf(s: GanttSelection) {
  if (s.type === "deadline") return s.item.label;
  if (s.type === "year") return `${s.year.year}: ${s.year.label}`;
  if (s.type === "stay") return `${formatDate(s.stay.arrived, { day: "numeric", month: "short" })} – ${s.stay.departed ? formatDate(s.stay.departed, { day: "numeric", month: "short", year: "numeric" }) : "ongoing"}`;
  return `Back in India from ${longDate(s.date)}`;
}

function Detail({
  sel,
  requests,
  items,
  topics,
  positions,
  residency,
  first,
  returnDate,
}: {
  sel: GanttSelection;
  requests: DocumentRequest[];
  items: ActionItem[];
  topics: TaxTopic[];
  positions: Record<"IN" | "US", CountryPositionData>;
  residency: Residency;
  first: string;
  returnDate: string | null;
}) {
  const rows: [string, string | null | undefined][] = [];
  const notes: string[] = [];
  let action: React.ReactNode = null;
  let body: string | null = null;

  if (sel.type === "deadline") {
    const [kind, rawId] = (sel.item.id ?? "").split(/-(.+)/);
    const due = daysUntil(sel.item.date);
    rows.push(["Date", longDate(sel.item.date)], ["", due >= 0 ? `in ${due} day${due === 1 ? "" : "s"}` : `${-due} days ago`]);

    if (kind === "req") {
      const r = requests.find((x) => String(x.id) === rawId);
      if (r) {
        body = r.why;
        rows.push(["For", r.country === "BOTH" ? "India and US" : r.country ? COUNTRY_NAME[r.country] : null], ["Status", r.status === "rejected" ? "A new copy is needed" : "Not received yet"]);
        if (r.status === "rejected" && r.rejection_reason) notes.push(`Why a new copy: ${r.rejection_reason}`);
        notes.push(
          due > 45
            ? `Not needed yet. Upload it any time before ${longDate(r.due_date)}; nothing is waiting on it today.`
            : `Needed soon: ${first} is waiting on it to move your case forward.`
        );
        notes.push(`Whatever Kiyos reads from it is provisional until ${first} checks it, and is confirmed again when your return is prepared.`);
        action = (
          <Link href={`/portal/documents?request=${r.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="h-4 w-4" /> {r.status === "rejected" ? "Upload a new copy" : "Upload it now"}
          </Link>
        );
      }
    } else if (kind === "file") {
      const p = positions[rawId as "IN" | "US"];
      const b = p.estimate ? balanceText(p.estimate) : null;
      rows.push(["Return", p.filing], ["Stage", p.stage], ["Status this year", p.status ? STATUS_LONG[p.status] ?? p.status : null]);
      if (p.estimate && b) rows.push(["Current estimate", `${b.amount} ${b.label}`]);
      notes.push("Shown so you can plan. Filing isn't done from this workspace yet.");
      if (p.estimate) notes.push(`The estimate is ${p.estimate.illustrative ? "illustrative and " : ""}based on what's recorded today. It will move as documents come in, and ${first} confirms the final figures nearer the date.`);
      else notes.push(`There's no estimate yet. ${first} sets one out once your income for the year is documented.`);
    } else if (kind === "item") {
      const i = items.find((x) => String(x.id) === rawId);
      body = i?.notes && i.notes !== "clarification" ? i.notes : null;
      rows.push(["Owner", i?.owner ?? first]);
      notes.push(`This is ${first}'s step. Nothing is needed from you; you'll see the outcome here when it's done.`);
    } else if (kind === "topic") {
      const t = topics.find((x) => String(x.id) === rawId);
      body = t?.conclusion ?? null;
      rows.push(["Next", t?.next_action], ["Owner", first]);
      notes.push(`${first} is still working on this; the conclusion above is the current thinking, not final.`);
      action = (
        <Link href="/portal/tax-position" className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-[13.5px] font-medium text-foreground hover:bg-muted">
          See it in Tax position
        </Link>
      );
    }
  } else if (sel.type === "year") {
    const y = sel.year;
    const reviewed = residency.reviewed[sel.country];
    rows.push(["Period", `${formatDate(y.start, { day: "numeric", month: "short", year: "numeric" })} – ${formatDate(y.end, { day: "numeric", month: "short", year: "numeric" })}`], [`Days in ${sel.country === "IN" ? "India" : "the US"}`, `${y.days}`], ["Status", STATUS_LONG[y.status] ?? y.label]);
    if (y.projected) notes.push(`Projected${returnDate ? ` from your planned return on ${longDate(returnDate)}` : " from your planned dates"}. If your dates change, it's recalculated.`);
    notes.push(reviewed ? `Reviewed by your expert${reviewed.on ? ` on ${longDate(reviewed.on)}` : ""}.` : "Calculated from your travel record. Not yet reviewed by an expert.");
    action = (
      <Link href="/portal/tax-position" className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-[13.5px] font-medium text-foreground hover:bg-muted">
        How it was worked out
      </Link>
    );
  } else if (sel.type === "stay") {
    const s = sel.stay;
    const end = s.departed ? new Date(s.departed) : new Date();
    const days = Math.round((end.getTime() - new Date(s.arrived).getTime()) / day) + 1;
    rows.push(["Days", `${days}${s.departed ? "" : " so far"}`], ["Source", s.source]);
    notes.push(/passport|stamp/i.test(s.source) ? "Confirmed from your passport stamps." : "Dates as you gave them. Passport stamps would confirm them; until then the day count is provisional.");
  } else {
    rows.push(["Date", longDate(sel.date)]);
    notes.push("Your residency for the years after this date is projected from it. If the date moves, tell us and it's recalculated.");
  }

  return (
    <div className="space-y-5">
      {body && <p className="text-[14px] leading-relaxed text-foreground">{body}</p>}
      <dl className="divide-y rounded-xl border text-[13px]">
        {rows
          .filter(([, v]) => v)
          .map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-4 px-3.5 py-2.5">
              <dt className="text-muted-foreground">{k || <CalendarClock className="h-3.5 w-3.5" />}</dt>
              <dd className="text-right font-medium text-foreground">{v}</dd>
            </div>
          ))}
      </dl>
      {notes.length > 0 && (
        <div className="space-y-2 rounded-xl bg-amber-50/70 px-3.5 py-3">
          {notes.map((n) => (
            <p key={n} className="flex gap-2 text-[13px] leading-snug text-amber-950">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
              {n}
            </p>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}
