import { getCase, listMessages } from "@/lib/api";
import { DashboardClient } from "./dashboard-client";

export default async function PortalDashboardPage() {
  const caseData = await getCase(1);

  const firstName = caseData.client_name.split(" ")[0];

  const customerItems = caseData.action_items.filter(
    (i) => i.assignee === "customer"
  );
  const openCustomerItems = customerItems.filter((i) => i.status !== "done");

  const openTopics = caseData.topics.filter((t) => t.status !== "resolved");
  const resolvedTopics = caseData.topics.filter((t) => t.status === "resolved");

  const topicSummary =
    resolvedTopics.length > 0
      ? `So far, we've resolved ${resolvedTopics.length} item${resolvedTopics.length > 1 ? "s" : ""} including ${resolvedTopics.map((t) => t.title.toLowerCase()).join(" and ")}.`
      : "";
  const pendingSummary =
    openTopics.length > 0
      ? ` We're still working on ${openTopics.map((t) => t.title.toLowerCase()).join(", ")}.`
      : "";
  const nextSteps =
    openCustomerItems.length > 0
      ? ` You have ${openCustomerItems.length} pending action${openCustomerItems.length > 1 ? "s" : ""} to complete on your end.`
      : "";

  const advisorGreeting = caseData.summary
    ? `Hi ${firstName}! Welcome to your Kiyos dashboard.${topicSummary ? ` Great news — ${topicSummary.charAt(0).toLowerCase() + topicSummary.slice(1)}` : ""}${pendingSummary || ""}${nextSteps || " Everything is on track."} I'm here whenever you need me — just type a question below.`
    : `Hi ${firstName}! Welcome to Kiyos. I'm here to help you with your cross-border tax situation. Feel free to ask me anything to get started.`;

  const messages = caseData.conversation_id
    ? await listMessages(caseData.conversation_id)
    : [];

  return (
    <DashboardClient
      caseData={caseData}
      openActionCount={openCustomerItems.length}
      facts={caseData.facts}
      documents={caseData.documents}
      conversationId={caseData.conversation_id}
      initialMessages={messages}
      advisorGreeting={advisorGreeting}
    />
  );
}
