import { redirect } from "next/navigation";

/** Triage now lives in Cases (merged 26 Nov). Old links keep working: same filters, same item. */
export default function WorkPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const p = new URLSearchParams({ view: "triage" });
  for (const [k, v] of Object.entries(searchParams)) if (v && k !== "view") p.set(k, v);
  redirect(`/expert/cases?${p}`);
}
