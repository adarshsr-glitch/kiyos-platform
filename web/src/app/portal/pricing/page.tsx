"use client";

import { useRouter } from "next/navigation";
import { PricingCards } from "@/components/portal/pricing-card";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { useCustomer } from "@/lib/customer-context";

export default function PricingPage() {
  const { tier, upgradeToPremium } = useCustomer();
  const router = useRouter();

  const handleSelect = () => {
    upgradeToPremium();
    router.push("/portal/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Choose your plan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          All prices include 18% GST. USD equivalents are indicative at current
          exchange rates.
        </p>
      </div>

      <PricingCards onSelect={tier !== "premium" ? handleSelect : undefined} />

      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Your advisor will discuss the best plan for you
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complexity add-ons (PFIC analysis, property liquidation, estate
                planning) are expert-quoted separately. Includes a quarterly
                30-minute advisor call.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
