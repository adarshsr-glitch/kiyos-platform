"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/lib/customer-context";
import { LockedFeatureCard } from "@/components/portal/locked-feature-card";
import { InitialReportView } from "@/components/portal/initial-report-view";
import { AssessmentLoading } from "./assessment-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function AssessmentClient({ children }: { children: React.ReactNode }) {
  const { tier } = useCustomer();
  const [showFreeReport, setShowFreeReport] = useState(false);

  useEffect(() => {
    if (tier === "free") {
      const timer = setTimeout(() => setShowFreeReport(true), 3500);
      return () => clearTimeout(timer);
    }
  }, [tier]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Your tax assessment
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tier === "premium"
            ? "Here's what our analysis has found so far. Every conclusion is backed by specific tax rules and statutes."
            : "Here's your initial assessment. Upgrade for a comprehensive, advisor-reviewed analysis."}
        </p>
      </div>

      {tier === "free" && !showFreeReport && <AssessmentLoading />}

      {tier === "free" && showFreeReport && (
        <>
          <div className="flex items-center gap-2 justify-center">
            <Badge
              variant="outline"
              className="text-[10px] border-amber-300 text-amber-800"
            >
              Preliminary
            </Badge>
            <span className="text-xs text-muted-foreground">
              Based on information you provided during onboarding
            </span>
          </div>
          <InitialReportView />
          <LockedFeatureCard
            title="Comprehensive tax assessment"
            description="Get a detailed, rule-backed analysis with derivation trails, advisor sign-off and actionable recommendations. Includes DTAA treaty analysis, FTC optimisation and compliance review."
          />
          <div className="flex justify-center pt-2">
            <Button asChild size="lg" className="rounded-full px-8 gap-2">
              <Link href="/portal/upgrade">
                Unlock full assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}

      {tier === "premium" && children}
    </div>
  );
}
