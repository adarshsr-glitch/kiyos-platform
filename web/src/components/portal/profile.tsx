"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Lock, MessageCircle, Pencil, ShieldCheck, X } from "lucide-react";
import { decideProfileChange, verifyProfile } from "@/lib/api";
import type { CaseDetail, Fact, ProfileChange } from "@/lib/types";
import { formatDate, relativeDays } from "@/lib/format";
import { pictureFromFacts, sourceLabel } from "@/lib/financial-picture";
import { cn } from "@/lib/utils";
import { FinancialPicture } from "./financial-picture";
import { PageHeader, Pill, Section } from "./kit";
import { SENSITIVE_FACT, maskValue, profileLabel } from "./profile-labels";
import { TaskSheet, type Task } from "./task-sheet";

const RESIDENCY = /return|arrival|transfer|days_in_india|citizenship|city/;
const WORK = /employer/;

/** Kiyos financial profile (PRD §6): each fact with its source; chat-suggested changes wait for confirmation. */
export function Profile({ caseData, changes }: { caseData: CaseDetail; changes: ProfileChange[] }) {
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
  const residency = facts.filter((f) => RESIDENCY.test(f.key) && f.source !== "derived");
  const identity = facts.filter((f) => SENSITIVE_FACT.test(f.key));
  const work = facts.filter((f) => WORK.test(f.key));
  const statuses = facts.find((f) => f.key === "previous_year_statuses");
  const days = facts
    .map((f) => ({ f, m: f.key.match(/^days_in_india_(\d{4})_(\d{2})$/) }))
    .filter((x) => x.m)
    .map(({ f, m }) => ({ label: `FY ${m![1].slice(2)}-${m![2]}`, value: Number(f.value) || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const picture = pictureFromFacts(facts, caseData.members.map((m) => m.name));

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
      <PageHeader
        eyebrow="Your Kiyos profile"
        title="What we know about you"
        meta={`Every fact shows where it came from. Anything that affects your tax is checked by ${caseData.case_captain} before it's used.`}
        actions={
          <button
            onClick={confirmAll}
            disabled={busy || pending.length > 0}
            title={pending.length ? "Confirm or reject the changes first" : undefined}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Everything&apos;s correct
          </button>
        }
      />
      <p className="-mt-3 mb-5 text-xs text-muted-foreground">
        {caseData.profile_confirmed_at ? `Last confirmed ${relativeDays(caseData.profile_confirmed_at)}` : "Not confirmed yet"}
      </p>

      {pending.map((c) => (
        <PendingChange key={c.id} change={c} by={caseData.client_name} focused={c.id === focus} />
      ))}

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Residency and your move">
          <FactList facts={residency} caseId={caseData.id} by={caseData.client_name} />
          {days.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Days in India</p>
              <div className="flex items-end gap-3">
                {days.map((d) => (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs tabular-nums text-foreground">{d.value}</span>
                    <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, Math.min(60, d.value))}px` }} />
                    <span className="text-[10.5px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {statuses && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Indian residency, last ten years · {sourceLabel(statuses.source)}
              </p>
              <div className="flex gap-1">
                {statuses.value.split(",").map((s, i) => (
                  <span key={i} className="flex h-6 flex-1 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground" title={s === "NR" ? "Non-resident" : s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        <div className="space-y-5">
          <Section title="Household">
            <ul className="divide-y">
              {caseData.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="text-foreground">{m.name}</span>
                  <span className="text-muted-foreground">
                    {m.role === "primary" ? "You" : m.role === "spouse" ? "Spouse" : "Dependant"}
                    {m.citizenship ? ` · ${m.citizenship}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {work.length > 0 && <FactList facts={work} caseId={caseData.id} by={caseData.client_name} className="mt-2 border-t pt-2" />}
          </Section>

          <Section title="Identity">
            <FactList facts={identity} caseId={caseData.id} by={caseData.client_name} sensitive />
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Only ever entered here, never in chat. Shown masked.
            </p>
          </Section>
        </div>
      </div>

      <div className="mt-5">
        <FinancialPicture items={picture} editable={false} />
        <p className="mt-2 text-xs text-muted-foreground">
          Amounts come from your documents. If one looks wrong, tell us on WhatsApp or upload the right document — we
          don&apos;t overwrite figures without the evidence.
        </p>
      </div>

      {history.length > 0 && (
        <Section title="Change history" className="mt-5">
          <ul className="space-y-2 text-[13px]">
            {history.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <Pill tone={c.status === "confirmed" ? "green" : "gray"}>{c.status === "confirmed" ? "Confirmed" : "Rejected"}</Pill>
                <span className="text-foreground">{profileLabel(c.fact_key)}</span>
                <span className="text-muted-foreground">
                  {c.previous_value} → {c.proposed_value} · {formatDate(c.decided_at)}
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

function PendingChange({ change: c, by, focused }: { change: ProfileChange; by: string; focused: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pretty = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, { day: "numeric", month: "long", year: "numeric" }) : v) ?? "—";

  async function decide(decision: "confirm" | "reject") {
    setBusy(true);
    try {
      await decideProfileChange(c.id, decision, by);
      toast.success(decision === "confirm" ? "Saved — your expert has been told" : "Left as it was");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <section className={cn("mb-5 rounded-2xl border bg-card p-5", focused ? "border-[#25d366] ring-2 ring-[#25d366]/30" : "border-amber-300")}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="amber">Waiting for you</Pill>
        <p className="text-[13px] font-semibold text-foreground">{profileLabel(c.fact_key)}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div>
          <p className="text-[11px] text-muted-foreground">On file</p>
          <p className="text-[17px] text-muted-foreground line-through decoration-1">{pretty(c.previous_value)}</p>
        </div>
        <span className="hidden text-muted-foreground md:block">→</span>
        <div>
          <p className="text-[11px] text-muted-foreground">You told us</p>
          <p className="text-[17px] font-medium text-foreground">{pretty(c.proposed_value)}</p>
        </div>
      </div>
      {c.quote && (
        <p className="mt-4 flex gap-2 rounded-lg bg-[#efeae2] px-3 py-2 text-[13px] text-[#111b21]">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00a884]" />
          <span>
            “{c.quote}” <span className="text-[#667781]">· WhatsApp, {formatDate(c.created_at, { day: "numeric", month: "short" })}</span>
          </span>
        </p>
      )}
      {c.affects && <p className="mt-3 text-[13px] text-muted-foreground">{c.affects}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => decide("confirm")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          <Check className="h-4 w-4" /> Confirm
        </button>
        <button onClick={() => decide("reject")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-foreground disabled:opacity-50">
          <X className="h-4 w-4" /> That&apos;s not right
        </button>
      </div>
    </section>
  );
}

function FactList({
  facts,
  caseId,
  by,
  sensitive,
  className,
}: {
  facts: Fact[];
  caseId: number;
  by: string;
  sensitive?: boolean;
  className?: string;
}) {
  if (facts.length === 0) return <p className={cn("text-[13px] text-muted-foreground", className)}>Nothing recorded yet.</p>;
  return (
    <dl className={cn("divide-y", className)}>
      {facts.map((f) => (
        <FactRow key={f.id} fact={f} caseId={caseId} by={by} sensitive={sensitive} />
      ))}
    </dl>
  );
}

function FactRow({ fact, caseId, by, sensitive }: { fact: Fact; caseId: number; by: string; sensitive?: boolean }) {
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
      await verifyProfile(caseId, by, [{ id: fact.id, value: value.trim() }]);
      toast.success("Saved and logged — your expert will check it");
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
            {sourceLabel(fact.source)}
            {fact.as_of ? ` · ${formatDate(fact.as_of, { day: "numeric", month: "short" })}` : ""}
          </dd>
        </div>
        {!editing && (
          <dd className="flex shrink-0 items-center gap-2">
            <span className="text-[13px] font-medium tabular-nums text-foreground">{display}</span>
            <button onClick={() => setEditing(true)} aria-label={`Edit ${profileLabel(fact.key)}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
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
          <button onClick={save} disabled={busy || !value.trim()} className="rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-md border px-3 text-xs text-muted-foreground">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
