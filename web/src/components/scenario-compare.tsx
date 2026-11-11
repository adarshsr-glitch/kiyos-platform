import type { Scenario } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function ScenarioCompare({ scenarios }: { scenarios: Scenario[] }) {
  if (scenarios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No scenarios modelled for this case yet.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((s) => (
        <Card
          key={s.id}
          className={cn(
            "relative",
            s.recommended && "border-primary/40 bg-primary/5 shadow-sm"
          )}
        >
          {s.recommended && (
            <div className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              <Star className="h-3 w-3 fill-current" />
              Recommended
            </div>
          )}
          <CardContent className="p-4 space-y-3">
            <h3 className="font-serif text-lg leading-tight">{s.label}</h3>

            {s.assumptions && s.assumptions.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Assumptions
                </p>
                <ul className="space-y-0.5 text-xs">
                  {s.assumptions.map((a, i) => (
                    <li key={i} className="flex gap-1.5 text-foreground/80">
                      <span className="text-muted-foreground">·</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.results && s.results.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Outputs
                </p>
                <ul className="space-y-1">
                  {s.results.map((r, i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-2 text-xs border-b last:border-0 py-1"
                    >
                      <span className="text-muted-foreground">{r.metric}</span>
                      <span className="font-medium text-foreground tabular-nums text-right">
                        {r.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
