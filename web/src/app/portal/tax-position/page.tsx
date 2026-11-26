import { getCase, getInitialScan } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { moved } from "@/lib/moved";
import { TaxPosition } from "@/components/portal/tax-position";
import { getResidency } from "@/lib/residency";

export const metadata = { title: "Tax position · Kiyos" };

/** A paid customer's position in both countries. Before a plan, the free Assessment stands in. */
export default async function TaxPositionPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const id = portalCaseId();
  const caseData = await getCase(id);
  if (tierOf(caseData) !== "premium") moved("/portal/assessment", searchParams);

  const [scan, residency] = await Promise.all([getInitialScan(id), getResidency(id).catch(() => null)]);
  return <TaxPosition caseData={caseData} scan={scan} residency={residency} />;
}
