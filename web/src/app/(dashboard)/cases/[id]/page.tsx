import Link from "next/link";
import { getCase, listMessages, listAuditLog } from "@/lib/api";
import { CaseTabs } from "@/components/case-tabs";
import { ChatPanel } from "@/components/chat-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [caseData, auditLog] = await Promise.all([
    getCase(params.id),
    listAuditLog(params.id),
  ]);

  const messages = caseData.conversation_id
    ? await listMessages(caseData.conversation_id)
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar / breadcrumb */}
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            href="/cases"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Cases
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {caseData.client_name}
          </span>
        </nav>
      </header>

      {/* Two-column workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left 2/3: case detail with tabs */}
        <ScrollArea className="flex-[2] min-w-0">
          <CaseTabs caseData={caseData} auditLog={auditLog} />
        </ScrollArea>

        {/* Right 1/3: chat panel */}
        <div className="w-[380px] shrink-0">
          {caseData.conversation_id ? (
            <ChatPanel
              conversationId={caseData.conversation_id}
              initialMessages={messages}
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
