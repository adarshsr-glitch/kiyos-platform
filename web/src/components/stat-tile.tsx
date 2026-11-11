import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  icon,
  hint,
  trend,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
  trend?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "transition-colors",
        accent && "border-primary/30 bg-primary/5",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={cn(
          "mt-2 font-semibold tabular-nums leading-tight",
          typeof value === "string" && value.length > 6 ? "text-xl" : "text-2xl",
          accent && "text-primary"
        )}>
          {value}
        </p>
        <div className="mt-1 flex items-center justify-between text-[10px]">
          {hint && <span className="text-muted-foreground">{hint}</span>}
          {trend && <span className="text-primary font-medium">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
