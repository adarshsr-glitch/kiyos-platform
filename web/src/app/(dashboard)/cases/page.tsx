import { listCases } from "@/lib/api";
import { CasesTable } from "./cases-table";

export default async function CasesPage({ searchParams }: { searchParams: { stage?: string } }) {
  const cases = await listCases();

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 items-center justify-between border-b px-6 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Cases</span>
          <span className="text-muted-foreground">·</span>
          <span>{cases.length} total</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
          <section>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Cases</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every customer from their first WhatsApp message. Filter by stage to see who is still in the
              scan, on the free plan, or waiting on payment.
            </p>
          </section>

          <CasesTable cases={cases} initialStage={searchParams.stage} />
        </div>
      </div>
    </div>
  );
}
