import { PageBar } from "@/components/page-header";
import { EvalRunner } from "./eval-runner";

export const metadata = { title: "Agent quality · Kiyos experts" };

/** The agent's evaluation set, by intent: the questions customers ask, in the ways they ask them. */
export default function QualityPage() {
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Agent quality" }]} />
      <div className="flex-1 overflow-auto bg-[#F5F4F0]">
        <div className="mx-auto max-w-[1208px] px-4 pb-14 pt-7 sm:px-8 lg:px-10">
          <header className="mb-6 max-w-[760px]">
            <h1 className="text-[26px] font-semibold tracking-[-0.015em] [font-family:var(--font-display),var(--font-inter),sans-serif]">Agent quality</h1>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Each intent is a question customers keep asking; each case is one way they ask it: plainly, abbreviated, in Hinglish, as a typo, or as a trap. A good answer tells general from personal, answers only from an approved rule and cites it, and hands off instead of guessing. Runs the same agent customers talk to on WhatsApp. Nothing is saved.
            </p>
          </header>
          <EvalRunner />
        </div>
      </div>
    </div>
  );
}
