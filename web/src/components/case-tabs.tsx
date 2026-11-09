"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CaseDetail, AiCallEntry, DerivationStep } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RuleChip({ ruleId }: { ruleId: string }) {
  const [ruleData, setRuleData] = useState<{
    summary: string;
    markdown: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const fetchRule = async () => {
    if (ruleData) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rules/${ruleId}`);
      if (res.ok) {
        setRuleData(await res.json());
      } else {
        setRuleData({ summary: "Rule details coming soon", markdown: null });
      }
    } catch {
      setRuleData({ summary: "Could not load rule", markdown: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          onClick={fetchRule}
          className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          {ruleId}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{ruleId}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : ruleData?.markdown ? (
          <div className="prose prose-sm max-w-none py-2 text-sm">
            {ruleData.markdown}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            {ruleData?.summary ?? "Rule details coming soon"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OverviewTab({ caseData }: { caseData: CaseDetail }) {
  const jurisdictions = caseData.jurisdictions?.split(",") ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{caseData.client_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {caseData.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseData.summary}
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {caseData.arrival_date && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Arrival in India
                </p>
                <p className="text-sm font-medium">
                  {formatDate(caseData.arrival_date)}
                </p>
              </div>
            )}
            {caseData.tax_year && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tax year
                </p>
                <p className="text-sm font-medium">{caseData.tax_year}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Status
              </p>
              <Badge variant="default" className="mt-1">
                {caseData.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Jurisdictions
              </p>
              <div className="mt-1 flex gap-1">
                {jurisdictions.map((j) => (
                  <span
                    key={j}
                    className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {j.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Case captain:</span>
            <span className="font-medium text-foreground">
              {caseData.case_captain}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab({ caseData }: { caseData: CaseDetail }) {
  if (caseData.documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-3xl">📄</div>
        <h3 className="text-sm font-semibold text-foreground">
          No documents yet
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Document upload is coming in week 7. Documents uploaded to this case
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caseData.documents.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.filename}</TableCell>
              <TableCell className="text-muted-foreground">
                {d.doc_type ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{d.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FactsTab({ caseData }: { caseData: CaseDetail }) {
  if (caseData.facts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-3xl">📊</div>
        <h3 className="text-sm font-semibold text-foreground">
          No facts recorded
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Facts will be populated from document extraction and captain input.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>As of</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caseData.facts.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-mono text-xs">{f.key}</TableCell>
              <TableCell className="text-sm">{f.value}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {f.unit ?? "—"}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                    f.source === "captain-entered"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.source ?? "—"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {f.as_of ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DerivationTimeline({ trail }: { trail: DerivationStep[] }) {
  return (
    <div className="relative ml-3 border-l border-border pl-6 space-y-4">
      {trail.map((step, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border bg-card text-xs font-medium">
            {i + 1}
          </div>
          <div>
            <RuleChip ruleId={step.rule_id} />
            <p className="mt-1 text-sm text-muted-foreground">
              {step.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssessmentsTab({ caseData }: { caseData: CaseDetail }) {
  if (caseData.assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-3xl">📐</div>
        <h3 className="text-sm font-semibold text-foreground">
          No assessments yet
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Assessments are generated by the deterministic engine. They will
          appear here once the engine runs on this case&apos;s facts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {caseData.assessments.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-semibold">
                {a.headline}
              </CardTitle>
              <Badge
                variant={a.status === "final" ? "default" : "secondary"}
              >
                {a.status}
              </Badge>
            </div>
            {a.amount != null && (
              <p className="text-2xl font-bold text-primary">
                {a.currency === "INR" ? "₹" : "$"}
                {a.amount.toLocaleString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {a.derivation_trail && a.derivation_trail.length > 0 ? (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Derivation trail
                </p>
                <DerivationTimeline trail={a.derivation_trail} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No derivation trail available for this assessment.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditTab({ auditLog }: { auditLog: AiCallEntry[] }) {
  if (auditLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-3xl">📝</div>
        <h3 className="text-sm font-semibold text-foreground">
          No AI calls logged
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Every AI call will be logged here for audit purposes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Latency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLog.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatTimestamp(a.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {a.service}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {a.model}
              </TableCell>
              <TableCell className="text-right text-sm">
                {a.prompt_tokens + a.completion_tokens}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {a.latency_ms}ms
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CaseTabs({
  caseData,
  auditLog,
}: {
  caseData: CaseDetail;
  auditLog: AiCallEntry[];
}) {
  return (
    <Tabs defaultValue="overview" className="flex-1">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-0">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Documents
        </TabsTrigger>
        <TabsTrigger
          value="facts"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Facts
        </TabsTrigger>
        <TabsTrigger
          value="assessments"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Assessments
        </TabsTrigger>
        <TabsTrigger
          value="audit"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Audit
        </TabsTrigger>
      </TabsList>

      <div className="p-5">
        <TabsContent value="overview" className="mt-0">
          <OverviewTab caseData={caseData} />
        </TabsContent>
        <TabsContent value="documents" className="mt-0">
          <DocumentsTab caseData={caseData} />
        </TabsContent>
        <TabsContent value="facts" className="mt-0">
          <FactsTab caseData={caseData} />
        </TabsContent>
        <TabsContent value="assessments" className="mt-0">
          <AssessmentsTab caseData={caseData} />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <AuditTab auditLog={auditLog} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
