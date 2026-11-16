import { getCase } from "@/lib/api";
import { portalCaseId } from "@/lib/portal-case";
import { tierOf } from "@/lib/tier";
import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/whatsapp";

/**
 * Chat page in the customer portal.
 *
 * The customer's primary conversation happens on WhatsApp, not inside the
 * workspace. This page explains that clearly and links them back to WhatsApp
 * rather than showing a redundant in-browser mockup of their own chat.
 */
export default async function PortalChatPage() {
  const caseData = await getCase(portalCaseId());
  const isPaid = tierOf(caseData) === "premium";
  const lead = caseData.case_captain;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366]/10">
        <MessageCircle className="h-8 w-8 text-[#25d366]" />
      </div>
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Your conversations happen on WhatsApp
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isPaid
            ? `${lead} and the Kiyos assistant are available on WhatsApp. Message us there for updates, questions, or anything you need help with.`
            : "The Kiyos assistant is available on WhatsApp. Message us there for your free assessment, general tax questions, or to get started with a plan."}
        </p>
      </div>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Open WhatsApp
        </a>
      )}
      <p className="text-xs text-muted-foreground">
        Documents, your profile and case details live here in your workspace.
        Day-to-day conversation stays on WhatsApp so it&apos;s always in your pocket.
      </p>
    </div>
  );
}
