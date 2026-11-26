import Link from "next/link";
import { Smartphone } from "lucide-react";
import { getCase, getConversation, listCaseTickets, listDocumentRequests } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { hasCaptain } from "@/lib/captain";
import { WhatsAppPhone } from "@/components/portal/whatsapp-phone";
import { CaptainQuestions } from "@/components/case/captain-questions";
import { OpenWithYou, type OpenItem } from "@/components/portal/open-with-you";

export const metadata = { title: "Messages · Kiyos" };

export const dynamic = "force-dynamic";

/**
 * Messages: the customer's conversation with Kiyos inside the workspace. It is the same thread
 * as their WhatsApp: what they write here reaches Kiyos and their expert, and replies arrive on
 * both. Beside it, a rail: what is open with the customer first (answered or uploaded in place),
 * then their expert with the box to ask, and their questions and where each stands.
 */
export default async function PortalChatPage() {
  const caseData = await getCase(portalCaseId());
  const convo = caseData.conversation_id ? await getConversation(caseData.conversation_id) : null;
  const [tickets, requests] = await Promise.all([listCaseTickets(caseData.id).catch(() => []), listDocumentRequests(caseData.id).catch(() => [])]);
  const lead = caseData.case_captain;
  const captained = tierOf(caseData) === "premium" && hasCaptain(lead);
  const qualification = caseData.reviewers?.find((r) => r.name === lead)?.qualification ?? null;

  // What is open with the customer: the expert's questions, then documents asked for; soonest first.
  const openItems: OpenItem[] = [
    ...caseData.action_items
      .filter((i) => i.assignee === "customer" && i.status !== "done" && i.notes === "clarification")
      .map((i) => ({ key: `item-${i.id}`, kind: "question" as const, title: i.title, due: i.due_date })),
    ...requests
      .filter((r) => r.status === "pending" || r.status === "rejected")
      .map((r) => ({ key: `req-${r.id}`, kind: "upload" as const, title: r.title, due: r.due_date, request: r })),
  ].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">Messages</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {captained ? `Your conversation with ${lead.split(" ")[0]}` : "Your conversation with Kiyos"}, the same as on WhatsApp. Replies reach both.
          </p>
        </div>
        <Link href="/portal/whatsapp" className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium text-foreground hover:bg-muted">
          <Smartphone className="h-4 w-4" aria-hidden /> See it on your phone
        </Link>
      </section>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Conversation" className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden rounded-[14px] border">
          {convo ? (
            <WhatsAppPhone conversationId={convo.id} initialMessages={convo.messages} fullScreen />
          ) : (
            <p className="p-8 text-sm text-muted-foreground">No conversation yet.</p>
          )}
        </section>
        {captained && (
          <aside className="flex min-w-0 flex-col gap-4">
            <OpenWithYou items={openItems} conversationId={caseData.conversation_id ?? null} caseId={caseData.id} by={caseData.client_name} lead={lead} />
            <CaptainQuestions caseId={caseData.id} by={caseData.client_name} captain={lead} qualification={qualification} tickets={tickets} topics={caseData.topics} />
          </aside>
        )}
      </div>
    </div>
  );
}
