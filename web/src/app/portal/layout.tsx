import { ApiError, getCase, listCases } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import type { CaseListItem } from "@/lib/types";
import { PortalShell } from "./portal-shell";
import { UseCustomer } from "./use-customer";

export const dynamic = "force-dynamic";

/** Customers with a web workspace: everyone past the WhatsApp scan. */
const SELECTABLE = new Set(["paid", "payment_pending", "free", "signup"]);

/** Portal layout — the customer workspace, viewed as one customer at a time. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const all = await listCases().catch(() => [] as CaseListItem[]);
  const customers = all.filter((c) => SELECTABLE.has(c.journey) && c.client_name !== "New customer");
  // Default: the longest-standing paid customer.
  const fallback = [...customers].filter((c) => c.journey === "paid").sort((a, b) => a.id - b.id)[0] ?? customers[0];

  let caseData;
  try {
    caseData = await getCase(portalCaseId());
  } catch (e) {
    // The remembered customer no longer exists: open the default customer instead.
    if (e instanceof ApiError && e.status === 404 && fallback) return <UseCustomer id={fallback.id} />;
    throw e;
  }
  return (
    <PortalShell caseData={caseData} conversation={null} customers={customers} fallbackId={fallback?.id ?? null}>
      {children}
    </PortalShell>
  );
}
