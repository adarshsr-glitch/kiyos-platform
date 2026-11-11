"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Jurisdictions } from "@/components/country-chip";
import { Clock, FileText, Search, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseListItem } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("");
}

export function CasesTable({ cases }: { cases: CaseListItem[] }) {
  const [query, setQuery] = useState("");
  const [captainFilter, setCaptainFilter] = useState<string>("all");
  const [jurFilter, setJurFilter] = useState<string>("all");

  const captains = useMemo(
    () => Array.from(new Set(cases.map((c) => c.case_captain))),
    [cases]
  );
  const jurisdictions = useMemo(
    () =>
      Array.from(
        new Set(
          cases.flatMap((c) =>
            (c.jurisdictions ?? "").split(",").map((j) => j.trim()).filter(Boolean)
          )
        )
      ),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (captainFilter !== "all" && c.case_captain !== captainFilter) return false;
      if (jurFilter !== "all" && !(c.jurisdictions ?? "").includes(jurFilter)) return false;
      if (!q) return true;
      return (
        c.client_name.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.case_captain.toLowerCase().includes(q)
      );
    });
  }, [cases, query, captainFilter, jurFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client, case or captain…"
            className="pl-9"
          />
        </div>

        <FilterChips
          label="Captain"
          icon={<Users className="h-3.5 w-3.5" />}
          values={["all", ...captains]}
          selected={captainFilter}
          onSelect={setCaptainFilter}
        />
        <FilterChips
          label="Jurisdiction"
          values={["all", ...jurisdictions]}
          selected={jurFilter}
          onSelect={setJurFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center">
          <p className="text-sm font-medium">No cases match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing the search or widening the filter set.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[340px]">Client</TableHead>
                <TableHead>Captain</TableHead>
                <TableHead>Jurisdictions</TableHead>
                <TableHead>Tax year</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="group cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-3"
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
                    <span className="text-sm text-foreground/80">{c.case_captain}</span>
                  </TableCell>
                  <TableCell>
                    <Jurisdictions value={c.jurisdictions} />
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
                        </span>
                      )}
                      {c.open_items_count > 0 && (
                        <span
                          title="open action items"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 tabular-nums"
                        >
                          <Clock className="h-3 w-3" />
                          {c.open_items_count}
                        </span>
                      )}
                      {c.open_notices_count > 0 && (
                        <span
                          title="open notices"
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 tabular-nums"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {c.open_notices_count}
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
  selected,
  onSelect,
}: {
  label: string;
  icon?: React.ReactNode;
  values: string[];
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
            {v === "all" ? "All" : v}
          </button>
        ))}
      </div>
    </div>
  );
}
