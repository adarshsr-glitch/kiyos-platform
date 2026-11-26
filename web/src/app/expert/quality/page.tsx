import { PageBar, PageHeader } from "@/components/page-header";
import { EvalRunner } from "./eval-runner";

export const metadata = { title: "Agent quality · Kiyos experts" };

/** The agent's evaluation set: fixed questions, what a good answer must do, and the last run. */
export default function QualityPage() {
  return (
    <div className="flex h-full flex-col">
      <PageBar crumbs={[{ label: "Agent quality" }]} />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
          <PageHeader
            dense
            title="Agent quality"
            meta="The evaluation set: fixed questions with what a good answer must do. Classify general vs personal correctly, answer only from an approved rule and cite it, and hand off instead of guessing when no approved rule covers it. Runs the same agent customers talk to on WhatsApp. Nothing is saved."
          />
          <EvalRunner />
        </div>
      </div>
    </div>
  );
}
