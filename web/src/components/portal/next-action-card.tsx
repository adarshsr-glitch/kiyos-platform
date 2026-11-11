"use client";

import Link from "next/link";
import { ArrowRight, Upload, FileCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerTier } from "@/lib/customer-context";

interface NextActionCardProps {
  tier: CustomerTier;
  needsDocs: boolean;
  assessmentReady: boolean;
}

export function NextActionCard({
  tier,
  needsDocs,
  assessmentReady,
}: NextActionCardProps) {
  if (tier === "free") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Unlock your full assessment
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upgrade to get a comprehensive tax analysis, document review and
              dedicated advisor support.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-full gap-1.5">
            <Link href="/portal/upgrade">
              Upgrade
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (needsDocs) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Upload className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Upload your documents
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We need a few more documents to complete your assessment. Upload
              them now to keep things moving.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full gap-1.5">
            <Link href="/portal/documents">
              Upload
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (assessmentReady) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <FileCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Review your assessment
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your tax assessment is ready for review. Take a look at the
              findings and conclusions.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full gap-1.5">
            <Link href="/portal/assessment">
              Review
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
