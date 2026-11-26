"use client";

/**
 * Expert side: the only place tax figures and ways to save come from. Per country, the
 * year's estimate (liability, paid or withheld, due date, next payment, what it rests on);
 * and ways to save, each one of the options set in law, with the expert's reason, amount
 * and deadline. What is saved here is what the customer sees, marked as the expert's.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { addSaving, enterEstimate, withdrawSaving, type Saving, type SavingOption } from "@/lib/residency";
import type { TaxEstimate } from "@/lib/position";
import { formatDate, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Code = "IN" | "US";
const NAME: Record<Code, string> = { IN: "India", US: "United States" };
const FLAG: Record<Code, string> = { IN: "🇮🇳", US: "🇺🇸" };
const input = "h-9 w-full rounded-md border bg-background px-2.5 text-[13.5px] outline-none focus:border-primary";
const label = "mb-1 block text-[12px] text-muted-foreground";
const d = (s: string | null | undefined) => (s ? formatDate(s, { day: "numeric", month: "short", year: "numeric" }) : null);

export function ExpertEntries({
  caseId,
  advisor,
  customer,
  estimates,
  savings,
  options,
}: {
  caseId: number;
  advisor: string;
  customer: string;
  estimates: Partial<Record<Code, TaxEstimate>>;
  savings: Saving[];
  options: SavingOption[];
}) {
  const first = customer.split(" ")[0];
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Kiyos never works out tax or suggests a way to save. What you enter here is what {first} sees, marked as yours with today&apos;s date.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["IN", "US"] as Code[]).map((c) => (
          <EstimateCard key={c} code={c} caseId={caseId} advisor={advisor} current={estimates[c] ?? null} />
        ))}
      </div>
      <Savings caseId={caseId} advisor={advisor} savings={savings} options={options} />
    </div>
  );
}

function EstimateCard({ code, caseId, advisor, current }: { code: Code; caseId: number; advisor: string; current: TaxEstimate | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fyNow = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [f, setF] = useState({
    year: current?.year ?? (code === "IN" ? `FY ${fyNow}-${String((fyNow + 1) % 100).padStart(2, "0")}` : String(new Date().getFullYear())),
    form: current?.form ?? (code === "IN" ? "ITR-2" : "1040"),
    liability: current ? String(current.liability) : "",
    withheld: current ? String(current.withheld) : "",
    due: current?.due ?? "",
    nextDate: current?.nextPayment?.date ?? "",
    nextAmount: current?.nextPayment ? String(current.nextPayment.amount) : "",
    basis: current?.basis ?? "",
    status: current?.status ?? "estimate",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const cur = code === "IN" ? "INR" : "USD";

  async function save() {
    if (!f.liability) return toast.error("Enter the liability");
    setBusy(true);
    try {
      await enterEstimate(caseId, {
        country: code,
        year: f.year,
        form: f.form,
        liability: Number(f.liability),
        withheld: Number(f.withheld || 0),
        due: f.due || null,
        next_payment_date: f.nextDate || null,
        next_payment_amount: f.nextAmount ? Number(f.nextAmount) : null,
        basis: f.basis,
        status: f.status as "estimate" | "reviewed",
        by: advisor,
      });
      toast.success(`${NAME[code]} estimate saved. The customer sees it now.`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5" aria-label={`${NAME[code]} tax estimate`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">
          <span aria-hidden>{FLAG[code]}</span> {NAME[code]} tax this year
        </h3>
        {!open && (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            <Pencil className="h-3.5 w-3.5" /> {current ? "Update" : "Enter estimate"}
          </button>
        )}
      </header>
      {!open &&
        (current ? (
          <div className="mt-2 text-[13.5px]">
            <p className="text-foreground">
              {formatMoneyCompact(current.liability, cur)} liability · {formatMoneyCompact(current.withheld, cur)} paid · {current.year}, {current.form}
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              {current.status === "reviewed" ? "Reviewed" : "Estimate"} · entered by {current.enteredBy ?? "the expert"}
              {current.enteredOn ? ` on ${d(current.enteredOn)}` : ""}
              {current.illustrative ? " · demo figure" : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[13.5px] text-muted-foreground">No estimate yet. The customer sees “pending” until you enter one.</p>
        ))}
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <span className={label}>Tax year</span>
            <input className={input} value={f.year} onChange={set("year")} />
          </div>
          <div>
            <span className={label}>Return</span>
            <input className={input} value={f.form} onChange={set("form")} />
          </div>
          <div>
            <span className={label}>Liability ({cur})</span>
            <input className={input} inputMode="decimal" value={f.liability} onChange={set("liability")} />
          </div>
          <div>
            <span className={label}>{code === "IN" ? "Paid so far (TDS, advance tax)" : "Paid or withheld"}</span>
            <input className={input} inputMode="decimal" value={f.withheld} onChange={set("withheld")} />
          </div>
          <div>
            <span className={label}>Return due</span>
            <input type="date" className={input} value={f.due ?? ""} onChange={set("due")} />
          </div>
          <div>
            <span className={label}>Status</span>
            <select className={input} value={f.status} onChange={set("status")}>
              <option value="estimate">Estimate</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
          <div>
            <span className={label}>Next payment due</span>
            <input type="date" className={input} value={f.nextDate} onChange={set("nextDate")} />
          </div>
          <div>
            <span className={label}>Next payment amount</span>
            <input className={input} inputMode="decimal" value={f.nextAmount} onChange={set("nextAmount")} />
          </div>
          <div className="col-span-2">
            <span className={label}>What it rests on (the customer sees this)</span>
            <textarea className={cn(input, "h-16 py-2")} value={f.basis} onChange={set("basis")} placeholder="e.g. Salary from July, Pune rent and deposit interest, as RNOR" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="h-9 rounded-md border px-3 text-[13px] text-muted-foreground">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="h-9 rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
              Save and show to customer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Savings({ caseId, advisor, savings, options }: { caseId: number; advisor: string; savings: Saving[]; options: SavingOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ option: "", why: "", amount: "", deadline: "" });
  const chosen = options.find((o) => o.key === f.option);

  async function save() {
    if (!chosen || f.why.trim().length < 10 || !Number(f.amount)) return toast.error("Choose an option, say why it applies and how much it could save");
    setBusy(true);
    try {
      await addSaving(caseId, { option: f.option, why: f.why, amount: Number(f.amount), deadline: f.deadline || null, by: advisor });
      toast.success("Added. The customer sees it now.");
      setF({ option: "", why: "", amount: "", deadline: "" });
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  async function withdraw(id: number) {
    setWithdrawing(id);
    try {
      await withdrawSaving(id, advisor);
      toast.success("Withdrawn. The customer no longer sees it.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't withdraw it");
    } finally {
      setWithdrawing(null);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5" aria-label="Ways to save">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">Ways to save</h3>
        {!open && (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add one
          </button>
        )}
      </header>
      {savings.length === 0 && !open && <p className="mt-2 text-[13.5px] text-muted-foreground">None yet.</p>}
      {savings.length > 0 && (
        <ul className="mt-2 divide-y">
          {savings.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-2.5 text-[13.5px]">
              <span className="min-w-0">
                <span className="block text-foreground">
                  {FLAG[s.country]} {s.title}
                </span>
                <span className="block text-[12.5px] text-muted-foreground">
                  {s.amount != null && s.currency ? `about ${formatMoneyCompact(s.amount, s.currency)}` : ""}
                  {s.deadline ? ` · by ${d(s.deadline)}` : ""} · {s.author}, {d(s.date)}
                </span>
              </span>
              <button onClick={() => withdraw(s.id)} disabled={withdrawing !== null} aria-label={`Withdraw ${s.title}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                {withdrawing === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <span className={label}>Option (set in law)</span>
            <select
              className={input}
              value={f.option}
              onChange={(e) => {
                // Start the reason from what the law allows; the expert edits it for this customer.
                const o = options.find((x) => x.key === e.target.value);
                const prev = options.find((x) => x.key === f.option);
                setF({ ...f, option: e.target.value, why: !f.why || f.why === prev?.what ? o?.what ?? "" : f.why });
              }}
            >
              <option value="">Choose…</option>
              {(["IN", "US"] as Code[]).map((c) => (
                <optgroup key={c} label={NAME[c]}>
                  {options.filter((o) => o.country === c).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.title} ({o.law})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {chosen && <p className="mt-1 text-[12px] text-muted-foreground">{chosen.what}</p>}
          </div>
          <div className="col-span-2">
            <span className={label}>Why it applies to this customer (they see this)</span>
            <textarea className={cn(input, "h-20 py-2")} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
          </div>
          <div>
            <span className={label}>Could save about ({chosen?.country === "US" ? "USD" : "INR"})</span>
            <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div>
            <span className={label}>Act by (optional)</span>
            <input type="date" className={input} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="h-9 rounded-md border px-3 text-[13px] text-muted-foreground">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="h-9 rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
              Save and show to customer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
