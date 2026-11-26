"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Lock, MessageCircle, Pencil, ShieldCheck, X } from "lucide-react";
import { decideProfileChange, verifyProfile } from "@/lib/api";
import type { CaseDetail, DocumentRequest, Fact, InitialScan, ProfileChange } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { sourceLabel } from "@/lib/financial-picture";
import { cn } from "@/lib/utils";
import { Pill, Section } from "./kit";
import { hasCaptain } from "@/lib/captain";
import { maskValue, profileLabel } from "./profile-labels";
import { TaskSheet, type Task } from "./task-sheet";
import { editProfile, type Residency, type Saving } from "@/lib/residency";
import { YourFile, buildFile } from "./your-file";
import { Cite } from "@/components/source/cite";



/** Kiyos financial profile (PRD §6): each fact with its source; chat-suggested changes wait for confirmation. */
export function Profile({ caseData, changes, scan, residency: clock, requests = [], savings = [] }: { caseData: CaseDetail; changes: ProfileChange[]; scan?: InitialScan | null; residency?: Residency | null; requests?: DocumentRequest[]; savings?: Saving[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const focus = Number(search.get("change"));
  const [busy, setBusy] = useState(false);

  const pending = changes.filter((c) => c.status === "proposed");
  const history = changes.filter((c) => c.status !== "proposed");
  // CD-02: a WhatsApp deep link (?change=ID) opens straight into the confirm sheet.
  const linkedChange = pending.find((c) => c.id === focus);
  const [sheet, setSheet] = useState<Task | null>(linkedChange ? { kind: "confirm", change: linkedChange } : null);
  const facts = caseData.facts;
  const returned = facts.find((f) => f.key === "india_return_date")?.value;
  const moveLine = returned
    ? new Date(returned) <= new Date()
      ? `back in India since ${formatDate(returned, { day: "numeric", month: "short", year: "numeric" })}`
      : `moving to India on ${formatDate(returned, { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  // Without a recorded return date, an open trip on the passport says the same thing.
  const openStay = clock?.stays.find((st) => !st.departed && new Date(st.arrived) <= new Date());
  const moveText = moveLine ?? (openStay ? `in India since ${formatDate(openStay.arrived, { day: "numeric", month: "short", year: "numeric" })}` : null);
  const indiaNow = caseData.country_status?.IN?.status ?? clock?.india.find((y) => y.current)?.label ?? null;
  const citizenships = caseData.members.find((m) => m.role === "primary")?.citizenship ?? null;

  async function confirmAll() {
    setBusy(true);
    try {
      await verifyProfile(caseData.id, caseData.client_name, []);
      toast.success("Thanks — your profile is confirmed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">Profile</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            What {hasCaptain(caseData.case_captain) ? caseData.case_captain.split(" ")[0] : "Kiyos"} knows about you. Select a section to see or change it.
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {[citizenships ? `${citizenships} citizen` : null, moveText, indiaNow ? `${indiaNow} this year` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={confirmAll}
            disabled={busy || pending.length > 0}
            title={pending.length ? "Confirm or reject the changes first" : undefined}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
            {busy ? "Saving…" : <>Everything&apos;s correct</>}
          </button>
          <p className="text-[12px] text-muted-foreground">
            {caseData.profile_confirmed_at ? `You last confirmed this ${relativeDays(caseData.profile_confirmed_at)}` : "Not confirmed by you yet"}
          </p>
        </div>
      </section>

      {pending.map((c) => (
        <PendingChange key={c.id} change={c} by={caseData.client_name} focused={c.id === focus} />
      ))}

      <YourFile sections={buildFile(caseData, clock ?? null, scan ?? null, requests, savings, changes)} caseId={caseData.id} by={caseData.client_name} />

      {history.length > 0 && (
        <Section title="Change history" className="mt-6">
          <ul className="space-y-2 text-[13px]">
            {history.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <Pill tone={c.status === "confirmed" ? "green" : "gray"}>{c.status === "confirmed" ? "Confirmed" : "Rejected"}</Pill>
                <span className="text-foreground">{profileLabel(c.fact_key)}</span>
                <span className="text-muted-foreground">
                  {iso(c.previous_value)} → {iso(c.proposed_value)} · {formatDate(c.decided_at)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <TaskSheet
        task={sheet}
        caseId={caseData.id}
        by={caseData.client_name}
        lead={caseData.case_captain}
        fromWhatsApp
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

/** Dates read as dates; other values as they are. */
const iso = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, { day: "numeric", month: "short", year: "numeric" }) : v) ?? "—";

function PendingChange({ change: c, by, focused }: { change: ProfileChange; by: string; focused: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null);
  const pretty = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, { day: "numeric", month: "long", year: "numeric" }) : v) ?? "—";

  async function decide(decision: "confirm" | "reject") {
    setBusy(decision);
    try {
      await decideProfileChange(c.id, decision, by);
      toast.success(decision === "confirm" ? "Saved — your expert has been told" : "Left as it was");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      setBusy(null);
    }
  }

  // One compact row: what changes, from what to what, and the decision. The quote and
  // its effect sit on a single secondary line.
  return (
    <section
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:gap-5",
        focused ? "border-[#25d366] ring-2 ring-[#25d366]/30" : "border-amber-300"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px]">
          <Pill tone="amber">Confirm</Pill>
          <span className="font-medium text-foreground">{profileLabel(c.fact_key)}</span>
          <span className="text-muted-foreground line-through decoration-1">{pretty(c.previous_value)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-semibold text-foreground">{pretty(c.proposed_value)}</span>
        </p>
        <p className="mt-1 truncate text-[12.5px] text-muted-foreground" title={[c.quote, c.affects].filter(Boolean).join(" ")}>
          {c.quote && (
            <>
              <MessageCircle className="mr-1 inline h-3 w-3 align-[-1px] text-[#00a884]" />
              “{c.quote}” · WhatsApp, {formatDate(c.created_at, { day: "numeric", month: "short" })}
            </>
          )}
          {c.quote && c.affects ? " · " : ""}
          {c.affects}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => decide("confirm")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
          {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm
        </button>
        <button onClick={() => decide("reject")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] text-foreground hover:bg-muted disabled:opacity-50">
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Not right
        </button>
      </div>
    </section>
  );
}


export function FactRow({ fact, caseId, by, sensitive }: { fact: Fact; caseId: number; by: string; sensitive?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const display = sensitive
    ? maskValue(fact.value)
    : /^\d{4}-\d{2}-\d{2}$/.test(fact.value)
      ? formatDate(fact.value, { day: "numeric", month: "short", year: "numeric" })
      : `${fact.value}${fact.unit && fact.unit !== "days" ? ` ${fact.unit}` : ""}`;

  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await editProfile(caseId, { target: "fact", id: fact.id, value: value.trim(), by });
      toast.success("Saved. Your expert has been told and will check it.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-[13px] text-foreground">{profileLabel(fact.key)}</dt>
          <dd className="text-[11.5px] text-muted-foreground">
            {fact.locked ?? (
              <>
                {sourceLabel(fact.source)}
                {fact.as_of ? ` · ${formatDate(fact.as_of, { day: "numeric", month: "short" })}` : ""}
              </>
            )}
          </dd>
        </div>
        {!editing && (
          <dd className="flex shrink-0 items-center gap-2">
            <span className="text-[13px] font-medium tabular-nums text-foreground">{display}</span>
            {!sensitive && <Cite node={{ title: profileLabel(fact.key), value: display, evidence: fact.evidence ?? null, source: fact.source }} className="-mx-1" />}
            {fact.locked ? (
              <span title={fact.locked} aria-label={`Locked: ${fact.locked}`} className="rounded p-1 text-muted-foreground/70">
                <Lock className="h-3.5 w-3.5" />
              </span>
            ) : (
              <button onClick={() => { setValue(sensitive ? "" : fact.value); setEditing(true); }} aria-label={`Edit ${profileLabel(fact.key)}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </dd>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={sensitive ? "Enter the full number" : fact.value}
            autoComplete="off"
            className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-[13px] outline-none focus:border-primary"
          />
          <button onClick={save} disabled={busy || !value.trim()} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-md border px-3 text-xs text-muted-foreground">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

