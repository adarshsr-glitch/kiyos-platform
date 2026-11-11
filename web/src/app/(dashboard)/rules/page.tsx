import fs from "node:fs/promises";
import path from "node:path";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, FileText, FolderOpen, Sparkles } from "lucide-react";
import { RuleDialog } from "./rule-dialog";

type RuleFile = {
  jurisdiction: string;
  year: string;
  topic: string;
  slug: string; // filename without .yaml
  relPath: string; // relative to knowledge/
  yaml: string;
  markdown: string | null;
  id: string | null;
  summary: string | null;
  status: string | null;
  testCaseCount: number;
};

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "..", "knowledge");

async function safeReadDir(p: string): Promise<string[]> {
  try {
    return await fs.readdir(p);
  } catch {
    return [];
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function peekField(yaml: string, key: string): string | null {
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`, "m");
  const m = yaml.match(re);
  if (!m) return null;
  const inline = m[1].trim();
  // Block scalar indicators — read the folded/literal block on the next lines.
  if (inline === ">-" || inline === ">" || inline === "|-" || inline === "|") {
    const idx = yaml.indexOf(m[0]) + m[0].length;
    const rest = yaml.slice(idx).split("\n");
    const body: string[] = [];
    let baseIndent = -1;
    for (const line of rest) {
      if (line.trim() === "") {
        if (body.length === 0) continue;
        body.push("");
        continue;
      }
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      if (baseIndent === -1) baseIndent = indent;
      if (indent < baseIndent) break;
      body.push(line.slice(baseIndent));
    }
    const folded = inline.startsWith(">") ? body.join(" ") : body.join("\n");
    return folded.replace(/\s+/g, " ").trim();
  }
  return inline.replace(/^["']|["']$/g, "");
}

function countTestCases(yaml: string): number {
  const lines = yaml.split("\n");
  let inTestCases = false;
  let baseIndent = -1;
  let count = 0;
  for (const line of lines) {
    if (/^test_cases\s*:/.test(line)) {
      inTestCases = true;
      continue;
    }
    if (!inTestCases) continue;
    if (line.trim() === "") continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    // Any top-level key (indent 0) ends the test_cases block.
    if (indent === 0 && line.trim() !== "" && !line.startsWith("#")) break;
    if (baseIndent === -1) baseIndent = indent;
    if (indent === baseIndent && /^\s*-\s+name\s*:/.test(line)) count++;
  }
  return count;
}

async function scanKnowledge(): Promise<RuleFile[]> {
  const out: RuleFile[] = [];
  const jurisdictions = await safeReadDir(KNOWLEDGE_DIR);
  for (const j of jurisdictions) {
    const jPath = path.join(KNOWLEDGE_DIR, j);
    if (!(await isDir(jPath))) continue;
    const years = await safeReadDir(jPath);
    for (const y of years) {
      const yPath = path.join(jPath, y);
      if (!(await isDir(yPath))) continue;
      const topics = await safeReadDir(yPath);
      for (const t of topics) {
        const tPath = path.join(yPath, t);
        if (!(await isDir(tPath))) continue;
        const files = await safeReadDir(tPath);
        for (const f of files) {
          if (!f.endsWith(".yaml") && !f.endsWith(".yml")) continue;
          const slug = f.replace(/\.(yaml|yml)$/, "");
          const fPath = path.join(tPath, f);
          const yaml = await fs.readFile(fPath, "utf8");
          const mdPath = path.join(tPath, `${slug}.md`);
          let markdown: string | null = null;
          try {
            markdown = await fs.readFile(mdPath, "utf8");
          } catch {
            /* no sibling markdown */
          }
          out.push({
            jurisdiction: j,
            year: y,
            topic: t,
            slug,
            relPath: path.relative(KNOWLEDGE_DIR, fPath),
            yaml,
            markdown,
            id: peekField(yaml, "id"),
            summary: peekField(yaml, "summary"),
            status: peekField(yaml, "status"),
            testCaseCount: countTestCases(yaml),
          });
        }
      }
    }
  }
  return out;
}

type Tree = Record<string, Record<string, Record<string, RuleFile[]>>>;

function toTree(rules: RuleFile[]): Tree {
  const t: Tree = {};
  for (const r of rules) {
    t[r.jurisdiction] ??= {};
    t[r.jurisdiction][r.year] ??= {};
    t[r.jurisdiction][r.year][r.topic] ??= [];
    t[r.jurisdiction][r.year][r.topic].push(r);
  }
  return t;
}

const JURISDICTION_NAMES: Record<string, string> = {
  india: "India",
  us: "United States",
  in: "India",
};

const FIRST_RULES = [
  {
    path: "knowledge/india/2026-27/residency/rnor-9-of-10.yaml",
    id: "IN-RES-RNOR-9OF10",
    note: "Section 6(6)(a) — RNOR via 9-of-10 preceding years",
  },
  {
    path: "knowledge/india/2026-27/residency/resident-182.yaml",
    id: "IN-RES-RESIDENT-182",
    note: "Section 6(1)(a) — 182-day test",
  },
  {
    path: "knowledge/india/2026-27/residency/deemed-resident.yaml",
    id: "IN-RES-DEEMED",
    note: "Section 6(1A) — deemed resident / stateless income",
  },
  {
    path: "knowledge/us/2026/residency/spt.yaml",
    id: "US-RES-SPT",
    note: "IRC §7701(b) — Substantial Presence Test",
  },
];

export default async function RulesPage() {
  const rules = await scanKnowledge();
  const tree = toTree(rules);
  const isEmpty = rules.length === 0;

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="text-sm font-medium text-foreground">Rules</span>
        <span className="text-xs text-muted-foreground">
          {rules.length} rule{rules.length === 1 ? "" : "s"} authored
        </span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          {/* Heading */}
          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">
              Knowledge layer
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground leading-tight">
              Human-authored tax rules,{" "}
              <span className="font-serif italic text-primary">
                cited to the statute.
              </span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Every rule is a YAML file under{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                knowledge/&lt;jurisdiction&gt;/&lt;year&gt;/&lt;topic&gt;/
              </code>
              . The engine reads these; the AI explains using their IDs. No
              rule, no computation.
            </p>
          </section>

          {isEmpty ? (
            <EmptyState />
          ) : (
            <section className="space-y-6">
              {Object.entries(tree).map(([jur, years]) => (
                <Card key={jur}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {JURISDICTION_NAMES[jur.toLowerCase()] ?? jur}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {jur.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Object.values(years)
                          .flatMap((t) => Object.values(t))
                          .flat().length}{" "}
                        rules
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(years).map(([year, topics]) => (
                      <div key={year}>
                        <div className="flex items-center gap-2 mb-2">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Tax year {year}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(topics).map(([topic, ruleList]) => (
                            <div key={topic} className="pl-5">
                              <p className="text-xs font-medium text-foreground mb-1 capitalize">
                                {topic.replace(/-/g, " ")}
                              </p>
                              <ul className="divide-y rounded-md border bg-card">
                                {ruleList.map((r) => (
                                  <li key={r.relPath}>
                                    <RuleDialog rule={r} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">No rules authored yet</CardTitle>
          </div>
          <CardDescription>
            The knowledge directory is empty. This is Week 2 work on the plan —
            and the first thing Cursor should <em>not</em> write for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Start here — the first rules to author
            </p>
            <ul className="divide-y rounded-md border bg-card">
              {FIRST_RULES.map((r) => (
                <li
                  key={r.path}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <code className="font-mono text-xs text-foreground break-all">
                      {r.path}
                    </code>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono text-primary">{r.id}</span> —{" "}
                      {r.note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              The schema
            </p>
            <pre className="rounded-lg border bg-card p-4 text-[11px] leading-relaxed overflow-x-auto font-mono">
              {`id: IN-RES-RNOR-9OF10
jurisdiction: IN
tax_year: "2026-27"

sources:
  - id: IN-ITA-S6
    section: "6(6)(a)"
    passage: "an individual who has been a non-resident
              in India in nine out of ten previous years"

summary: "Resident is NOT ordinarily resident
          if NR in 9 of 10 preceding PYs"

inputs:
  - name: previous_year_statuses
    type: array[enum[NR, RNOR, ROR]]
    length: 10

logic:
  kind: threshold_count
  count_of: NR
  within: previous_year_statuses
  operator: ">="
  threshold: 9

status: active

test_cases:
  - name: "Standard returnee after 10 NR years"
    inputs:
      previous_year_statuses: [NR, NR, NR, NR, NR, NR, NR, NR, NR, NR]
    expected: true
  - name: "Only 8 NR years, fails"
    inputs:
      previous_year_statuses: [NR, NR, NR, NR, NR, NR, NR, NR, RNOR, RNOR]
    expected: false`}
            </pre>
          </div>

          <div className="rounded-md border border-dashed bg-background p-4">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  How to author rule #1
                </p>
                <p className="mt-1">
                  Open Section 6 of the Income Tax Act. Read 6(6)(a). Write the
                  YAML by hand into{" "}
                  <code className="rounded bg-muted px-1 font-mono">
                    knowledge/india/2026-27/residency/rnor-9-of-10.yaml
                  </code>
                  . Save. Refresh this page — your rule appears, clickable, with
                  its YAML and test cases.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
