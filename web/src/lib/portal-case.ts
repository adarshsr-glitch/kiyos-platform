import { cookies } from "next/headers";

/** Cookie naming the demo customer the portal is showing (prototype has no auth). */
export const PORTAL_CASE_COOKIE = "kiyos-case";
export const DEFAULT_PORTAL_CASE = 1;

/** Server components: which case the customer portal renders. */
export function portalCaseId(): number {
  const raw = cookies().get(PORTAL_CASE_COOKIE)?.value;
  const id = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(id) && id > 0 ? id : DEFAULT_PORTAL_CASE;
}
