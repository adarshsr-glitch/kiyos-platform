"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  CaseDetail,
  AiCallEntry,
  CaseEvent,
  Fact,
  Member,
  Ticket,
} from "@/lib/types";
import { ResidencyTimeline } from "./residency-timeline";
import { DonutMiniChart } from "./mini-chart";
import { AssessmentReview } from "./assessment-review";
import { TicketList } from "./ticket-list";
import { ActionItems, Recommendations as RecommendationCards, TaxQuestions } from "./case/case-tabs";
import type { Brief, Residency } from "@/lib/residency";
import { hasCaptain } from "@/lib/captain";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
} from "lucide-react";

// Most used first: today's work, then the work queues, then the record. One row: eight tabs.
// Profile is the customer's file (the same word they see): summary and sign-off, residency
// and household, financial life, as sections of one tab.
const TABS = [
  { key: "today",           label: "Today" },
  { key: "tickets",         label: "Tickets" },
  { key: "actions",         label: "Action items" },
  { key: "tax",             label: "Tax questions" },
  { key: "recommendations", label: "Recommendations" },
  { key: "documents",       label: "Documents" },
  { key: "profile",         label: "Profile" },
  { key: "audit",           label: "Audit" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
// Links made before the tabs were merged still land in the right place.
const OLD_TABS: Record<string, TabKey> = { overview: "profile", financial: "profile", brief: "today" };
const PROFILE_SECTIONS = [
  { id: "profile-summary", label: "Summary and sign-off" },
  { id: "profile-residency", label: "Residency and household" },
  { id: "profile-money", label: "Financial life" },
];

export function CaseWorkspace({
  caseData,
  auditLog,
  tickets,
  events,
  today,
  bare,
}: {
  caseData: CaseDetail;
  auditLog: AiCallEntry[];
  tickets: Ticket[];
  events: CaseEvent[];
  brief?: Brief | null;
  residency?: Residency | null;
  /** The expert's working view, shown as the first tab. */
  today?: React.ReactNode;
  /** No outer padding (the page provides it). */
  bare?: boolean;
}) {
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const openItems = caseData.action_items.filter((i) => i.status !== "done").length;
  const tabs = TABS.filter((t) => t.key !== "today" || !!today);
  const fallback: TabKey = today ? "today" : "profile";

  // The open tab lives in the URL (?tab=…), so a link, a refresh or Back returns to it.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get("tab") ?? "";
  const wanted = (OLD_TABS[asked] ?? asked) as TabKey;
  const tab: TabKey = tabs.some((t) => t.key === wanted) ? wanted : fallback;
  const select = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v === fallback) next.delete("tab");
    else next.set("tab", v);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const count = (n: number, urgent?: boolean) =>
    n > 0 ? (
      <span
        className={cn(
          "ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
          urgent ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {n}
      </span>
    ) : null;

  return (
    <div className={bare ? "" : "px-6 py-6"}>
      <Tabs value={tab} onValueChange={select} className="w-full">
        {/* One row; on narrow screens it scrolls sideways instead of wrapping. */}
        <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0 [scrollbar-width:none]">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="shrink-0 whitespace-nowrap rounded-none rounded-t-md border-b-2 px-2.5 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {t.label}
              {t.key === "tickets" && count(openTickets, true)}
              {t.key === "actions" && count(openItems)}
            </TabsTrigger>
          ))}
        </TabsList>

        {today && (
          <TabsContent value="today" className="mt-6">
            {today}
          </TabsContent>
        )}
        <TabsContent value="tickets" className="mt-6">
          <TicketList tickets={tickets} advisor={hasCaptain(caseData.case_captain) ? caseData.case_captain : "Kiyos team"} customer={caseData.client_name} />
        </TabsContent>
        <TabsContent value="actions" className="mt-6">
          <ActionItems caseData={caseData} />
        </TabsContent>
        <TabsContent value="tax" className="mt-6">
          <TaxQuestions caseData={caseData} />
        </TabsContent>
        <TabsContent value="recommendations" className="mt-6">
          <RecommendationCards caseData={caseData} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <Documents caseData={caseData} />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <nav aria-label="Sections of the profile" className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {PROFILE_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {s.label}
              </a>
            ))}
          </nav>
          <div className="space-y-10">
            <section id="profile-summary" aria-labelledby="profile-summary-h" className="scroll-mt-4">
              <h2 id="profile-summary-h" className="mb-3 text-[15px] font-semibold text-foreground">Summary and sign-off</h2>
              <Overview caseData={caseData} events={events} />
            </section>
            <section id="profile-residency" aria-labelledby="profile-residency-h" className="scroll-mt-4">
              <h2 id="profile-residency-h" className="mb-3 text-[15px] font-semibold text-foreground">Residency and household</h2>
              <Profile caseData={caseData} />
            </section>
            <section id="profile-money" aria-labelledby="profile-money-h" className="scroll-mt-4">
              <h2 id="profile-money-h" className="mb-3 text-[15px] font-semibold text-foreground">Financial life</h2>
              <FinancialLife caseData={caseData} />
            </section>
          </div>
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <Audit log={auditLog} events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Overview
function Overview({ caseData, events }: { caseData: CaseDetail; events: CaseEvent[] }) {
  const topicsByStatus = {
    open: caseData.topics.filter((t) => t.status === "open").length,
    in_progress: caseData.topics.filter((t) => t.status === "in_progress").length,
    resolved: caseData.topics.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Case summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {caseData.summary ?? "No summary yet."}
          </p>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-xs">
            <MicroFact label="Expert" value={caseData.case_captain === "Unassigned" ? "Assigned on payment" : caseData.case_captain} />
            <MicroFact label="Tax year" value={caseData.tax_year ?? "—"} />
            <MicroFact label="Arrival" value={caseData.arrival_date ?? "—"} />
            <MicroFact
              label="Household members"
              value={String(caseData.members.length)}
            />
          </div>
          <Separator className="my-4" />
          <p className="text-[10px] uppercase tracking-wider text-primary mb-2">
            Assessments · review and sign-off
          </p>
          <AssessmentReview
            assessments={caseData.assessments}
            events={events}
            reviewer={caseData.case_captain}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topic status</CardTitle>
          <CardDescription>By workstream</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutMiniChart
            segments={[
              { label: "Open", value: topicsByStatus.open, color: "#64748B" },
              { label: "In progress", value: topicsByStatus.in_progress, color: "#D97706" },
              { label: "Resolved", value: topicsByStatus.resolved, color: "#047857" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MicroFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Profile
function Profile({ caseData }: { caseData: CaseDetail }) {
  const factFrom = (key: string): Fact | undefined =>
    caseData.facts.find((f) => f.key === key);

  const timeline = buildTimeline(caseData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Residency timeline</CardTitle>
          <CardDescription>
            Last ten previous years and current year status. Arrival marker where applicable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length > 0 ? (
            <ResidencyTimeline
              segments={timeline}
              arrival={caseData.tax_year ?? undefined}
            />
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No residency data available for this case.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Household</CardTitle>
          <CardDescription>
            {caseData.members.length} member{caseData.members.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {caseData.members.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No household members on record.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {caseData.members.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elections & citizenship</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-xs">
          <MicroFact
            label="PAN"
            value={factFrom("pan_number")?.value ?? "—"}
          />
          <MicroFact
            label="SSN (last 4)"
            value={factFrom("ssn_last_four")?.value ?? "—"}
          />
          <MicroFact
            label="OCI #"
            value={factFrom("india_oci_number")?.value ?? "—"}
          />
          <MicroFact
            label="FBAR 2025"
            value={factFrom("fbar_status_2025")?.value ?? "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{member.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            {member.role}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {member.dob ?? ""}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-foreground/70 flex-wrap">
        {member.citizenship && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {member.citizenship}
          </span>
        )}
        {member.visa_status && (
          <Badge variant="outline" className="text-[10px]">
            {member.visa_status}
          </Badge>
        )}
      </div>
      {member.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground italic leading-snug">
          {member.notes}
        </p>
      )}
    </div>
  );
}

function buildTimeline(caseData: CaseDetail) {
  const pys = caseData.facts.find((f) => f.key === "previous_year_statuses");
  const taxYear = caseData.tax_year ?? "";
  const startYear = taxYear ? Number(taxYear.split("-")[0]) : new Date().getFullYear();

  if (!pys) {
    // Derive from residency topic if we can
    const topic = caseData.topics.find(
      (t) => t.topic_key === "rnor" || t.topic_key === "ind_residency"
    );
    if (!topic || !topic.conclusion) return [];
    const guess = topic.conclusion.toLowerCase().includes("rnor")
      ? "RNOR"
      : topic.conclusion.toLowerCase().includes(" nr") ||
        topic.conclusion.toLowerCase().includes("non-resident")
      ? "NR"
      : "ROR";
    return [
      { year: `${startYear - 1}-${String(startYear % 100).padStart(2, "0")}`, status: "NR" as const },
      { year: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`, status: guess as "NR" | "RNOR" | "ROR" },
    ];
  }

  const statuses = pys.value.split(",").map((s) => s.trim());
  const segments: { year: string; status: "NR" | "RNOR" | "ROR" }[] = [];
  for (let i = statuses.length - 1; i >= 0; i--) {
    const y = startYear - i - 1;
    segments.push({
      year: `${y}-${String((y + 1) % 100).padStart(2, "0")}`,
      status: (statuses[i] as "NR" | "RNOR" | "ROR") ?? "NR",
    });
  }
  // Current year
  segments.push({
    year: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`,
    status: (caseData.topics.find((t) => t.topic_key === "rnor")?.conclusion ?? "")
      .toLowerCase()
      .includes("rnor")
      ? "RNOR"
      : "NR",
  });
  // Keep last ~6 for width
  return segments.slice(-6);
}

// ───────────────────────────────────────────────────────────── Financial life
function FinancialLife({ caseData }: { caseData: CaseDetail }) {
  const grouped = groupFactsFinancial(caseData.facts);

  return (
    <div className="space-y-6">
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground italic">
            No financial facts recorded.
          </CardContent>
        </Card>
      ) : (
        grouped.map((g) => (
          <Card key={g.title}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {g.title}
                <Badge variant="outline" className="text-[10px]">{g.country}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Item</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.items.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">{prettify(f.key)}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {f.value}
                        {f.unit && <span className="text-xs text-muted-foreground"> {f.unit}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.source ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupFactsFinancial(facts: Fact[]) {
  const income = facts.filter((f) =>
    /(salary|rental_income)/i.test(f.key)
  );
  const assets = facts.filter((f) =>
    /(401k|brokerage|balance|value|portfolio|property)/i.test(f.key)
  );
  const equity = facts.filter((f) => /(rsu|options|vest|strike)/i.test(f.key));

  const groups = [];
  if (income.length)
    groups.push({ title: "Income streams", country: "IN · US", items: income });
  if (assets.length)
    groups.push({ title: "Accounts & assets", country: "IN · US", items: assets });
  if (equity.length)
    groups.push({ title: "Equity compensation", country: "US", items: equity });
  return groups;
}

// ───────────────────────────────────────────────────────────── Tax & compliance
// ───────────────────────────────────────────────────────────── Documents
function Documents({ caseData }: { caseData: CaseDetail }) {
  if (caseData.documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground italic">
          No documents uploaded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Extracted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {caseData.documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{d.filename}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{d.doc_type ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      d.status === "extracted" && "border-emerald-300 text-emerald-800",
                      d.status === "review" && "border-amber-300 text-amber-800",
                      d.status === "filed" && "border-blue-300 text-blue-800"
                    )}
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ExtractionCell status={d.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExtractionCell({ status }: { status: string }) {
  if (status === "extracted" || status === "filed")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        done
      </span>
    );
  if (status === "review")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        pending review
      </span>
    );
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ───────────────────────────────────────────────────────────── Scenarios
// ───────────────────────────────────────────────────────────── Audit
const EVENT_LABEL: Record<string, string> = {
  "assessment.signed_off": "Signed off assessment",
  "assessment.changes_requested": "Requested changes",
  "profile.confirmed": "Confirmed profile",
  "document.uploaded": "Uploaded document",
  "conversation.takeover": "Took over thread",
  "conversation.handback": "Handed thread back",
  "ticket.created": "Raised ticket",
  "ticket.resolved": "Resolved ticket",
  "call.requested": "Requested a call with the expert",
};

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function Audit({ log, events }: { log: AiCallEntry[]; events: CaseEvent[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case activity</CardTitle>
          <CardDescription>Every human and workflow action, with owner and timestamp</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="px-6 pb-6 text-sm italic text-muted-foreground">No actions recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {fmtWhen(e.created_at)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{e.actor}</TableCell>
                    <TableCell className="text-xs">{EVENT_LABEL[e.action] ?? e.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {String(e.detail?.note ?? e.detail?.label ?? "")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AiCallLog log={log} />
    </div>
  );
}

function AiCallLog({ log }: { log: AiCallEntry[] }) {
  if (log.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground italic">
          No AI calls yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI calls</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {new Date(c.created_at).toLocaleString("en-IN", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {c.service}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{c.model}</TableCell>
                <TableCell className="text-xs tabular-nums">
                  {c.prompt_tokens + c.completion_tokens}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-muted-foreground">
                  {c.latency_ms}ms
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
