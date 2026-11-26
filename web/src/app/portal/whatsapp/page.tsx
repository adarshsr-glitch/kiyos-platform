import { getCase, getConversation } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { WhatsAppPhone } from "@/components/portal/whatsapp-phone";

export const metadata = { title: "WhatsApp · Kiyos" };

/**
 * The customer's WhatsApp thread with Kiyos, shown in a phone. In the product this
 * conversation happens in WhatsApp itself; the prototype renders the same thread
 * (same messages, same agent) so the journey can be followed in one place.
 */
export default async function WhatsAppPage() {
  const caseData = await getCase(portalCaseId());
  const convo = caseData.conversation_id ? await getConversation(caseData.conversation_id) : null;
  if (!convo) return <p className="p-8 text-sm text-muted-foreground">No WhatsApp conversation yet.</p>;
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-start justify-center bg-[#eef0ec] px-3 py-6">
      <figure className="w-full max-w-[400px]">
        <div className="h-[min(760px,calc(100vh-150px))] min-h-[540px] overflow-hidden rounded-[36px] border-[9px] border-[#1d1f21] bg-[#1d1f21] shadow-[0_24px_48px_-24px_rgba(15,40,30,0.45)]">
          <div className="h-full overflow-hidden rounded-[27px] bg-white">
            <WhatsAppPhone conversationId={convo.id} initialMessages={convo.messages} fullScreen />
          </div>
        </div>
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caseData.client_name}&apos;s WhatsApp chat with Kiyos</figcaption>
      </figure>
    </div>
  );
}
