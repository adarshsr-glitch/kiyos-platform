"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, FileText } from "lucide-react";

type Rule = {
  jurisdiction: string;
  year: string;
  topic: string;
  slug: string;
  relPath: string;
  yaml: string;
  markdown: string | null;
  id: string | null;
  summary: string | null;
  status: string | null;
  testCaseCount: number;
};

export function RuleDialog({ rule }: { rule: Rule }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <code className="font-mono text-xs text-primary group-hover:underline">
              {rule.id ?? rule.slug}
            </code>
            {rule.status && (
              <Badge
                variant={rule.status === "active" ? "default" : "outline"}
                className="text-[10px]"
              >
                {rule.status}
              </Badge>
            )}
          </div>
          {rule.summary && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate pl-5">
              {rule.summary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {rule.testCaseCount} test{rule.testCaseCount === 1 ? "" : "s"}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-primary">
                {rule.id ?? rule.slug}
              </code>
              {rule.status && (
                <Badge
                  variant={rule.status === "active" ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {rule.status}
                </Badge>
              )}
            </div>
            <DialogTitle className="font-serif text-xl font-medium leading-tight">
              {rule.summary ?? rule.slug}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {rule.relPath}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-2">
            {rule.markdown && (
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Explainer
                </p>
                <div className="rounded-md border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {rule.markdown}
                </div>
              </section>
            )}

            <section>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Rule YAML
              </p>
              <pre className="rounded-md border bg-card p-4 text-[11px] leading-relaxed overflow-x-auto font-mono">
                {rule.yaml}
              </pre>
            </section>

            <Separator />

            <p className="text-xs text-muted-foreground">
              The engine reads this YAML, applies its logic, and emits the rule
              ID in every derivation trail that uses it. Edit this file in the
              repo and refresh this page to see changes.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
