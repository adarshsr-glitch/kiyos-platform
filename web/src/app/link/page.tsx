import { readLink } from "@/lib/residency";
import { LinkState } from "@/components/portal/link-state";

export const metadata = { title: "Link · Kiyos" };

/** Where an unusable WhatsApp link lands: expired, already used or not recognised. */
export default async function LinkPage({ searchParams }: { searchParams: { status?: string; t?: string } }) {
  const status = searchParams.status === "expired" || searchParams.status === "used" ? searchParams.status : "invalid";
  const info = searchParams.t ? await readLink(searchParams.t).catch(() => null) : null;
  return <LinkState status={status} token={searchParams.t} purpose={info?.purpose ?? null} />;
}
