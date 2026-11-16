"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, MessageCirclePlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { listCases, startDemoJourney } from "@/lib/api";
import { setPortalCase, useCustomer } from "@/lib/customer-context";
import { JOURNEY_LABEL } from "@/lib/tier";
import type { CaseListItem, Journey } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One persona per stage of the funnel, in journey order. */
const STAGES: Journey[] = ["intake", "signup", "free", "payment_pending", "paid"];
const DETAIL: Record<Journey, string> = {
  intake: "Halfway through the five-minute scan on WhatsApp",
  signup: "Scan done; opening the workspace link for the first time",
  free: "Free plan: general answers only, personal questions get the plans",
  payment_pending: "Chose Full service, but the payment failed",
  paid: "Paid, six weeks in: documents, a profile change, an expert question",
};

/** Prototype control: which customer the portal shows. Not part of the product. */
export function DemoSwitcher() {
  const { caseData, tier } = useCustomer();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<CaseListItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listCases().then(setPeople).catch(() => {});
  }, [open]);

  // The first customer at each stage; Arjun (case 1) stands for paid.
  const personas = STAGES.map((stage) =>
    stage === "paid"
      ? people.find((p) => p.id === 1)
      : people.filter((p) => p.journey === stage).sort((a, b) => a.id - b.id)[0]
  ).filter((p): p is CaseListItem => !!p);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const label =
    tier === "onboarding" && caseData.client_name === "New customer"
      ? "New enquiry · scan in progress"
      : `${caseData.client_name} · ${JOURNEY_LABEL[caseData.journey].toLowerCase()}`;

  async function startNew() {
    setBusy(true);
    try {
      const { case_id } = await startDemoJourney();
      setPortalCase(case_id);
      setOpen(false);
      router.push("/portal/welcome");
      router.refresh();
    } catch {
      toast.error("Couldn't start a new journey — is the API running?");
    } finally {
      setBusy(false);
    }
  }

  function show(id: number) {
    setPortalCase(id);
    setOpen(false);
    router.push("/portal");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="font-medium uppercase tracking-wide text-[10px]">Demo</span>
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg">
          <DemoOption
            icon={<MessageCirclePlus className="h-4 w-4" />}
            title="New customer on WhatsApp"
            detail="Start fresh: five-minute scan, free questions, then choose a plan"
            onClick={startNew}
            busy={busy}
          />
          {personas.length > 0 && <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Customers by stage</p>}
          {personas.map((p) => (
            <DemoOption
              key={p.id}
              icon={<UserRound className="h-4 w-4" />}
              title={`${p.client_name} — ${JOURNEY_LABEL[p.journey].toLowerCase()}`}
              detail={DETAIL[p.journey]}
              onClick={() => show(p.id)}
              active={caseData.id === p.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemoOption({
  icon,
  title,
  detail,
  onClick,
  busy,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  busy?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn("flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted", active && "bg-muted")}
    >
      <span className="mt-0.5 text-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}</span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
