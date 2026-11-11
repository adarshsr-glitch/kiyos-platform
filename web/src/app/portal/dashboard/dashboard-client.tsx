"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/chat-panel";
import { UpNext, buildTasks } from "@/components/portal/up-next";
import { CaseProgress, DocumentsSummary } from "@/components/portal/case-progress";
import { FinancialPicture } from "@/components/portal/financial-picture";
import { CaptainChip } from "@/components/portal/captain-chip";
import { missingRequiredDocs } from "@/components/portal/document-checklist";
import { useCustomer } from "@/lib/customer-context";
import { pictureFromFacts, pictureFromOnboarding } from "@/lib/financial-picture";
import { formatDate, relativeDays } from "@/lib/format";
import { FREE_PROMPTS, PREMIUM_PROMPTS, welcomeMessage } from "@/lib/portal-chat";
import type { CaseDetail, Message } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardClient({
  caseData,
  initialMessages,
}: {
  caseData: CaseDetail;
  initialMessages: Message[];
}) {
  const { tier, onboardingData } = useCustomer();
  const premium = tier === "premium";
  const firstName = caseData.client_name.split(" ")[0];

  useEffect(() => {
    if (localStorage.getItem("kiyos-just-upgraded") === "true") {
      localStorage.removeItem("kiyos-just-upgraded");
      toast.success(`You're on the full plan. ${caseData.case_captain} is now your case captain.`);
    }
  }, [caseData.case_captain]);

  const tasks = useMemo(() => buildTasks(caseData, tier), [caseData, tier]);

  const picture = useMemo(() => {
    const fromFacts = pictureFromFacts(caseData.facts, caseData.members.map((m) => m.name));
    return fromFacts.length > 0
      ? fromFacts
      : pictureFromOnboarding(onboardingData.income?.sources, onboardingData.assets?.items);
  }, [caseData, onboardingData]);

  const today = new Date().toISOString().slice(0, 10);
  const nextDeadline = [
    ...caseData.action_items.filter((i) => i.status !== "done").map((i) => i.due_date),
    ...caseData.topics.filter((t) => t.status !== "resolved").map((t) => t.due_date),
  ]
    .filter((d): d is string => !!d && d >= today)
    .sort()[0];

  const journey = caseData.name.split("—")[1]?.trim();
  const settled = caseData.topics.filter((t) => t.status === "resolved").length;

  const messages =
    initialMessages.length === 0 ? [welcomeMessage(firstName, tier)] : initialMessages;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {[caseData.tax_year && `Tax year ${caseData.tax_year}`, journey].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-0.5 font-serif text-2xl font-medium text-foreground sm:text-[28px]">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {premium && caseData.topics.length > 0
                ? `${settled} of ${caseData.topics.length} tax questions settled`
                : "Free plan · general guidance only"}
              {premium && nextDeadline && (
                <>
                  {" · "}
                  <span className="text-foreground">
                    next deadline {formatDate(nextDeadline, { day: "numeric", month: "short" })}
                  </span>{" "}
                  ({relativeDays(nextDeadline)})
                </>
              )}
            </p>
          </div>
          {premium && (
            <CaptainChip
              caseId={caseData.id}
              captain={caseData.case_captain}
              clientName={caseData.client_name}
            />
          )}
        </header>

        <UpNext tasks={tasks} />

        <div className="grid gap-4 md:grid-cols-2">
          <CaseProgress topics={caseData.topics} locked={!premium} />
          <DocumentsSummary
            documents={caseData.documents}
            neededCount={missingRequiredDocs(caseData.documents, premium).length}
            locked={!premium}
          />
        </div>

        <FinancialPicture items={picture} />
      </div>

      {/* Desktop: the WhatsApp thread sits beside the case. Mobile: it's the Chat tab. */}
      <aside className="hidden lg:sticky lg:top-[76px] lg:block lg:h-[calc(100vh-100px)]">
        {caseData.conversation_id && (
          <ChatPanel
            conversationId={caseData.conversation_id}
            initialMessages={messages}
            caseClientName={caseData.client_name}
            suggestedPrompts={premium ? PREMIUM_PROMPTS : FREE_PROMPTS}
            caseId={caseData.id}
            captainName={caseData.case_captain}
            embedded
            portalMode
          />
        )}
      </aside>
    </div>
  );
}
