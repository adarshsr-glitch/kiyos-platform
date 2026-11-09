import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const JURISDICTIONS = [
  {
    code: "IN",
    name: "India",
    years: ["2026-27", "2025-26"],
    ruleCount: "~15 rules",
  },
  {
    code: "US",
    name: "United States",
    years: ["2026", "2025"],
    ruleCount: "~10 rules",
  },
];

export default function RulesPage() {
  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center border-b px-6">
        <span className="text-sm font-medium text-foreground">Rules</span>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">
            Knowledge layer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Human-authored tax rules, versioned by jurisdiction and tax year.
            Each rule is a YAML file with test cases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {JURISDICTIONS.map((j) => (
            <Card key={j.code}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{j.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {j.code}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {j.ruleCount} authored
                </p>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  {j.years.map((year) => (
                    <div
                      key={year}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{year}</span>
                      <span className="text-xs text-muted-foreground">
                        View rules →
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Rule tree browser is a stub for now. Individual rules are
            viewable from the Assessments tab when a derivation trail
            references them.
          </p>
        </div>
      </div>
    </div>
  );
}
