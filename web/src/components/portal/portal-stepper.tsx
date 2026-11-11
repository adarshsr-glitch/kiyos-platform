import { cn } from "@/lib/utils";

interface Step {
  label: string;
  key: string;
}

export function PortalStepper({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: string;
}) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 py-6 px-4">
      {steps.map((step, i) => {
        const completed = i < currentIdx;
        const current = i === currentIdx;
        const future = i > currentIdx;

        return (
          <div key={step.key} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  completed &&
                    "border-primary bg-primary text-primary-foreground",
                  current &&
                    "border-primary bg-background text-primary animate-pulse",
                  future && "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {completed ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] font-medium whitespace-nowrap",
                  completed && "text-primary",
                  current && "text-primary",
                  future && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 sm:w-12 rounded-full",
                  i < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
