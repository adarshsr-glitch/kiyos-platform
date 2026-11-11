import { listCases } from "@/lib/api";
import { CasesTable } from "./cases-table";

export default async function CasesPage() {
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
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-2">
              Case roster
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground leading-tight">
              Every household,{" "}
              <span className="font-serif italic text-primary">one view.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Search, filter and open any case. Open-item and notice badges show
              what&apos;s waiting on you at a glance.
            </p>
          </section>

          <CasesTable cases={cases} />
        </div>
      </div>
    </div>
  );
}
