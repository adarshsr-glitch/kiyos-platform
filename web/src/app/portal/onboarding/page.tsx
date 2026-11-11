"use client";

import { OnboardingForm } from "@/components/portal/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-medium text-foreground sm:text-4xl">
          Let&apos;s get started
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Tell us about your situation so we can provide an initial assessment of
          your cross-border tax position. This takes about 3 minutes.
        </p>
      </div>

      <OnboardingForm />
    </div>
  );
}
