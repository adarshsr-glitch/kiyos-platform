"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { InitialReportView } from "@/components/portal/initial-report-view";
import { useCustomer } from "@/lib/customer-context";

export default function InitialReportPage() {
  const { onboardingData } = useCustomer();
  const firstName =
    onboardingData.personalInfo?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
          <Sparkles className="h-3 w-3" />
          Your initial report is ready
        </div>
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Hi {firstName}, here&apos;s what we found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          Based on the information you provided, we&apos;ve identified several
          areas that may affect your cross-border tax position. This is a
          preliminary overview.
        </p>
      </div>

      <InitialReportView />

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Button asChild size="lg" className="rounded-full px-8 gap-2">
          <Link href="/portal/upgrade">
            Get your full assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
        >
          <Link href="/portal/dashboard">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Go to your dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
