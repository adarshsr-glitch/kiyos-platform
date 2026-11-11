"use client";

import Link from "next/link";
import { ArrowRight, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomer } from "@/lib/customer-context";
import { LockedFeatureCard } from "@/components/portal/locked-feature-card";

export function DocumentsClient({ children }: { children: React.ReactNode }) {
  const { tier } = useCustomer();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Your documents
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tier === "premium"
            ? "We need these to prepare your cross-border tax assessment. Check what's received and upload any missing items."
            : "Upload core documents to get started. Upgrade for full document review and expert analysis."}
        </p>
      </div>

      {children}

      {tier === "free" && (
        <LockedFeatureCard
          title="Full document review"
          description="Upload all required documents and receive expert review, automated data extraction and compliance verification. Available with a premium plan."
        />
      )}

      {/* Forward navigation */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileCheck className="h-4 w-4" />
          <span>
            {tier === "premium"
              ? "Once your documents are uploaded, we'll update your assessment."
              : "See what we can tell you with what you've shared so far."}
          </span>
        </div>
        <Button asChild size="lg" className="rounded-full px-8 gap-2">
          <Link href="/portal/assessment">
            {tier === "premium" ? "View assessment" : "View preliminary assessment"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
