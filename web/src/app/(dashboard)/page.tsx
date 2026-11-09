import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  MessageCircle,
  Plus,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { listCases } from "@/lib/api";
import type { CaseListItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
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
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default async function HomePage() {
  let cases: CaseListItem[] = [];
  let apiError: string | null = null;

  try {
    cases = await listCases();
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Unknown error";
  }

  const openCount = cases.filter((c) => c.status === "active" || c.status === "open").length;
  const thisWeekCount = cases.filter((c) => daysAgo(c.updated_at) <= 7).length;
  const recent = [...cases]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 8);

  const statusLine =
    openCount === 0
      ? "No open cases yet"
      : `${openCount} case${openCount === 1 ? "" : "s"} open · 0 awaiting sign-off`;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Home</span>
        </div>
        <div className="text-xs text-muted-foreground">{todayInIST()}</div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          {/* ── Greeting ── */}
          <section>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {greeting()}, captain
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusLine}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/cases">
                    All cases <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" disabled title="Case creation lands in the next session">
                  <Plus className="mr-1 h-4 w-4" /> New case
                </Button>
              </div>
            </div>
          </section>

          {apiError && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">
                  Can&apos;t reach the API
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-destructive/80">
                <p>{apiError}</p>
                <p className="mt-2 text-muted-foreground">
                  Start it with{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    make dev-api
                  </code>{" "}
                  from the repo root.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Stats strip ── */}
          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Open cases"
                value={openCount.toString()}
                icon={<Briefcase className="h-4 w-4" />}
              />
              <StatCard
                label="Updated this week"
                value={thisWeekCount.toString()}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="Assessments this week"
                value="0"
                icon={<Sparkles className="h-4 w-4" />}
                hint="engine runs week 3"
              />
              <StatCard
                label="Avg. turnaround"
                value="—"
                icon={<CheckCircle2 className="h-4 w-4" />}
                hint="needs more data"
              />
            </div>
          </section>

          {/* ── Queue + Quick actions ── */}
          <section className="grid gap-4 lg:grid-cols-3">
            {/* Queue */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Queue</CardTitle>
                <CardDescription>
                  Work waiting on the case captain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <QueueRow
                  label="Assessments to sign off"
                  count={0}
                  href="/cases"
                  hint="waiting on the engine"
                />
                <Separator />
                <QueueRow
                  label="Documents extracted, needs review"
                  count={0}
                  href="/cases"
                  hint="document extraction lands week 5"
                />
                <Separator />
                <QueueRow
                  label="New customer messages"
                  count={0}
                  href="/cases"
                  hint="WhatsApp integration lands post-V1"
                />
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick actions</CardTitle>
                <CardDescription>Jump into a common flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <ActionButton
                  href="/cases"
                  icon={<Briefcase className="h-4 w-4" />}
                  label="View all cases"
                />
                <ActionButton
                  href="/rules"
                  icon={<FileText className="h-4 w-4" />}
                  label="Browse tax rules"
                />
                <ActionButton
                  href="/cases/1"
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Open demo case"
                />
                <ActionButton
                  icon={<Upload className="h-4 w-4" />}
                  label="Upload document"
                  disabled
                  hint="week 5"
                />
              </CardContent>
            </Card>
          </section>

          {/* ── Recent activity ── */}
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Recent activity</CardTitle>
                  <CardDescription>
                    Cases most recently touched
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/cases">
                    See all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-2 text-3xl">📭</div>
                    <p className="text-sm font-medium text-foreground">
                      Nothing yet
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Seed a case with{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono">
                        make seed
                      </code>
                      .
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {recent.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/cases/${c.id}`}
                          className="flex items-center justify-between gap-4 py-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {c.client_name}
                              </p>
                              <Badge variant="secondary" className="text-[10px]">
                                {c.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">
                              {c.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:flex gap-1">
                              {c.jurisdictions
                                ?.split(",")
                                .map((j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                  >
                                    {j.trim()}
                                  </span>
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {timeAgo(c.updated_at)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── Footer note ── */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Prototype · v0.2-dashboard · counts are computed from live cases, zeros are honest.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
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
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        )}
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

function ActionButton({
  href,
  icon,
  label,
  disabled,
  hint,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  hint?: string;
}) {
  const content = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {hint && (
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      )}
      {!hint && !disabled && (
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );

  if (disabled || !href) {
    return (
      <div className="flex items-center justify-start rounded-md border border-dashed bg-muted/20 px-3 py-2 opacity-60 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center justify-start rounded-md border bg-card px-3 py-2 hover:bg-muted/50 transition-colors"
    >
      {content}
    </Link>
  );
}
