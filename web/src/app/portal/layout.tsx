import { getCase } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { PortalShell } from "./portal-shell";

export const dynamic = "force-dynamic";

/** Portal layout — the customer workspace. Conversation happens on WhatsApp, not here. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const caseData = await getCase(portalCaseId());
  return (
    <PortalShell caseData={caseData} conversation={null}>
      {children}
    </PortalShell>
  );
}
