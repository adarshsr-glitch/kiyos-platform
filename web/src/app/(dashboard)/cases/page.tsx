import Link from "next/link";
import { listCases } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "completed":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CasesPage() {
  const cases = await listCases();

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Cases</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-56 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
            Search…
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 text-4xl">📋</div>
            <h2 className="text-lg font-semibold text-foreground">
              No cases yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cases will appear here once created through the API.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jurisdictions</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead>Case captain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id} className="group cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-medium text-foreground group-hover:text-primary transition-colors"
                      >
                        {c.client_name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[280px]">
                        {c.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.jurisdictions
                          ?.split(",")
                          .map((j) => (
                            <span
                              key={j}
                              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                              {j.trim()}
                            </span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.updated_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.case_captain}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
