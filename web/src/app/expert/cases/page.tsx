import { PageBar } from "@/components/page-header";
import { getDesk } from "@/lib/desk";
import { signedInExpert } from "@/lib/expert-session";
import { CasesBoard } from "@/components/expert/cases-board";
import { Triage, type TriageFilter } from "@/components/expert/triage";
import { ViewSwitch } from "@/components/expert/view-switch";

export const metadata = { title: "Cases · Kiyos experts" };

/**
 * Cases: the expert's work, two ways (council Review 06, merged 26 Nov). "By customer" is the
 * book: stages, views and every reason each customer needs you. "Triage" is the same work one
 * item at a time, done in place. One desk call feeds both, so they never disagree.
 */
export default async function CasesPage({ searchParams }: { searchParams: TriageFilter & { view?: string; stage?: string } }) {
  const me = signedInExpert();
  const all = searchParams.all === "1";
  const triage = searchParams.view === "triage";
  const desk = await getDesk(all ? null : me?.name ?? null);
  const open = desk.queue.filter((r) => r.tier !== "later").length;
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Cases" }]}>
        <ViewSwitch view={triage ? "triage" : "customers"} open={open} all={all} />
      </PageBar>
      {triage ? (
        <div className="min-h-0 flex-1">
          <Triage desk={desk} me={me?.name ?? null} initial={searchParams} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-[#F5F4F0]">
          <div className="mx-auto max-w-[1208px] px-4 pb-14 pt-7 sm:px-8 lg:px-10">
            <CasesBoard desk={desk} initialView={searchParams.view === "customers" ? undefined : searchParams.view} initialStage={searchParams.stage} all={all} signedIn={!!me} />
          </div>
        </div>
      )}
    </div>
  );
}
