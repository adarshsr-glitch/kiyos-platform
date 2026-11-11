"use client";

import Link from "next/link";
import type { DocumentItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock documents so the demo never shows an empty screen             */
/* ------------------------------------------------------------------ */

const MOCK_UPLOADED: DocumentItem[] = [
  { id: 901, filename: "W-2_2025_Rahul.pdf", doc_type: "W-2", status: "extracted" },
  { id: 902, filename: "Form16_FY2025.pdf", doc_type: "form_16", status: "extracted" },
];

const REQUIRED_CHECKLIST = [
  { type: "passport", label: "Passport (travel history)" },
  { type: "401k_statement", label: "401(k) / IRA statement" },
  { type: "pay_stub", label: "Pay stubs (last 3 months)" },
  { type: "brokerage_statement", label: "Brokerage statements" },
];

/* ------------------------------------------------------------------ */

interface DashboardDocumentsProps {
  documents: DocumentItem[];
}

export function DashboardDocuments({ documents }: DashboardDocumentsProps) {
  const hasRealDocs = documents.length > 0;
  const displayDocs = hasRealDocs ? documents.slice(0, 4) : MOCK_UPLOADED;

  const uploadedTypes = new Set(
    displayDocs.map((d) => d.doc_type?.toLowerCase()).filter(Boolean)
  );
  const neededDocs = REQUIRED_CHECKLIST.filter(
    (c) => !uploadedTypes.has(c.type)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Documents
          <span className="text-[10px] font-normal text-muted-foreground">
            {displayDocs.length} uploaded · {neededDocs.length} needed
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 rounded-full"
            onClick={() => console.log("[prototype] Upload clicked")}
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href="/portal/documents">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* Uploaded docs */}
          {displayDocs.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {d.filename}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {d.status}
                </p>
              </div>
            </div>
          ))}

          {/* Needed docs */}
          {neededDocs.map((nd) => (
            <div
              key={nd.type}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                "border-dashed border-muted-foreground/25 bg-muted/20"
              )}
            >
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {nd.label}
                </p>
                <p className="text-[10px] text-muted-foreground">Needed</p>
              </div>
            </div>
          ))}
        </div>

        {!hasRealDocs && (
          <p className="mt-3 text-[10px] text-muted-foreground italic text-center">
            Showing sample documents for preview. Upload yours to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
