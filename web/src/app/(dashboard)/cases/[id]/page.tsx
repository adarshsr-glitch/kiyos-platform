import Link from "next/link";
import {
  getCase,
  listMessages,
  listAuditLog,
  listCaseTickets,
  listCaseEvents,
} from "@/lib/api";
import { CaseWorkspace } from "@/components/case-workspace";
import { CaseHero } from "@/components/case-hero";
import { ChatPanel } from "@/components/chat-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [caseData, auditLog, tickets, events] = await Promise.all([
    getCase(params.id),
    listAuditLog(params.id),
    listCaseTickets(params.id),
    listCaseEvents(params.id),
  ]);

  const messages = caseData.conversation_id
    ? await listMessages(caseData.conversation_id)
    : [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-6 bg-background/95 backdrop-blur">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            href="/cases"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Cases
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{caseData.client_name}</span>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-[2] min-w-0">
          <CaseHero caseData={caseData} />
          <CaseWorkspace
            caseData={caseData}
            auditLog={auditLog}
            tickets={tickets}
            events={events}
          />
        </ScrollArea>

        <div className="w-[320px] shrink-0">
          {caseData.conversation_id ? (
            <ChatPanel
              conversationId={caseData.conversation_id}
              initialMessages={messages}
              caseClientName={caseData.client_name}
              advisorName={caseData.case_captain}
              className="border-l"
            />
          ) : (
            <div className="flex h-full items-center justify-center border-l p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No conversation started for this case.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
