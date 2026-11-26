import { PageBar } from "@/components/page-header";
import { getDesk } from "@/lib/desk";
import { signedInExpert } from "@/lib/expert-session";
import { CasesBoard } from "@/components/expert/cases-board";

export const metadata = { title: "Cases · Kiyos experts" };

/** Cases (council Review 06, EX-09): the expert's book, by stage and by whose turn it is. */
export default async function CasesPage({ searchParams }: { searchParams: { all?: string; view?: string; stage?: string } }) {
  const me = signedInExpert();
  const all = searchParams.all === "1";
  const desk = await getDesk(all ? null : me?.name ?? null);
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Cases" }]} />
      <div className="flex-1 overflow-auto bg-[#F5F4F0]">
        <div className="mx-auto max-w-[1208px] px-4 pb-14 pt-7 sm:px-8 lg:px-10">
          <CasesBoard desk={desk} initialView={searchParams.view} initialStage={searchParams.stage} all={all} signedIn={!!me} />
        </div>
      </div>
    </div>
  );
}
