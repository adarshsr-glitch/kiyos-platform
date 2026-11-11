"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyProfile } from "@/lib/api";
import type { CaseDetail, Fact } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; match: (key: string) => boolean }[] = [
  { title: "Residency & travel", match: (k) => /return|arrival|days_in|residen/.test(k) },
  { title: "Income", match: (k) => /salary|employer|income|wage/.test(k) },
  { title: "Assets & accounts", match: (k) => /401k|ira|brokerage|rsu|balance|value|fund|account/.test(k) },
  { title: "Identity", match: (k) => /pan|ssn|aadhaar|passport/.test(k) },
];

const SENSITIVE = /pan|ssn|aadhaar|passport/;
const SOURCE_LABEL: Record<string, string> = {
  "captain-entered": "from your advisor",
  customer_confirmed: "confirmed by you",
};

function label(key: string) {
  const s = key.replace(/_/g, " ").replace(/\b401k\b/i, "401(k)");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mask(value: string) {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

/** M4.1 / M4.2: pre-filled profile the customer corrects and confirms. */
export function VerifyForm({ caseData }: { caseData: CaseDetail }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  // Derived facts are the engine's output, not the customer's to edit.
  const editable = useMemo(
    () => caseData.facts.filter((f) => f.source !== "derived"),
    [caseData.facts]
  );
  const groups = useMemo(() => {
    const used = new Set<number>();
    const out = GROUPS.map((g) => {
      const facts = editable.filter((f) => !used.has(f.id) && g.match(f.key));
      facts.forEach((f) => used.add(f.id));
      return { title: g.title, facts };
    });
    out.push({ title: "Other", facts: editable.filter((f) => !used.has(f.id)) });
    return out.filter((g) => g.facts.length > 0);
  }, [editable]);

  const changed = Object.entries(values).filter(([id, v]) => {
    const fact = editable.find((f) => f.id === Number(id));
    return fact && v.trim() !== "" && v.trim() !== fact.value;
  });

  async function confirm() {
    setBusy(true);
    try {
      await verifyProfile(
        caseData.id,
        caseData.client_name,
        changed.map(([id, value]) => ({ id: Number(id), value: value.trim() }))
      );
      setValues({});
      toast.success(changed.length ? `Confirmed with ${changed.length} correction(s)` : "Details confirmed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setBusy(false);
    }
  }

  const confirmedAt = caseData.profile_confirmed_at
    ? new Date(caseData.profile_confirmed_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4">
      {confirmedAt && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          You confirmed these details on {confirmedAt}. Update anything that has changed and confirm again.
        </div>
      )}

      {groups.map((g) => (
        <Card key={g.title}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {g.title === "Identity" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              {g.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {g.facts.map((f) => (
              <FactField
                key={f.id}
                fact={f}
                value={values[f.id]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {changed.length
            ? `${changed.length} correction${changed.length > 1 ? "s" : ""} to save`
            : "Everything looks right?"}
        </p>
        <Button onClick={confirm} disabled={busy} className="rounded-full px-6">
          {changed.length ? "Save & confirm" : "Confirm details"}
        </Button>
      </div>
    </div>
  );
}

function FactField({
  fact,
  value,
  onChange,
}: {
  fact: Fact;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const sensitive = SENSITIVE.test(fact.key);
  const dirty = value !== undefined && value.trim() !== "" && value.trim() !== fact.value;

  return (
    <div className="grid gap-1 sm:grid-cols-[1fr_1.2fr] sm:items-center sm:gap-4">
      <div>
        <label htmlFor={`fact-${fact.id}`} className="text-sm font-medium text-foreground">
          {label(fact.key)}
        </label>
        <p className="text-[11px] text-muted-foreground">
          {SOURCE_LABEL[fact.source ?? ""] ?? (fact.source ? `from ${fact.source}` : "")}
          {fact.as_of ? ` · as of ${fact.as_of}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={`fact-${fact.id}`}
          value={value ?? (sensitive ? "" : fact.value)}
          placeholder={sensitive ? mask(fact.value) : undefined}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className={cn("text-sm", dirty && "border-amber-400 bg-amber-50/50")}
        />
        {fact.unit && <span className="shrink-0 text-xs text-muted-foreground">{fact.unit}</span>}
      </div>
    </div>
  );
}
