import type { ActionItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, Circle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomerActionList({ items }: { items: ActionItem[] }) {
  const customerItems = items.filter((i) => i.assignee === "customer");

  if (customerItems.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground italic">
        No action items for you right now.
      </div>
    );
  }

  const open = customerItems.filter((i) => i.status === "open" || i.status === "blocked");
  const done = customerItems.filter((i) => i.status === "done");

  return (
    <div className="space-y-3">
      {open.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            To do
          </h4>
          {open.map((item) => (
            <ActionCard key={item.id} item={item} />
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </h4>
          {done.map((item) => (
            <ActionCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({ item }: { item: ActionItem }) {
  const isOverdue =
    item.due_date &&
    item.status !== "done" &&
    new Date(item.due_date) < new Date();

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        item.status === "done" && "bg-muted/40 opacity-70",
        item.status === "blocked" && "border-amber-200 bg-amber-50/40",
        isOverdue && "border-rose-200 bg-rose-50/40"
      )}
    >
      {item.status === "done" ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
      ) : item.status === "blocked" ? (
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium text-foreground",
            item.status === "done" && "line-through"
          )}
        >
          {item.title}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          {item.due_date && (
            <span
              className={cn(
                "flex items-center gap-1",
                isOverdue && "text-rose-700 font-medium"
              )}
            >
              <Calendar className="h-3 w-3" />
              {item.due_date}
              {isOverdue && " (overdue)"}
            </span>
          )}
          {item.status === "blocked" && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px] hover:bg-amber-100">
              Blocked
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="mt-1 text-[11px] text-muted-foreground italic">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}
