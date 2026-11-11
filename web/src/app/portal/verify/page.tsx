import { getCase } from "@/lib/api";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage() {
  const caseData = await getCase(1);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Check your details
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve pre-filled this from your documents and conversations. Correct anything
          that&apos;s wrong, then confirm — your advisor works from what you confirm here.
        </p>
      </div>
      <VerifyForm caseData={caseData} />
    </div>
  );
}
