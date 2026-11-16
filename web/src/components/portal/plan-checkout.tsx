"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CircleAlert, Loader2, Minus, ReceiptText } from "lucide-react";
import { activatePlan } from "@/lib/api";
import type { CaseDetail, InitialScan, Plan } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Pill, Section, inr } from "./kit";

const INCLUDES: Record<Plan["key"], string[]> = {
  advisory: [
    "Analysis and tax planning across India and the US",
    "Works alongside your existing CA and CPA, who file",
    "A lead tax expert, plus India and US reviewers",
    "A 30-minute call with your expert every quarter",
  ],
  full: [
    "Everything in Advisory only",
    "Your India ITR and US return, one cycle each",
    "Your approval before anything is filed",
    "Help completing Form W-8BEN",
  ],
};

const ALWAYS = [
  "Answers on WhatsApp from your reviewed case — experts reply within one business day",
  "Secure workspace for documents, decisions and history",
];

const PAYMENT = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Indian card" },
  { key: "netbanking", label: "Netbanking" },
] as const;

/** PRD §10 + scenarios: explicit plan pick, scope recap, then pay, NDA, consent. */
export function PlanCheckout({ caseData, scan, plans }: { caseData: CaseDetail; scan: InitialScan | null; plans: Plan[] }) {
  const router = useRouter();
  // A checkout that failed earlier comes back with the same choice ready to retry.
  const retry = caseData.plan_choice?.payment_status === "failed" ? caseData.plan_choice : null;
  const [household, setHousehold] = useState<"individual" | "couple">(retry?.household ?? scan?.household ?? "individual");
  const [offering, setOffering] = useState<Plan["key"] | null>(retry?.offering ?? null);
  const [scopeOk, setScopeOk] = useState(false);
  const [nda, setNda] = useState(false);
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT)[number]["key"]>("upi");
  const [busy, setBusy] = useState(false);

  const chosen = plans.find((p) => p.key === offering);
  const price = chosen ? chosen[`${household}_inr`] : null;
  const quoted = scan?.rows.filter((r) => r.priced_separately) ?? [];
  const covered = scan?.rows.filter((r) => !r.priced_separately) ?? [];

  async function pay() {
    if (!chosen) return;
    setBusy(true);
    try {
      await activatePlan(caseData.id, {
        offering: chosen.key,
        household,
        payment_method: method,
        scope_confirmed: scopeOk,
        nda_accepted: nda,
        consent,
      });
      toast.success("Payment received — your workspace is ready");
      router.push("/portal/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment didn't go through");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Two plans · priced for your household, not per form"
        title="Choose how much Kiyos takes on"
        meta="Both include a named expert who owns your case and reviews every personal answer."
      />

      {retry && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-950">
            <p className="font-medium">
              Your payment of {inr(retry.price_inr)} for {retry.name} didn&apos;t go through
              {retry.attempted_at && ` on ${formatDate(retry.attempted_at, { day: "numeric", month: "short" })}`}.
            </p>
            <p className="mt-0.5 text-amber-900/80">
              {retry.failure_reason ?? "Nothing was charged."} Your choice is kept below — try again with UPI,
              netbanking or another card.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 inline-flex rounded-full border bg-card p-0.5 text-sm">
        {(["individual", "couple"] as const).map((h) => (
          <button
            key={h}
            onClick={() => setHousehold(h)}
            className={cn(
              "rounded-full px-4 py-1.5 transition-colors",
              household === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {h === "individual" ? "Just me" : "Me and my spouse"}
          </button>
        ))}
      </div>
      {household === "couple" && (
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Couple pricing assumes a joint US return and two India filings. Filing separately counts as two individuals.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => {
          const selected = offering === p.key;
          return (
            <button
              key={p.key}
              onClick={() => {
                setOffering(p.key);
                setScopeOk(false);
              }}
              className={cn(
                "rounded-2xl border bg-card p-5 text-left transition-all",
                selected ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{p.name}</p>
                  <p className="text-[13px] text-muted-foreground">{p.summary}</p>
                </div>
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </div>
              <p className="mt-4 font-serif text-[30px] font-medium leading-none tabular-nums text-foreground">
                {inr(p[`${household}_inr`])}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                incl. 18% GST · about ${p[`${household}_usd`]} · one India and one US cycle
              </p>
              <ul className="mt-4 space-y-1.5">
                {INCLUDES[p.key].map((i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-2 text-[13px] md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">With either plan</p>
          {ALWAYS.map((a) => (
            <p key={a} className="flex gap-2 py-0.5 text-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {a}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Not included</p>
          {[
            "Investment advice and general financial planning",
            "A dependant's own separate return — quoted by an expert first",
            "Countries other than India and the US",
          ].map((a) => (
            <p key={a} className="flex gap-2 py-0.5 text-muted-foreground">
              <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {a}
            </p>
          ))}
        </div>
      </div>

      {chosen && price !== null && (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Section title="1 · Confirm your scope">
            <ul className="space-y-1.5 text-[13px] text-foreground">
              <li>
                <span className="text-muted-foreground">Plan:</span> {chosen.name}, {household === "couple" ? "couple" : "individual"},{" "}
                {inr(price)} incl. GST
              </li>
              {covered.length > 0 && (
                <li>
                  <span className="text-muted-foreground">Covers:</span> {covered.map((r) => sentenceCase(r.area)).join(", ")}
                </li>
              )}
              {quoted.length > 0 && (
                <li className="text-amber-900">
                  <span className="text-muted-foreground">Quoted separately after a short review:</span>{" "}
                  {quoted.map((r) => sentenceCase(r.area)).join(", ")} — you approve any quote before work starts
                </li>
              )}
              <li>
                <span className="text-muted-foreground">If we find more complexity:</span> we explain it and ask before
                changing the price
              </li>
            </ul>
            <Tick checked={scopeOk} onChange={setScopeOk} className="mt-4">
              This matches what I need
            </Tick>
          </Section>

          <Section title="2 · Pay and sign" className={cn(!scopeOk && "opacity-50")}>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT.map((m) => (
                <button
                  key={m.key}
                  disabled={!scopeOk}
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    method === m.key ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Tick checked={nda} onChange={setNda} disabled={!scopeOk}>
                I agree to the Kiyos engagement terms and mutual NDA
              </Tick>
              <Tick checked={consent} onChange={setConsent} disabled={!scopeOk}>
                Kiyos may use my information to prepare my case. It is never used to train AI models.
              </Tick>
            </div>
            <button
              onClick={pay}
              disabled={!scopeOk || !nda || !consent || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Pay {inr(price)}
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Charged in INR through Razorpay. US cards aren&apos;t accepted yet. Prototype: no money moves.
            </p>
          </Section>
        </div>
      )}

      <p className="mt-6 text-[11px] text-muted-foreground">
        Prices are provisional until launch pricing is confirmed. Anything that doesn&apos;t fit these plans? Email us and
        an expert will look at it.
      </p>
    </div>
  );
}

function Tick({
  checked,
  onChange,
  disabled,
  className,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 text-[13px] text-foreground", disabled && "cursor-not-allowed", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      {children}
    </label>
  );
}

export function CurrentPlan({ caseData }: { caseData: CaseDetail }) {
  const p = caseData.plan_choice;
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Your plan" title={p?.name ?? "Paid plan"} meta={p ? `${p.household === "couple" ? "Couple" : "Individual"} · ${inr(p.price_inr)} incl. GST` : undefined} />
      {p && (
        <Section title="Receipt and agreements">
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            <dt className="text-muted-foreground">Receipt</dt>
            <dd className="flex items-center gap-1.5 text-foreground"><ReceiptText className="h-3.5 w-3.5" />{p.receipt}</dd>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-foreground">{formatDate(caseData.activated_at)} · {p.payment_method.toUpperCase()}</dd>
            <dt className="text-muted-foreground">NDA</dt>
            <dd className="text-foreground">Signed {formatDate(p.nda_accepted_at)}</dd>
            <dt className="text-muted-foreground">Data consent</dt>
            <dd className="text-foreground">Given {formatDate(p.consent_at)} · never used for AI training</dd>
          </dl>
          <div className="mt-4"><Pill tone="green">Active</Pill></div>
        </Section>
      )}
    </div>
  );
}

/** "Indian property" stays capitalised; "Retirement accounts" becomes "retirement accounts". */
function sentenceCase(area: string) {
  return /^(Indian|US|India)\b/.test(area) ? area : area.charAt(0).toLowerCase() + area.slice(1);
}
