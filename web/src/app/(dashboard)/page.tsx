import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  listCases,
  getDashboardStats,
  getDashboardActivity,
  listOpenTickets,
} from "@/lib/api";
import type { CaseListItem, DashboardStats, ActivityEntry, Journey, Ticket } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatTile } from "@/components/stat-tile";
import { Jurisdictions } from "@/components/country-chip";
import { BarMiniChart } from "@/components/mini-chart";
import { JourneyBadge } from "@/components/journey-badge";

function todayInIST() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function HomePage() {
  let cases: CaseListItem[] = [];
  let stats: DashboardStats | null = null;
  let activity: ActivityEntry[] = [];
  let tickets: Ticket[] = [];
  let apiError: string | null = null;

  try {
    [cases, stats, activity, tickets] = await Promise.all([
      listCases(),
      getDashboardStats(),
      getDashboardActivity(),
      listOpenTickets(),
    ]);
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Unknown error";
  }

  const openItems = stats?.open_action_items ?? 0;
  const openNotices = stats?.open_notices ?? 0;
  const awaitingSignoff = stats?.awaiting_signoff ?? 0;
  const openTickets = stats?.open_tickets ?? 0;
  const ticketsOverdue = stats?.tickets_overdue ?? 0;
  const needsAttention = openTickets + awaitingSignoff + openNotices;
  const byStage = (j: Journey) => cases.filter((c) => c.journey === j);
  const earlier = cases.filter((c) => c.journey !== "paid").length;

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 items-center justify-between border-b px-6 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Home</span>
        </div>
        <div className="text-xs text-muted-foreground">{todayInIST()}</div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
          <section className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Today</h1>
              {needsAttention > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {needsAttention} need{needsAttention === 1 ? "s" : ""} attention
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                  <CheckCircle2 className="h-3 w-3" /> Queue clear
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {stats?.open_cases ?? 0} paid case{(stats?.open_cases ?? 0) === 1 ? "" : "s"}
                {earlier > 0 && ` · ${earlier} customer${earlier === 1 ? "" : "s"} earlier in the funnel`}
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/cases">
                All cases <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </section>

          {apiError && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">Can&apos;t reach the API</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-destructive/80">
                <p>{apiError}</p>
                <p className="mt-2 text-muted-foreground">
                  Start it with{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">make dev-api</code> from the repo root.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Queue + funnel */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Queue</CardTitle>
                <CardDescription>Work waiting on an expert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                <QueueRow
                  label="Tickets from Kiyos"
                  count={openTickets}
                  href={tickets[0] ? `/cases/${tickets[0].case_id}` : "/cases"}
                  urgent={ticketsOverdue > 0}
                  hint={
                    openTickets === 0
                      ? "no questions waiting"
                      : ticketsOverdue > 0
                      ? `${ticketsOverdue} past the one-business-day reply time`
                      : "flagged questions to answer"
                  }
                />
                <Separator />
                <QueueRow
                  label="Assessments to sign off"
                  count={awaitingSignoff}
                  href="/cases"
                  hint={awaitingSignoff === 0 ? "cleared" : "draft or in review"}
                />
                <Separator />
                <QueueRow
                  label="Tax authority notices"
                  count={openNotices}
                  href="/cases"
                  hint={openNotices === 0 ? "all responded" : "awaiting response"}
                />
                <Separator />
                <QueueRow
                  label="Open action items"
                  count={openItems}
                  href="/cases"
                  hint="across paid cases"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Customers by stage</CardTitle>
                <CardDescription>From first WhatsApp message to paid</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-0.5">
                  {(["intake", "signup", "free", "payment_pending", "paid"] as const).map((j) => {
                    const people = byStage(j);
                    return (
                      <li key={j}>
                        <Link
                          href={`/cases?stage=${j}`}
                          className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                        >
                          <JourneyBadge journey={j} />
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {people.slice(0, 2).map((p) => p.client_name).join(", ")}
                            {people.length > 2 && ` +${people.length - 2}`}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">{people.length}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Stats strip */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Paid cases"
              value={stats?.open_cases ?? 0}
              icon={<Briefcase className="h-4 w-4" />}
            />
            <StatTile
              label="Awaiting sign-off"
              value={awaitingSignoff}
              icon={<CheckCircle2 className="h-4 w-4" />}
              hint="assessments in draft / review"
            />
            <StatTile
              label="Open action items"
              value={openItems}
              icon={<Inbox className="h-4 w-4" />}
              hint="across all cases"
            />
            <StatTile
              label="AI calls · 7d"
              value={stats?.ai_calls_last_7d ?? 0}
              icon={<Sparkles className="h-4 w-4" />}
              hint={`${stats?.assessments_total ?? 0} assessments total`}
            />
          </section>

          {/* Activity + workload */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
                  <CardDescription>What moved across all cases</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
                ) : (
                  <ul className="divide-y">
                    {activity.slice(0, 6).map((a, i) => (
                      <li key={i}>
                        <Link
                          href={`/cases/${a.case_id}`}
                          className="flex items-start justify-between gap-4 py-2.5 group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground leading-snug">
                              <span className="font-medium">{a.actor}</span>{" "}
                              <span className="text-muted-foreground">{a.verb}</span>{" "}
                              <span className="font-medium">{a.object}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{a.client_name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {timeAgo(a.at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Workload</CardTitle>
                <CardDescription>Paid cases by lead expert</CardDescription>
              </CardHeader>
              <CardContent>
                <BarMiniChart
                  data={(stats?.captain_workload ?? []).map((c) => ({
                    label: c.captain.split(" ")[0],
                    value: c.count,
                  }))}
                  height={120}
                />
              </CardContent>
            </Card>
          </section>

          {/* Case roster summary */}
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Customers</CardTitle>
                  <CardDescription>Most recently updated first</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {cases.slice(0, 8).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cases/${c.id}`}
                        className="flex items-center gap-4 px-6 py-2.5 group hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {c.client_name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {c.client_name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {c.name}
                          </p>
                        </div>
                        <JourneyBadge journey={c.journey} className="w-[118px] justify-center" />
                        <Jurisdictions value={c.jurisdictions} />
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          {c.open_items_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800">
                              <Clock className="h-3 w-3" />
                              {c.open_items_count}
                            </span>
                          )}
                          {c.open_notices_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-rose-800">
                              <FileText className="h-3 w-3" />
                              {c.open_notices_count}
                            </span>
                          )}
                          <span className="text-muted-foreground tabular-nums w-12 text-right">
                            {timeAgo(c.updated_at)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <p className="text-xs text-muted-foreground text-center pb-4">
            Prototype · counts computed live from the seeded customers
          </p>
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  label,
  count,
  href,
  hint,
  urgent,
}: {
  label: string;
  count: number;
  href: string;
  hint?: string;
  urgent?: boolean;
}) {
  const empty = count === 0;
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-2.5 px-1 group hover:bg-muted/40 rounded-md transition-colors -mx-1"
    >
      <div className="min-w-0 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {label}
          </p>
          {hint && <p className={urgent ? "mt-0.5 text-[11px] text-rose-700" : "mt-0.5 text-[11px] text-muted-foreground"}>{hint}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={
            empty
              ? "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground tabular-nums"
              : "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-semibold text-primary tabular-nums"
          }
        >
          {count}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
