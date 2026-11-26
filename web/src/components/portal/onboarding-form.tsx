"use client";

/**
 * Onboarding: the facts residency is calculated from. Dates and trips are typed by
 * the customer (or, later, read from passport pages); money is asked as ranges.
 * Nothing here is pre-filled with guesses. What the WhatsApp scan already told us is
 * shown as context and used to decide which items to ask about.
 */

import { useState } from "react";
import { ArrowRight, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Section } from "./kit";
import { saveOnboarding, type OnboardingResult } from "@/lib/residency";

const BANDS = {
  INR: ["Under ₹5L", "₹5–25L", "₹25L–1Cr", "Over ₹1Cr"],
  USD: ["Under $10k", "$10–50k", "$50–250k", "Over $250k"],
} as const;

type Item = { id: string; country: "IN" | "US"; kind: "income" | "asset"; label: string; currency: "INR" | "USD"; because: string };

function itemsFrom(answers: Record<string, string>): Item[] {
  const yes = (k: string) => answers[k] === "Yes";
  const items: Item[] = [
    { id: "us-salary", country: "US", kind: "income", label: "Salary from a US employer", currency: "USD", because: "Most people moving back have one" },
    { id: "in-bank", country: "IN", kind: "asset", label: "NRE / NRO savings and deposits", currency: "INR", because: "Common for NRIs" },
  ];
  if (yes("retirement")) items.push({ id: "us-401k", country: "US", kind: "asset", label: "401(k) or IRA", currency: "USD", because: "You said you have a 401(k) or IRA" });
  if (yes("equity")) items.push({ id: "us-brokerage", country: "US", kind: "asset", label: "US brokerage, RSUs or options", currency: "USD", because: "You said you have a US brokerage account or RSUs" });
  if (yes("india_funds")) items.push({ id: "in-mf", country: "IN", kind: "asset", label: "Indian mutual funds", currency: "INR", because: "You said you hold Indian mutual funds" });
  if (yes("india_property")) {
    items.push({ id: "in-property", country: "IN", kind: "asset", label: "Property in India", currency: "INR", because: "You said you own property in India" });
    items.push({ id: "in-rent", country: "IN", kind: "income", label: "Rent from property in India", currency: "INR", because: "You said you own property or earn rent in India" });
  }
  return items;
}

type Trip = { arrived: string; departed: string };

export function OnboardingForm({ caseId, firstName, answers }: { caseId: number; firstName: string; answers: Record<string, string> }) {
  const items = itemsFrom(answers);
  const [leftIndia, setLeftIndia] = useState("");
  const [usArrived, setUsArrived] = useState("");
  const [greenCard, setGreenCard] = useState<"" | "yes" | "no">("");
  const [greenCardFrom, setGreenCardFrom] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [trips, setTrips] = useState<Trip[]>([{ arrived: "", departed: "" }]);
  const [bands, setBands] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  const tripsOk = trips.every((t) => (!t.arrived && !t.departed) || (t.arrived && t.departed && t.departed >= t.arrived));
  const ready = leftIndia && usArrived && returnDate && greenCard && (greenCard === "no" || greenCardFrom) && tripsOk && items.every((i) => bands[i.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await saveOnboarding(caseId, {
        left_india_on: leftIndia,
        us_arrived_on: usArrived,
        india_return_date: returnDate,
        green_card_from: greenCard === "yes" ? greenCardFrom : null,
        household: answers.household === "With my spouse" ? "couple" : "individual",
        trips: trips.filter((t) => t.arrived && t.departed),
        holdings: items
          .filter((i) => bands[i.id] && bands[i.id] !== "None")
          .map((i) => ({ id: i.id, country: i.country, kind: i.kind, label: i.label, currency: i.currency, band: bands[i.id] })),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader eyebrow="Saved" title="Here's what Kiyos did with your details" />
        <ol className="space-y-3">
          {result.steps.map((s) => (
            <li key={s.label} className="flex gap-3 rounded-xl border bg-card p-4">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        {/* Full navigation so the assessment is rendered from the facts just saved. */}
        <a href="/portal/assessment" className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          See your residency and assessment <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const input = "w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Your details"
        title={`A few facts, ${firstName}`}
        meta="Residency depends on exact dates, so we ask for them here rather than in a chat. Money is asked as ranges only."
      />

      {Object.keys(answers).length > 0 && (
        <Section title="From your WhatsApp scan" className="mb-5">
          <ul className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
            {Object.entries(answers).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                <span className="text-right font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="When you moved" className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[13px] font-medium">Moved abroad from India<input type="date" className={cn(input, "mt-1.5")} value={leftIndia} onChange={(e) => setLeftIndia(e.target.value)} /></label>
          <label className="text-[13px] font-medium">Arrived in the US<input type="date" className={cn(input, "mt-1.5")} value={usArrived} onChange={(e) => setUsArrived(e.target.value)} /></label>
          <label className="text-[13px] font-medium">Return to India (planned or done)<input type="date" className={cn(input, "mt-1.5")} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></label>
          <div className="text-[13px] font-medium">
            Do you hold a US green card?
            <div className="mt-1.5 flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setGreenCard(v)} className={cn("rounded-full border px-3 py-1.5", greenCard === v ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                  {v === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {greenCard === "yes" && <input type="date" aria-label="Green card since" className={cn(input, "mt-2")} value={greenCardFrom} onChange={(e) => setGreenCardFrom(e.target.value)} />}
          </div>
        </div>
      </Section>

      <Section title="Trips to India in the last three years" className="mb-5">
        <p className="mb-3 text-[13px] text-muted-foreground">Each trip counts towards your days in India. Passport pages can confirm them later.</p>
        <ul className="space-y-2">
          {trips.map((t, i) => (
            <li key={i} className="flex flex-wrap items-end gap-2">
              <label className="text-[12px] text-muted-foreground">Arrived<input type="date" className={cn(input, "mt-1")} value={t.arrived} onChange={(e) => setTrips(trips.map((x, j) => (j === i ? { ...x, arrived: e.target.value } : x)))} /></label>
              <label className="text-[12px] text-muted-foreground">Left<input type="date" className={cn(input, "mt-1")} value={t.departed} onChange={(e) => setTrips(trips.map((x, j) => (j === i ? { ...x, departed: e.target.value } : x)))} /></label>
              {trips.length > 1 && (
                <button type="button" aria-label="Remove trip" onClick={() => setTrips(trips.filter((_, j) => j !== i))} className="mb-1 rounded-md p-2 text-muted-foreground hover:bg-muted">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setTrips([...trips, { arrived: "", departed: "" }])} className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
          <Plus className="h-4 w-4" /> Add a trip
        </button>
        {!tripsOk && <p className="mt-2 text-xs text-rose-700">Each trip needs both dates, and must end after it starts.</p>}
      </Section>

      <Section title="Your money, by country" className="mb-5">
        <p className="mb-3 text-[13px] text-muted-foreground">Rough ranges are enough. Nothing connects to your bank.</p>
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id}>
              <p className="text-[13px] font-medium">
                {it.country === "IN" ? "🇮🇳" : "🇺🇸"} {it.label}{" "}
                <span className="font-normal text-muted-foreground">· {it.kind === "income" ? "per year" : "current value"} · {it.because}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[...BANDS[it.currency], "None"].map((b) => (
                  <button key={b} type="button" onClick={() => setBands({ ...bands, [it.id]: b })} className={cn("rounded-full border px-3 py-1.5 text-[13px]", bands[it.id] === b ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <div className="flex justify-end">
        <button onClick={submit} disabled={!ready || busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-45">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save and calculate <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}
