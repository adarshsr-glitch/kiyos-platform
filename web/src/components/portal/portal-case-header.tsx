import type { CaseDetail } from "@/lib/types";
import { Jurisdictions } from "@/components/country-chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";

export function PortalCaseHeader({ caseData }: { caseData: CaseDetail }) {
  const firstName = caseData.client_name.split(" ")[0];
  const captainInitials = caseData.case_captain
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="pb-4 border-b">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-medium text-foreground">
            Hi {firstName}, here&apos;s your case
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground truncate">
            {caseData.name}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground shrink-0">
          <Jurisdictions value={caseData.jurisdictions} />
          {caseData.tax_year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {caseData.tax_year}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                {captainInitials}
              </AvatarFallback>
            </Avatar>
            {caseData.case_captain}
          </span>
        </div>
      </div>
    </div>
  );
}
