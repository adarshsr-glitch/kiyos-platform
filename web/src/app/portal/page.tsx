import { redirect } from "next/navigation";
import { getCase } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { homeFor } from "@/lib/tier";

/** Send the customer to the right place for where they are in the journey. */
export default async function PortalRootPage() {
  redirect(homeFor((await getCase(portalCaseId())).journey));
}
