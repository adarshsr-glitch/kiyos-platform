import { cn } from "@/lib/utils";
import type { JourneyStage } from "@/lib/customer-context";

const STAGES: { key: JourneyStage; label: string }[] = [
  { key: "intake", label: "Onboarding" },
  { key: "initial_report", label: "Initial Report" },
  { key: "upgrade", label: "Choose Plan" },
  { key: "dashboard", label: "Full Assessment" },
  { key: "complete", label: "Complete" },
];

export function JourneyProgress({
  currentStage,
}: {
  currentStage: JourneyStage;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center justify-center gap-0 py-4 px-2">
      {STAGES.map((stage, i) => {
        const completed = i < currentIdx;
        const current = i === currentIdx;
        const future = i > currentIdx;

        return (
          <div key={stage.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors",
                  completed && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-background text-primary",
                  future && "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {completed ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-[9px] font-medium whitespace-nowrap",
                  completed && "text-primary",
                  current && "text-primary font-semibold",
                  future && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>

            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "mx-1.5 h-0.5 w-6 sm:w-10 rounded-full",
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
