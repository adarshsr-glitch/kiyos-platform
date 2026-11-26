"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CircleAlert, Loader2, Minus, ReceiptText } from "lucide-react";
import { createPayLink } from "@/lib/residency";
import type { CaseDetail, InitialScan, Plan } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Pill, Section, inr } from "./kit";

const INCLUDES: Record<Plan["key"], string[]> = {
  advisory: [
    "Analysis and tax planning across India and the US",
    "Works alongside your existing CA and CPA, who file",
    "A named expert who owns your case",
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

type Step = 1 | 2 | 3 | 4;
const STEPS: { n: Step; title: string }[] = [
  { n: 1, title: "Who's covered" },
  { n: 2, title: "Choose your plan" },
  { n: 3, title: "Confirm the scope" },
  { n: 4, title: "Pay and sign" },
];

/**
 * Plan selection as one top-to-bottom sequence: who's covered (sets the price), which plan,
 * confirm the scope, then pay and sign. Every step is always on the page in order; the
 * current one is open, finished ones collapse to a one-line summary with "Change", later
 * ones show only their title. A summary of the selection and price stays in view (a side
 * column on desktop, a bar at the bottom on phones), so nothing appears elsewhere.
 */
export function PlanCheckout({ caseData, scan, plans }: { caseData: CaseDetail; scan: InitialScan | null; plans: Plan[] }) {
  const router = useRouter();
  // A checkout that failed earlier comes back with the same choice, at the payment step.
  const retry = caseData.plan_choice?.payment_status === "failed" ? caseData.plan_choice : null;
  const [household, setHousehold] = useState<"individual" | "couple">(retry?.household ?? scan?.household ?? "individual");
  const [offering, setOffering] = useState<Plan["key"] | null>(retry?.offering ?? null);
  const [step, setStep] = useState<Step>(retry ? 3 : 1);
  const [scopeOk, setScopeOk] = useState(false);
  const [nda, setNda] = useState(false);
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT)[number]["key"]>("upi");
  const [busy, setBusy] = useState(false);

  const chosen = plans.find((p) => p.key === offering);
  const price = chosen ? chosen[`${household}_inr`] : null;
  const quoted = scan?.rows.filter((r) => r.priced_separately) ?? [];
  const covered = scan?.rows.filter((r) => !r.priced_separately) ?? [];
  const ready = !!chosen && scopeOk && nda && consent;

  async function pay() {
    if (!chosen) return;
    setBusy(true);
    try {
      // A secure payment link (also sent on WhatsApp) opens the pre-filled payment page.
      const link = await createPayLink(caseData.id, { offering: chosen.key, household, payment_method: method, scope_confirmed: scopeOk, nda_accepted: nda, consent });
      const token = (link as { token?: string }).token;
      router.push(token ? `/pay/${token}` : "/portal/overview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment didn't go through");
      setBusy(false);
    }
  }

  const summaryOf: Record<Step, string | null> = {
    1: household === "couple" ? "Me and my spouse" : "Just me",
    2: chosen ? `${chosen.name} · ${inr(price!)}` : null,
    3: scopeOk ? "Scope confirmed" : null,
    4: null,
  };

  return (
    <div className="mx-auto max-w-[1040px] pb-28 lg:pb-0">
      <header className="mb-7">
        <p className="text-[13px] text-muted-foreground">Priced for your household, not per form</p>
        <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight text-foreground sm:text-[34px]">Choose how much Kiyos takes on</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Four short steps. Your expert starts as soon as you&apos;ve paid.</p>
      </header>

      {retry && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-[13.5px] text-amber-950">
            <p className="font-medium">
              Your payment of {inr(retry.price_inr)} for {retry.name} didn&apos;t go through
              {retry.attempted_at && ` on ${formatDate(retry.attempted_at, { day: "numeric", month: "short" })}`}.
            </p>
            <p className="mt-0.5 text-amber-900/80">{retry.failure_reason ?? "Nothing was charged."} Your choice is kept; confirm the scope and try again.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ol className="min-w-0 space-y-3">
          {STEPS.map(({ n, title }) => {
            const open = step === n;
            const done = step > n;
            return (
              <li key={n} className={cn("rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))]", open && "shadow-[0_0_0_1.5px_hsl(var(--primary))]")}>
                <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                      done ? "bg-primary text-primary-foreground" : open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15.5px] font-semibold", open || done ? "text-foreground" : "text-muted-foreground")}>{title}</span>
                    {done && summaryOf[n] && <span className="block truncate text-[13px] text-muted-foreground">{summaryOf[n]}</span>}
                  </span>
                  {done && (
                    <button onClick={() => setStep(n)} className="shrink-0 text-[13px] font-medium text-primary hover:underline">
                      Change
                    </button>
                  )}
                </div>

                {open && n === 1 && (
                  <div className="border-t px-5 py-5 sm:px-6">
                    <p className="mb-3 text-[14px] text-muted-foreground">This sets the price. Your WhatsApp answers said: {scan?.household === "couple" ? "you and your spouse" : "just you"}.</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(["individual", "couple"] as const).map((h) => (
                        <Choice key={h} selected={household === h} onClick={() => setHousehold(h)} title={h === "individual" ? "Just me" : "Me and my spouse"} sub={h === "individual" ? "One person's India and US returns" : "A joint US return and two India filings"} />
                      ))}
                    </div>
                    <Next onClick={() => setStep(2)} />
                  </div>
                )}

                {open && n === 2 && (
                  <div className="border-t px-5 py-5 sm:px-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {plans.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => {
                            setOffering(p.key);
                            setScopeOk(false);
                          }}
                          className={cn("rounded-xl border p-5 text-left transition-colors", offering === p.key ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:border-foreground/25")}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block text-[15px] font-semibold text-foreground">{p.name}</span>
                              <span className="block text-[13px] text-muted-foreground">{p.summary}</span>
                            </span>
                            <Radio on={offering === p.key} />
                          </span>
                          <span className="mt-4 block font-serif text-[28px] leading-none tabular-nums text-foreground">{inr(p[`${household}_inr`])}</span>
                          <span className="mt-1 block text-[12px] text-muted-foreground">incl. 18% GST · about ${p[`${household}_usd`]} · one India and one US cycle</span>
                          <span className="mt-4 block space-y-1.5">
                            {INCLUDES[p.key].map((i) => (
                              <span key={i} className="flex gap-2 text-[13px] text-foreground">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                {i}
                              </span>
                            ))}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[13px] text-muted-foreground">With either plan</p>
                        {ALWAYS.map((a) => (
                          <p key={a} className="flex gap-2 py-0.5 text-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            {a}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="mb-1 text-[13px] text-muted-foreground">Not included</p>
                        {["Investment advice and general financial planning", "A dependant's own separate return, quoted by an expert first", "Countries other than India and the US"].map((a) => (
                          <p key={a} className="flex gap-2 py-0.5 text-muted-foreground">
                            <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {a}
                          </p>
                        ))}
                      </div>
                    </div>
                    <Next disabled={!chosen} onClick={() => setStep(3)} />
                  </div>
                )}

                {open && n === 3 && chosen && price !== null && (
                  <div className="border-t px-5 py-5 sm:px-6">
                    <dl className="space-y-2.5 text-[14px]">
                      <Row k="Plan">{chosen.name}, {household === "couple" ? "couple" : "individual"}, {inr(price)} incl. GST</Row>
                      {covered.length > 0 && <Row k="Covers">{covered.map((r) => sentenceCase(r.area)).join(", ")}</Row>}
                      {quoted.length > 0 && (
                        <Row k="Quoted separately">
                          <span className="text-amber-900">{quoted.map((r) => sentenceCase(r.area)).join(", ")}, after a short review. You approve any quote before work starts.</span>
                        </Row>
                      )}
                      <Row k="If it's more complex">We explain it and ask before changing the price.</Row>
                    </dl>
                    <Tick checked={scopeOk} onChange={setScopeOk} className="mt-5 text-[14px]">
                      This matches what I need
                    </Tick>
                    <Next disabled={!scopeOk} onClick={() => setStep(4)} />
                  </div>
                )}

                {open && n === 4 && chosen && price !== null && (
                  <div className="border-t px-5 py-5 sm:px-6">
                    <p className="mb-2 text-[13px] text-muted-foreground">Pay with</p>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setMethod(m.key)}
                          className={cn("rounded-lg border px-4 py-2 text-[13.5px]", method === m.key ? "border-primary bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted")}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 space-y-2.5">
                      <Tick checked={nda} onChange={setNda} className="text-[14px]">
                        I agree to the Kiyos engagement terms and mutual NDA
                      </Tick>
                      <Tick checked={consent} onChange={setConsent} className="text-[14px]">
                        Kiyos may use my information to prepare my case. It is never used to train AI models.
                      </Tick>
                    </div>
                    <button
                      onClick={pay}
                      disabled={!ready || busy}
                      className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      Pay {inr(price)}
                    </button>
                    <p className="mt-2 text-[12px] text-muted-foreground">Charged in INR through Razorpay. US cards aren&apos;t accepted yet. Prototype: no money moves.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* What you've chosen, always in view. */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_hsl(var(--border))]">
            <Summary chosen={chosen ?? null} price={price} household={household} step={step} />
          </div>
        </aside>
      </div>

      <p className="mt-6 text-[12px] text-muted-foreground">Prices are provisional until launch pricing is confirmed. Anything that doesn&apos;t fit these plans? Email us and an expert will look at it.</p>

      <div className="fixed inset-x-0 bottom-[56px] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Summary chosen={chosen ?? null} price={price} household={household} step={step} compact />
      </div>
    </div>
  );
}

function Summary({ chosen, price, household, step, compact }: { chosen: Plan | null; price: number | null; household: "individual" | "couple"; step: Step; compact?: boolean }) {
  const next = step === 1 ? "Who's covered" : step === 2 ? "Choose your plan" : step === 3 ? "Confirm the scope" : "Pay and sign";
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-foreground">{chosen ? `${chosen.name} · ${household === "couple" ? "couple" : "just me"}` : "No plan chosen yet"}</span>
          <span className="block text-[12px] text-muted-foreground">Step {step} of 4 · {next}</span>
        </span>
        <span className="shrink-0 text-[17px] font-semibold tabular-nums text-foreground">{price !== null ? inr(price) : "—"}</span>
      </div>
    );
  }
  return (
    <>
      <p className="text-[13px] text-muted-foreground">Your selection</p>
      <p className="mt-1 text-[16px] font-semibold text-foreground">{chosen ? chosen.name : "No plan chosen yet"}</p>
      <p className="text-[13.5px] text-muted-foreground">{household === "couple" ? "Me and my spouse" : "Just me"}</p>
      <p className="mt-4 font-serif text-[30px] leading-none tabular-nums text-foreground">{price !== null ? inr(price) : "—"}</p>
      {price !== null && <p className="mt-1 text-[12px] text-muted-foreground">incl. 18% GST · one India and one US cycle</p>}
      <div className="mt-5 border-t pt-4 text-[13px]">
        <p className="text-muted-foreground">Step {step} of 4</p>
        <p className="font-medium text-foreground">{next}</p>
      </div>
      <div className="mt-4 border-t pt-4 text-[12.5px] leading-relaxed text-muted-foreground">
        After you pay, your expert is assigned, your WhatsApp answers and anything you&apos;ve sent are already in your workspace, and the documents still needed are listed with why.
      </div>
    </>
  );
}

function Choice({ selected, onClick, title, sub }: { selected: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-start justify-between gap-3 rounded-xl border p-4 text-left", selected ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:border-foreground/25")}>
      <span>
        <span className="block text-[15px] font-semibold text-foreground">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <Radio on={selected} />
    </button>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>
      {on && <Check className="h-3 w-3" />}
    </span>
  );
}

function Next({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-[14px] font-medium text-primary-foreground disabled:opacity-40">
      Continue
    </button>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground">{children}</dd>
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
          {/* Older plan records may lack some of these: show only what was recorded. */}
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            {p.receipt && (
              <>
                <dt className="text-muted-foreground">Receipt</dt>
                <dd className="flex items-center gap-1.5 text-foreground"><ReceiptText className="h-3.5 w-3.5" />{p.receipt}</dd>
              </>
            )}
            {caseData.activated_at && (
              <>
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="text-foreground">{formatDate(caseData.activated_at)}{p.payment_method ? ` · ${p.payment_method.toUpperCase()}` : ""}</dd>
              </>
            )}
            {p.nda_accepted_at && (
              <>
                <dt className="text-muted-foreground">NDA</dt>
                <dd className="text-foreground">Signed {formatDate(p.nda_accepted_at)}</dd>
              </>
            )}
            {p.consent_at && (
              <>
                <dt className="text-muted-foreground">Data consent</dt>
                <dd className="text-foreground">Given {formatDate(p.consent_at)} · never used for AI training</dd>
              </>
            )}
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
