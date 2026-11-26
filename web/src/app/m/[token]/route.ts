/**
 * A sign-in link from WhatsApp: opens the page it points at, signed in, without a code.
 * Expired or unknown links go to a page that explains and offers a fresh link.
 */

import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_CASE_COOKIE } from "@/lib/portal-case";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const res = await fetch(`${BASE}/magic-links/${encodeURIComponent(params.token)}/open`, { method: "POST", cache: "no-store" }).catch(() => null);
  const link = res && res.ok ? await res.json() : { status: "invalid" };
  if (link.status !== "valid" || link.purpose !== "signin") {
    return NextResponse.redirect(new URL(`/link?status=${link.status}&t=${encodeURIComponent(params.token)}`, req.url));
  }
  const out = NextResponse.redirect(new URL(link.target ?? "/portal", req.url));
  out.cookies.set(PORTAL_CASE_COOKIE, String(link.case_id), { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return out;
}
