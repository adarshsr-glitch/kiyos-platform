import { getDesk } from "@/lib/desk";
import { signedInExpert } from "@/lib/expert-session";
import { Triage, type TriageFilter } from "@/components/expert/triage";

export const metadata = { title: "Triage · Kiyos experts" };

/** Triage (council Review 06, EX-06): the work, one item at a time, with its actions in place. */
export default async function WorkPage({ searchParams }: { searchParams: TriageFilter }) {
  const me = signedInExpert();
  const all = searchParams.all === "1";
  const desk = await getDesk(all ? null : me?.name ?? null);
  return (
    <div className="h-full min-h-0">
      <Triage desk={desk} me={me?.name ?? null} initial={searchParams} />
    </div>
  );
}
