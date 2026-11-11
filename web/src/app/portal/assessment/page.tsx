import { getCase } from "@/lib/api";
import { AssessmentReport } from "@/components/portal/assessment-report";
import { AssessmentClient } from "./assessment-client";
import { AssessmentLoading } from "./assessment-loading";

export default async function AssessmentPage() {
  const caseData = await getCase(1);

  return (
    <AssessmentClient>
      {caseData.assessments.length === 0 ? (
        <AssessmentLoading />
      ) : (
        <AssessmentReport
          assessments={caseData.assessments}
          topics={caseData.topics}
        />
      )}
    </AssessmentClient>
  );
}
