"use client";

import { Briefcase, User } from "lucide-react";
import { useView, type ViewMode } from "@/lib/view-context";
import { cn } from "@/lib/utils";

const SEGMENTS: { mode: ViewMode; label: string; icon: typeof Briefcase }[] = [
  { mode: "captain", label: "Captain", icon: Briefcase },
  { mode: "customer", label: "Customer", icon: User },
];

export function ViewToggle({ className }: { className?: string }) {
  const { mode, setMode } = useView();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border bg-muted/50 p-0.5",
        className
      )}
    >
      {SEGMENTS.map((seg) => {
        const active = mode === seg.mode;
        const Icon = seg.icon;
        return (
          <button
            key={seg.mode}
            onClick={() => setMode(seg.mode)}
            aria-label={`${seg.label} view`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
