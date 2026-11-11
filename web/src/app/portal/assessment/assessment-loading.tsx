"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileSearch, Shield, Calculator, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ANALYSIS_STEPS = [
  { icon: FileSearch, label: "Reviewing uploaded documents…", delay: 0 },
  { icon: Shield, label: "Checking residency & treaty positions…", delay: 2200 },
  { icon: Calculator, label: "Calculating cross-border obligations…", delay: 4400 },
  { icon: CheckCircle2, label: "Preparing your report…", delay: 6600 },
];

export function AssessmentLoading() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = ANALYSIS_STEPS.map((step, i) =>
      setTimeout(() => setActiveStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Generating your assessment
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This usually takes a few moments
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            const isFuture = i > activeStep;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500",
                  isActive && "bg-primary/5",
                  isDone && "opacity-60",
                  isFuture && "opacity-30"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                ) : (
                  <StepIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    isActive && "font-medium text-foreground",
                    isDone && "text-muted-foreground",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
