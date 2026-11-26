import { PageBar } from "@/components/page-header";
import { RulesLibrary, type LibraryRule } from "@/components/expert/rules-library";
import { RulesImport, type Version } from "./rules-import";

export const metadata = { title: "Rules · Kiyos experts" };
export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Rules: the library of tax rules Kiyos applies, as the engine loads them, with each rule's
 * tests run on the spot and where it has been cited. Rule files live under knowledge/; the
 * spreadsheet import adds versions that wait for validation.
 */
export default async function RulesPage() {
  const [rules, versions] = await Promise.all([
    fetch(`${BASE}/rules`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<LibraryRule[]>) : [])).catch(() => [] as LibraryRule[]),
    fetch(`${BASE}/rules/versions`, { cache: "no-store" }).then((r) => r.json() as Promise<Version[]>).catch(() => [] as Version[]),
  ]);
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Rules" }]} />
      <div className="flex-1 overflow-auto bg-[#F5F4F0]">
        <div className="mx-auto max-w-[1208px] px-4 pb-14 pt-7 sm:px-8 lg:px-10">
          {rules.length === 0 ? (
            <p className="rounded-2xl bg-card px-5 py-10 text-center text-[13.5px] text-muted-foreground">No rules are loaded. Rule files live under knowledge/&lt;country&gt;/&lt;year&gt;/&lt;topic&gt;/ in the repository.</p>
          ) : (
            <RulesLibrary rules={rules} versions={<RulesImport versions={versions} />} />
          )}
        </div>
      </div>
    </div>
  );
}
