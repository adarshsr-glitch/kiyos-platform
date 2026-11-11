"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingCards } from "@/components/portal/pricing-card";
import { UpgradeComparison } from "@/components/portal/upgrade-comparison";
import { useCustomer } from "@/lib/customer-context";
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";

export default function UpgradePage() {
  const { upgradeToPremium, tier } = useCustomer();
  const router = useRouter();

  const handleUpgrade = () => {
    upgradeToPremium();
    router.push("/portal/dashboard");
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
          <Sparkles className="h-3 w-3" />
          Unlock your full experience
        </div>
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Get your comprehensive assessment
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          {tier === "free"
            ? "You've seen your initial report. Upgrade to get a detailed tax assessment, document review and dedicated advisor support."
            : "Unlock the full Kiyos experience with comprehensive tax advisory and filing services."}
        </p>
      </div>

      {/* Value props */}
      <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Detailed analysis
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Comprehensive DTAA treaty analysis, FTC optimisation and
              jurisdiction-specific insights.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Document review
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload all relevant documents for expert review and automated
              data extraction.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Advisor support
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dedicated case captain, quarterly calls and year-round email or
              WhatsApp support.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <div>
        <h2 className="text-center text-sm font-semibold text-foreground mb-4">
          What&apos;s included in each plan
        </h2>
        <UpgradeComparison />
      </div>

      {/* Pricing cards */}
      <div>
        <h2 className="text-center text-sm font-semibold text-foreground mb-4">
          Choose your plan
        </h2>
        <PricingCards onSelect={handleUpgrade} />
      </div>

      {/* Advisor note */}
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Not sure which plan is right for you?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your advisor can help you choose the best option based on your
                specific situation. Complexity add-ons (PFIC analysis, property
                liquidation, estate planning) are quoted separately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="flex justify-center pt-2 pb-4">
        <Button
          size="lg"
          className="rounded-full px-8 gap-2"
          onClick={handleUpgrade}
        >
          Upgrade now
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
