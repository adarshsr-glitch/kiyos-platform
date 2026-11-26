import { readLink } from "@/lib/residency";
import { LinkState } from "@/components/portal/link-state";
import { PayPage } from "@/components/portal/pay-page";

export const metadata = { title: "Payment · Kiyos" };

export const dynamic = "force-dynamic";

/** The payment magic link from WhatsApp: pre-filled payment page, or why it can't be used. */
export default async function PayLinkPage({ params }: { params: { token: string } }) {
  const link = await readLink(params.token).catch(() => null);
  if (!link || link.status === "invalid" || link.purpose !== "pay") return <LinkState status="invalid" />;
  if (link.status === "expired") return <LinkState status="expired" token={params.token} purpose="pay" />;
  return <PayPage token={params.token} link={link} />;
}
