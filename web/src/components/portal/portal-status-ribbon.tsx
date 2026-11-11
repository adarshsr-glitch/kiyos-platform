import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
} from "lucide-react";

type StatusLevel = "done" | "pending" | "action";

interface StatusIndicator {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  level: StatusLevel;
}

const DOT_COLORS: Record<StatusLevel, string> = {
  done: "bg-emerald-500",
  pending: "bg-amber-500",
  action: "bg-rose-500",
};

export function PortalStatusRibbon({
  openItems,
  totalDocs,
  extractedDocs,
  assessmentStatus,
}: {
  openItems: number;
  totalDocs: number;
  extractedDocs: number;
  assessmentStatus: string;
}) {
  const assessmentLabel =
    assessmentStatus === "signed off"
      ? "Complete"
      : assessmentStatus === "in review"
        ? "In Review"
        : "Pending";

  const assessmentLevel: StatusLevel =
    assessmentStatus === "signed off"
      ? "done"
      : assessmentStatus === "in review"
        ? "pending"
        : "action";

  const indicators: StatusIndicator[] = [
    {
      label: "Open items",
      value: openItems,
      icon: <Inbox className="h-4 w-4" />,
      level: openItems > 0 ? "action" : "done",
    },
    {
      label: "Documents",
      value: `${extractedDocs}/${totalDocs}`,
      icon: <FileText className="h-4 w-4" />,
      level: extractedDocs < totalDocs ? "pending" : "done",
    },
    {
      label: "Assessment",
      value: assessmentLabel,
      icon:
        assessmentLevel === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        ),
      level: assessmentLevel,
    },
  ];

  return (
    <div className="flex items-stretch gap-px rounded-lg border bg-muted/30 overflow-hidden">
      {indicators.map((ind) => (
        <div
          key={ind.label}
          className="flex flex-1 items-center gap-2.5 bg-card px-3 py-2.5 min-w-0"
        >
          <span className="text-muted-foreground shrink-0">{ind.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {ind.label}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  DOT_COLORS[ind.level]
                )}
              />
              <span className="text-sm font-semibold text-foreground truncate capitalize">
                {ind.value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
