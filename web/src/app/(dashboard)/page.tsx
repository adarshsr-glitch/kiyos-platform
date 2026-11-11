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
import type { CaseListItem, DashboardStats, ActivityEntry, Ticket } from "@/lib/types";
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

function todayInIST() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function greeting() {
  const hourIST = Number(
    new Date().toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    })
  );
  if (hourIST < 12) return "Good morning";
  if (hourIST < 17) return "Good afternoon";
  return "Good evening";
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

  const flourish =
    openItems > 15
      ? `${openItems} items need a captain's eye.`
      : openItems > 0
      ? `${openItems} items on the board.`
      : "Nothing on your plate.";

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 items-center justify-between border-b px-6 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Home</span>
        </div>
        <div className="text-xs text-muted-foreground">{todayInIST()}</div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          {/* Greeting */}
          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">
              Case captain workspace
            </p>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground leading-[1.1]">
                  {greeting()}, captain.{" "}
                  <span className="font-serif italic text-primary">{flourish}</span>
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  {(stats?.open_cases ?? 0)} open case{(stats?.open_cases ?? 0) === 1 ? "" : "s"}
                  {" · "}
                  {awaitingSignoff} assessment{awaitingSignoff === 1 ? "" : "s"} awaiting sign-off
                  {" · "}
                  {openNotices} open notice{openNotices === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/cases">
                    All cases <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
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

          {/* Stats strip */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Open cases"
              value={stats?.open_cases ?? 0}
              icon={<Briefcase className="h-4 w-4" />}
              accent
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

          {/* Queue + Workload */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Queue</CardTitle>
                <CardDescription>Work waiting on the case captain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <QueueRow
                  label="Tickets from Kiyos"
                  count={openTickets}
                  href={tickets[0] ? `/cases/${tickets[0].case_id}` : "/cases"}
                  hint={
                    openTickets === 0
                      ? "no questions waiting"
                      : ticketsOverdue > 0
                      ? `${ticketsOverdue} past 24h SLA`
                      : "low-confidence questions to answer"
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
                  label="Open action items"
                  count={openItems}
                  href="/cases"
                  hint="not blocked, not done"
                />
                <Separator />
                <QueueRow
                  label="Tax authority notices"
                  count={openNotices}
                  href="/cases"
                  hint={openNotices === 0 ? "all responded" : "awaiting response"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workload</CardTitle>
                <CardDescription>Open cases by captain</CardDescription>
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

          {/* Recent activity */}
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Recent activity</CardTitle>
                  <CardDescription>What moved across all cases</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/cases">
                    See all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-2 text-3xl">📭</div>
                    <p className="text-sm font-medium text-foreground">Nothing yet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Seed cases with{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono">make seed</code>.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {activity.map((a, i) => (
                      <li key={i}>
                        <Link
                          href={`/cases/${a.case_id}`}
                          className="flex items-start justify-between gap-4 py-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground leading-snug">
                              <span className="font-medium">{a.actor}</span>{" "}
                              <span className="text-muted-foreground">{a.verb}</span>{" "}
                              <span className="font-medium">{a.object}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.client_name}
                            </p>
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
          </section>

          {/* Case roster summary */}
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Case roster</CardTitle>
                  <CardDescription>All open cases, most recent first</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {cases.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cases/${c.id}`}
                        className="flex items-center gap-4 px-6 py-3 group hover:bg-muted/40 transition-colors"
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
            Prototype · v0.4-prd-fidelity · counts computed live from six seeded cases
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
}: {
  label: string;
  count: number;
  href: string;
  hint?: string;
}) {
  const empty = count === 0;
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-3 px-1 group hover:bg-muted/40 rounded-md transition-colors -mx-1"
    >
      <div className="min-w-0 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {label}
          </p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
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
