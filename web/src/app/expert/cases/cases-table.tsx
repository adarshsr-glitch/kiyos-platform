"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, FileText, Search, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY_LABEL } from "@/lib/tier";
import type { CaseListItem, Journey } from "@/lib/types";

const STAGES = Object.keys(JOURNEY_LABEL) as Journey[];

/** The expert Home's queues ("Needs an expert"): each opens this list filtered to the customers in it. */
const QUEUES: Record<string, { label: string; has: (c: CaseListItem) => boolean }> = {
  questions: { label: "Questions from customers", has: (c) => (c.open_tickets_count ?? 0) > 0 },
  signoff: { label: "Assessments to sign off", has: (c) => (c.awaiting_signoff_count ?? 0) > 0 },
  notices: { label: "Tax authority notices", has: (c) => c.open_notices_count > 0 },
  items: { label: "Open action items", has: (c) => c.open_items_count > 0 },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("");
}

export function CasesTable({ cases, initialStage, queue: queueKey }: { cases: CaseListItem[]; initialStage?: string; queue?: string }) {
  const queue = queueKey ? QUEUES[queueKey] ?? null : null;
  const [query, setQuery] = useState("");
  const [stageFilter] = useState<string>(
    STAGES.includes(initialStage as Journey) ? initialStage! : "all"
  );
  // Signed in: the expert's own customers first, everyone's on request. No list of colleagues.
  const [me, setMe] = useState<string | null>(null);
  const [mine, setMine] = useState(!queue);
  useEffect(() => {
    const raw = document.cookie.split("; ").find((c) => c.startsWith("kiyos-expert="))?.split("=")[1];
    try {
      setMe(raw ? JSON.parse(decodeURIComponent(raw)).name ?? null : null);
    } catch {
      setMe(null);
    }
  }, []);
  const captainFilter = me && mine ? me : "all";
  const jurFilter = "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Experts work with customers who have a plan; earlier stages are the agent's.
    return cases.filter((c) => {
      if (c.journey !== "paid") return false;
      if (queue && !queue.has(c)) return false;
      if (stageFilter !== "all" && c.journey !== stageFilter) return false;
      if (captainFilter !== "all" && c.case_captain !== captainFilter) return false;
      if (jurFilter !== "all" && !(c.jurisdictions ?? "").includes(jurFilter)) return false;
      if (!q) return true;
      return (
        c.client_name.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.case_captain.toLowerCase().includes(q)
      );
    });
  }, [cases, query, stageFilter, captainFilter, jurFilter, queue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, case or expert…"
            className="pl-9"
          />
        </div>

        {me && (
          <FilterChips
            label="Show"
            icon={<Users className="h-3.5 w-3.5" />}
            values={["mine", "all"]}
            labels={{ mine: "My customers", all: "Everyone" }}
            selected={mine ? "mine" : "all"}
            onSelect={(v) => setMine(v === "mine")}
          />
        )}
      </div>

      {queue && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-primary">{queue.label}</span>
          {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          <Link href="/expert/cases" className="font-medium text-foreground underline-offset-4 hover:underline">Show all customers</Link>
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center">
          <p className="text-sm font-medium">{queue && !query ? `Nobody in “${queue.label}” right now` : "No cases match your filters"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing the search or widening the filter set.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Customer</TableHead>
                <TableHead>Expert</TableHead>
                <TableHead>Tax year</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="group relative cursor-pointer">
                  <TableCell>
                    {/* The link covers the whole row (after:inset-0), so any part of it opens the case. */}
                    <Link
                      href={`/expert/cases/${c.id}`}
                      className="flex items-center gap-3 after:absolute after:inset-0 after:content-['']"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {initials(c.client_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                          {c.client_name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[270px]">
                          {c.name}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-sm", c.case_captain === "Unassigned" ? "text-muted-foreground" : "text-foreground/80")}>
                      {c.case_captain === "Unassigned" ? "Assigned on payment" : c.case_captain}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.tax_year ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {c.open_topics_count > 0 && (
                        <span
                          title="open topics"
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary tabular-nums"
                        >
                          <FileText className="h-3 w-3" />
                          {c.open_topics_count}
                          <span className="sr-only"> open topics</span>
                        </span>
                      )}
                      {c.open_items_count > 0 && (
                        <span
                          title="open action items"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 tabular-nums"
                        >
                          <Clock className="h-3 w-3" />
                          {c.open_items_count}
                          <span className="sr-only"> open action items</span>
                        </span>
                      )}
                      {c.open_notices_count > 0 && (
                        <span
                          title="open notices"
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 tabular-nums"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {c.open_notices_count}
                          <span className="sr-only"> open notices</span>
                        </span>
                      )}
                      {c.open_topics_count === 0 &&
                        c.open_items_count === 0 &&
                        c.open_notices_count === 0 && (
                          <Badge variant="outline" className="text-[10px]">clear</Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(c.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FilterChips({
  label,
  icon,
  values,
  labels,
  selected,
  onSelect,
}: {
  label: string;
  icon?: React.ReactNode;
  values: string[];
  labels?: Record<string, string>;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-1">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onSelect(v)}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
              v === selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {labels?.[v] ?? (v === "all" ? "All" : v)}
          </button>
        ))}
      </div>
    </div>
  );
}
