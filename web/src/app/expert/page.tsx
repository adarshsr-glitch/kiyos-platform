import Link from "next/link";
import { PageBar } from "@/components/page-header";
import { getDesk } from "@/lib/desk";
import { greeting, signedInExpert } from "@/lib/expert-session";
import { Heatmap, Hero, OwedCard, PreparedDeck, Runway } from "@/components/expert/desk-home";

export const metadata = { title: "Home · Kiyos experts" };

/**
 * The expert's Home (council Review 06). Where the day starts: what changed since yesterday,
 * what Kiyos prepared for a decision, and the load and filing season ahead. One desk call;
 * every number and sentence opens the records behind it in Triage.
 */
export default async function HomePage({ searchParams }: { searchParams: { all?: string } }) {
  const me = signedInExpert();
  const all = searchParams.all === "1";
  let desk;
  try {
    desk = await getDesk(all ? null : me?.name ?? null);
  } catch (e) {
    return (
      <p role="alert" className="m-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
        Can&apos;t reach the API: {e instanceof Error ? e.message : "unknown error"}
      </p>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Home" }]}>
        <span className="hidden text-[12.5px] text-muted-foreground sm:inline">{desk.mine ? `Your ${desk.customers} customers` : `All ${desk.customers} customers with a plan`}</span>
        {me && (
          <Link href={desk.mine ? "/expert?all=1" : "/expert"} className="text-[12.5px] font-medium text-[#0E3B2C] hover:underline">
            {desk.mine ? "Show everyone's" : "Show only mine"}
          </Link>
        )}
      </PageBar>
      <div className="flex-1 overflow-auto bg-[#F5F4F0]">
        <div className="mx-auto flex max-w-[1208px] flex-col gap-10 px-4 pb-14 pt-6 sm:px-8 lg:px-10">
          <Hero d={desk} name={desk.mine ? desk.expert : me?.name ?? null} greeting={greeting()} all={all} />
          <PreparedDeck d={desk} all={all} />
          <section aria-labelledby="h-weeks" className="scroll-mt-6">
            <h2 id="h-weeks" className="text-[20px] font-semibold tracking-[-0.01em] [font-family:var(--font-display),var(--font-inter),sans-serif]">
              The weeks ahead
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Load and filing season at a glance. Both count, so they keep their shape at 7 customers or 700.</p>
            <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-4">
                <Heatmap d={desk} all={all} />
                <OwedCard d={desk} me={me?.name ?? null} />
              </div>
              <Runway d={desk} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
