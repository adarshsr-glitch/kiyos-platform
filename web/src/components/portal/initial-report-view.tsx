"use client";

import { useCustomer } from "@/lib/customer-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  TrendingUp,
} from "lucide-react";

export function InitialReportView() {
  const { onboardingData } = useCustomer();

  const nationalities =
    onboardingData.personalInfo?.nationalities?.join(", ") ?? "Not provided";
  const currentCountry =
    onboardingData.personalInfo?.currentCountry ?? "Not provided";
  const primaryIncome = onboardingData.income?.sources?.[0];
  const residencyStatus =
    onboardingData.residency?.currentStatus ?? "Not provided";

  const hasMultipleJurisdictions =
    (onboardingData.personalInfo?.nationalities?.length ?? 0) > 1 ||
    (onboardingData.residency?.previousCountry &&
      onboardingData.residency.previousCountry !== currentCountry);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Overview */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Cross-border overview
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nationalities
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {nationalities}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Current residence
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {currentCountry}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Residency status
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {residencyStatus}
              </p>
            </div>
            {primaryIncome && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Primary income
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {primaryIncome.type} ({primaryIncome.country})
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Potential areas of attention */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Potential areas of attention
            </h3>
            <Badge variant="outline" className="text-[10px] ml-auto">
              Preliminary
            </Badge>
          </div>
          <ul className="space-y-2.5">
            {hasMultipleJurisdictions && (
              <li className="flex items-start gap-2.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    Dual tax residency risk
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Based on your nationalities and residency history, you may
                    have tax obligations in multiple jurisdictions. A DTAA
                    analysis can help determine treaty benefits.
                  </p>
                </div>
              </li>
            )}
            <li className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  Foreign asset reporting
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {onboardingData.assets?.items?.length
                    ? `You reported ${onboardingData.assets.items.length} foreign asset(s). These may require FBAR and FATCA reporting depending on thresholds.`
                    : "Foreign bank accounts and assets above certain thresholds require FBAR and FATCA reporting."}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  Income tax filing obligations
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your income sources may require filing in both jurisdictions.
                  Foreign Tax Credits (FTC) and treaty provisions can help avoid
                  double taxation.
                </p>
              </div>
            </li>
            {primaryIncome &&
              primaryIncome.country !== currentCountry && (
                <li className="flex items-start gap-2.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      Cross-border employment income
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your primary income is sourced from a different country
                      than your residence, which has specific tax implications
                      regarding withholding and credit mechanisms.
                    </p>
                  </div>
                </li>
              )}
          </ul>
        </CardContent>
      </Card>

      {/* What this report covers */}
      <Card className="bg-muted/30">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              What this report includes
            </h3>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 pl-6">
            <li>High-level residency and jurisdiction assessment</li>
            <li>Identification of potential reporting obligations</li>
            <li>Summary of areas requiring further investigation</li>
          </ul>
          <p className="text-[10px] text-muted-foreground italic pt-1">
            This is a preliminary overview based on the information you
            provided. A comprehensive assessment requires document verification
            and detailed analysis by our advisors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
