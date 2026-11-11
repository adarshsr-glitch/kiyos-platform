import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingTier {
  name: string;
  priceIndividual: string;
  priceCouple: string;
  recommended?: boolean;
  features: string[];
}

const TIERS: PricingTier[] = [
  {
    name: "Advisory Only",
    priceIndividual: "₹29,500",
    priceCouple: "₹35,400",
    features: [
      "Full cross-border assessment",
      "Residency determination",
      "Treaty analysis (DTAA)",
      "FTC optimisation plan",
      "One quarterly 30-min advisor call",
      "Email support",
    ],
  },
  {
    name: "Full Service",
    priceIndividual: "₹47,200",
    priceCouple: "₹59,000",
    recommended: true,
    features: [
      "Everything in Advisory Only",
      "India ITR + US 1040 filing",
      "Document preparation & review",
      "Form 10EE / Schedule FA filing",
      "FBAR + FATCA compliance",
      "Year-round WhatsApp support",
      "Dedicated case captain",
    ],
  },
];

export function PricingCards({ onSelect }: { onSelect?: () => void } = {}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "relative flex flex-col rounded-xl border bg-card p-6",
            tier.recommended && "border-primary shadow-md ring-1 ring-primary/20"
          )}
        >
          {tier.recommended && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wider">
              Recommended
            </span>
          )}
          <h3 className="font-serif text-xl font-medium text-foreground">
            {tier.name}
          </h3>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {tier.priceIndividual}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / individual
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {tier.priceCouple} / couple
            </p>
            <p className="text-[10px] text-muted-foreground italic">
              Inclusive of 18% GST · USD equivalent indicative
            </p>
          </div>

          <ul className="mt-6 flex-1 space-y-2">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full"
            variant={tier.recommended ? "default" : "outline"}
            onClick={onSelect}
            disabled={!onSelect}
          >
            {onSelect ? "Select plan" : "Coming in M2"}
          </Button>
        </div>
      ))}
    </div>
  );
}
