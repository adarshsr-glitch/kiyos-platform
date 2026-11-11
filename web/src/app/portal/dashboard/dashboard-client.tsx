"use client";

import { useEffect, useState } from "react";
import { WealthPanel } from "@/components/portal/wealth-panel";
import { DashboardDocuments } from "@/components/portal/dashboard-documents";
import { ChatPanel } from "@/components/chat-panel";
import { PortalCaseHeader } from "@/components/portal/portal-case-header";
import { NextActionCard } from "@/components/portal/next-action-card";
import { CaseCaptainCard } from "@/components/portal/case-captain-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCustomer } from "@/lib/customer-context";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ClipboardCheck, X } from "lucide-react";
import type { CaseDetail, DocumentItem, Fact, Message } from "@/lib/types";

const CUSTOMER_PROMPTS = [
  "What documents do I need?",
  "Explain my tax situation",
  "What should I do first?",
  "When is my next deadline?",
];

interface DashboardClientProps {
  caseData: CaseDetail;
  openActionCount: number;
  facts: Fact[];
  documents: DocumentItem[];
  conversationId: number | null;
  initialMessages: Message[];
  advisorGreeting: string | null;
}

export function DashboardClient({
  caseData,
  openActionCount,
  facts,
  documents,
  conversationId,
  initialMessages,
  advisorGreeting,
}: DashboardClientProps) {
  const { tier } = useCustomer();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  useEffect(() => {
    const justUpgraded = localStorage.getItem("kiyos-just-upgraded");
    if (justUpgraded === "true") {
      setShowUpgradeBanner(true);
      localStorage.removeItem("kiyos-just-upgraded");
    }
  }, []);

  const hasExistingAssistantMessages = initialMessages.some(
    (m) => m.role === "assistant"
  );

  const messagesWithGreeting: Message[] =
    advisorGreeting && !hasExistingAssistantMessages
      ? [
          {
            id: 0,
            role: "assistant" as const,
            content: advisorGreeting,
            created_at: new Date().toISOString(),
          },
          ...initialMessages,
        ]
      : initialMessages;

  const needsDocs = documents.some((d) => d.status === "uploaded");
  const assessmentReady = caseData.assessments.length > 0;

  return (
    <div className="space-y-4">
      {/* Upgrade welcome banner */}
      {showUpgradeBanner && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">
                Welcome to your premium experience!
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                You now have access to dedicated advisor support, a comprehensive
                tax assessment, and full document review. Your case captain will
                reach out within 24 hours.
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeBanner(false)}
              className="shrink-0 rounded p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Next action CTA */}
      <NextActionCard
        tier={tier}
        needsDocs={needsDocs}
        assessmentReady={assessmentReady}
      />

      {/* Named advisor + quarterly call */}
      <CaseCaptainCard
        caseId={caseData.id}
        captain={caseData.case_captain}
        clientName={caseData.client_name}
      />

      {/* Verify-and-confirm prompt until the customer has confirmed their details */}
      {!caseData.profile_confirmed_at && facts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-950">Check the details we have for you</p>
              <p className="text-xs text-amber-800">
                We&apos;ve pre-filled {facts.length} facts from your documents. A quick check now
                keeps your assessment accurate.
              </p>
            </div>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/portal/verify">Review &amp; confirm</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Compact case header */}
      <PortalCaseHeader caseData={caseData} />

      {/* Two-column grid: Wealth (60%) | Chat (40%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Left column — Wealth panel */}
        <div className="min-w-0">
          <WealthPanel facts={facts} openActionCount={openActionCount} />
        </div>

        {/* Right column — Ask Kiyos chat */}
        <div className="min-w-0">
          <div
            className="rounded-xl border bg-card overflow-hidden"
            style={{ height: "min(calc(100vh - 220px), 600px)" }}
          >
            {conversationId ? (
              <ChatPanel
                conversationId={conversationId}
                initialMessages={messagesWithGreeting}
                caseClientName={caseData.client_name}
                suggestedPrompts={CUSTOMER_PROMPTS}
                embedded
                portalMode
              />
            ) : (
              <ChatPanel
                conversationId={1}
                initialMessages={messagesWithGreeting}
                caseClientName={caseData.client_name}
                suggestedPrompts={CUSTOMER_PROMPTS}
                embedded
                portalMode
              />
            )}
          </div>
        </div>
      </div>

      {/* Full-width documents section below */}
      <DashboardDocuments documents={documents} />
    </div>
  );
}
