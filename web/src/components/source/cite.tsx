"use client";

/**
 * A figure that opens where it came from. Every figure behaves the same way (Review 05, the
 * one-panel rule): a click opens the right-hand panel (a bottom sheet on phones), never a
 * pop-over, and anything inside it (a breakdown row, the document) opens in that same panel
 * with a Back link. What the panel shows is one of
 *   - a document: the document, section and line, the line as printed with the value
 *     highlighted, and whether the expert has reviewed it;
 *   - something the customer told us (WhatsApp or onboarding): the question and the answer;
 *   - a change they asked for in chat and confirmed: their words and the dates;
 *   - an entry by the expert: who and when;
 *   - a breakdown (a day count or a total): the rows it is made of, each with its own source,
 *     opened in place with a way back.
 * Nothing here interprets or calculates anything: it shows where values were read.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileSearch, FileText, MessageCircle, UserCheck } from "lucide-react";
import type { Evidence } from "@/lib/types";
import { useCustomerMaybe } from "@/lib/customer-context";
import { formatDate } from "@/lib/format";
import { SideSheet } from "@/components/side-sheet";
import { mockDocument } from "@/lib/mock-documents";
import type { PdfDoc } from "@/lib/mock-pdf";
import { PdfBody, pdfEyebrow } from "./pdf-viewer";
import { cn } from "@/lib/utils";

export type SourceNode = {
  /** What the value is: "401(k) or IRA", "Days in India · FY 2025-26" */
  title: string;
  /** The value as shown next to the icon */
  value?: string | null;
  evidence?: Evidence | null;
  /** Short source name, shown when no exact evidence was recorded */
  source?: string | null;
  /** A breakdown: what the value is made of, each row with its own source */
  parts?: { label: string; value: string; node?: SourceNode | null; muted?: boolean }[];
  /** One line under a breakdown, e.g. how the rows add up */
  note?: string | null;
};

/** One step in the panel: a source to read, or the document itself. */
type Step = { kind: "node"; node: SourceNode } | { kind: "pdf"; doc: PdfDoc };
const stepTitle = (st: Step) => (st.kind === "node" ? st.node.title : st.doc.title);

/**
 * A figure that opens its source. Pass the figure as children: it gets a dotted underline. Without
 * children, a small source mark is shown next to the figure (where the figure can't be wrapped).
 */
export function Cite({ node, className, children }: { node: SourceNode; className?: string; children?: React.ReactNode }) {
  const [stack, setStack] = useState<Step[]>([]);
  const holder = useCustomerMaybe()?.caseData.client_name ?? "Account holder";
  const top = stack[stack.length - 1];
  const close = useCallback(() => setStack([]), []);
  const push = (n: SourceNode) => setStack((s) => [...s, { kind: "node", node: n }]);
  const openDoc = (ev: Extract<Evidence, { kind: "document" }>) => setStack((s) => [...s, { kind: "pdf", doc: mockDocument(ev, holder) }]);
  const back = stack.length > 1 ? () => setStack((s) => s.slice(0, -1)) : null;
  const backTo = stack.length > 1 ? stepTitle(stack[stack.length - 2]) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setStack([{ kind: "node", node }]);
        }}
        aria-label={`${node.value ? `${node.value}. ` : ""}Where ${node.title.toLowerCase()} comes from`}
        aria-haspopup="dialog"
        className={cn(
          children
            ? "cursor-pointer rounded-sm text-left underline decoration-current/25 decoration-dotted decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-current/70"
            : "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded align-middle text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground",
          top && !children && "bg-muted text-foreground",
          className
        )}
      >
        {children ?? <FileSearch className="h-3 w-3" />}
      </button>
      <SideSheet
        open={!!top}
        onClose={close}
        wide={top?.kind === "pdf"}
        eyebrow={top?.kind === "pdf" ? pdfEyebrow(top.doc) : "Where this comes from"}
        title={top ? (top.kind === "pdf" ? top.doc.title : [top.node.title, top.node.value].filter(Boolean).join(" · ")) : ""}
      >
        {top && (
          <div className="space-y-4">
            {back && (
              <button onClick={back} className="-mt-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" /> {backTo}
              </button>
            )}
            {top.kind === "pdf" ? <PdfBody doc={top.doc} /> : <Content node={top.node} open={push} openDoc={openDoc} />}
          </div>
        )}
      </SideSheet>
    </>
  );
}

type OpenDoc = (ev: Extract<Evidence, { kind: "document" }>) => void;

function Heading({ icon: Icon, title, sub }: { icon: typeof FileText; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-start gap-2 text-[15.5px] font-medium leading-snug text-foreground">
        <Icon className="mt-[3px] h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{title}</span>
      </p>
      {sub && <p className="mt-1 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Content({ node, open, openDoc }: { node: SourceNode; open: (n: SourceNode) => void; openDoc: OpenDoc }) {
  if (node.parts) return <Breakdown node={node} open={open} />;
  const ev = node.evidence;
  if (!ev) {
    return (
      <>
        <Heading icon={FileText} title={node.title} sub={node.value ?? undefined} />
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {node.source ? (
            <>
              From <span className="text-foreground">“{node.source}”</span>. The exact line wasn’t recorded when this was added.
            </>
          ) : (
            "Where this came from wasn’t recorded."
          )}
        </p>
      </>
    );
  }
  if (ev.kind === "document") return <DocumentSource ev={ev} openDoc={openDoc} />;
  if (ev.kind === "answer") return <AnswerSource ev={ev} />;
  if (ev.kind === "said") return <SaidSource ev={ev} />;
  if (ev.kind === "expert") {
    return (
      <>
        <Heading icon={UserCheck} title={`Entered by ${ev.by ?? "your expert"}`} sub={ev.at ? formatDate(ev.at, { day: "numeric", month: "short", year: "numeric" }) : undefined} />
        <p className="text-[13.5px] text-muted-foreground">{node.title}: {node.value}</p>
      </>
    );
  }
  return (
    <>
      <Heading icon={FileText} title={node.title} sub="Illustrative" />
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">An illustrative figure for the demo. No document stands behind it.</p>
    </>
  );
}

function Breakdown({ node, open }: { node: SourceNode; open: (n: SourceNode) => void }) {
  return (
    <div>
      <ul className="divide-y border-y">
        {node.parts!.map((p, i) => (
          <li key={i}>
            <button
              disabled={!p.node}
              onClick={() => p.node && open(p.node)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-[13.5px] enabled:hover:bg-muted/60 disabled:cursor-default"
            >
              <span className={cn("min-w-0", p.muted ? "text-muted-foreground" : "text-foreground")}>{p.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="tabular-nums text-foreground">{p.value}</span>
                {p.node ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <span className="w-3.5" />}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {node.note && <p className="mt-2.5 text-[12px] leading-snug text-muted-foreground">{node.note}</p>}
    </div>
  );
}

function DocumentSource({ ev, openDoc }: { ev: Extract<Evidence, { kind: "document" }>; openDoc: OpenDoc }) {
  const customer = useCustomerMaybe();
  const doc = ev.document_id != null ? customer?.caseData.documents.find((d) => d.id === ev.document_id) : undefined;
  const captain = customer?.caseData.case_captain;
  const first = ev.lines[0];
  const sub = first ? [first.section, `Page ${first.page}${ev.pages ? ` of ${ev.pages}` : ""}`].filter(Boolean).join(" · ") : undefined;
  const status = !doc
    ? null
    : doc.status === "reviewed"
      ? { text: `Reviewed by ${captain ?? "your expert"}`, cls: "text-emerald-700" }
      : doc.status === "rejected"
        ? { text: "A new copy was asked for", cls: "text-amber-800" }
        : { text: `Read by Kiyos · ${captain ? captain.split(" ")[0] : "your expert"} is checking it`, cls: "text-sky-700" };

  return (
    <>
      <Heading icon={FileText} title={ev.title} sub={sub} />
      {ev.lines.length > 0 ? (
        <div className="space-y-1.5 rounded-xl bg-muted/60 px-4 py-3.5 font-mono text-[13px] leading-relaxed text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))]">
          {ev.lines.map((l, i) => (
            <p key={i}>
              {l.label} <span className="text-muted-foreground/70">......</span>{" "}
              <mark className="whitespace-nowrap rounded bg-amber-100 px-1 py-px tabular-nums text-foreground">{l.value}</mark>
              {i > 0 && l.page !== ev.lines[i - 1].page && <span className="ml-2 text-[11px] text-muted-foreground">p. {l.page}</span>}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">Recorded from this document; the exact line wasn’t kept when it was read.</p>
      )}
      {ev.note && <p className="text-[12.5px] leading-snug text-muted-foreground">{ev.note}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button onClick={() => openDoc(ev)} className="inline-flex items-center gap-1 text-[14px] font-medium text-foreground hover:underline">
            Open document →
          </button>
          {customer && ev.document_id != null && (
            <Link href={`/portal/documents?doc=${ev.document_id}`} className="text-[12.5px] text-muted-foreground hover:text-foreground hover:underline">
              In your Documents
            </Link>
          )}
        </span>
        {status && <span className={cn("text-[12px]", status.cls)}>{status.text}</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">{ev.sample ? "Sample reference for the prototype." : "Prototype: sample document, reading simulated."}</p>
    </>
  );
}

function SaidSource({ ev }: { ev: Extract<Evidence, { kind: "said" }> }) {
  const d = (s: string | null) => (s ? formatDate(s, { day: "numeric", month: "short", year: "numeric" }) : null);
  const prev = ev.previous && /^\d{4}-\d{2}-\d{2}$/.test(ev.previous) ? d(ev.previous) : ev.previous;
  return (
    <>
      <Heading icon={MessageCircle} title={`You told us ${ev.channel === "WhatsApp" ? "on WhatsApp" : "in chat"}`} sub={d(ev.said_at) ?? undefined} />
      {ev.quote && <p className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-[14px] text-foreground">“{ev.quote}”</p>}
      <p className="text-[13px] text-foreground">
        You confirmed the change in your profile{ev.confirmed_at ? ` on ${d(ev.confirmed_at)}` : ""}
        {prev ? <span className="text-muted-foreground"> · before, it was {prev}</span> : null}.
      </p>
    </>
  );
}

function AnswerSource({ ev }: { ev: Extract<Evidence, { kind: "answer" }> }) {
  const when = ev.at ? formatDate(ev.at, { day: "numeric", month: "short", year: "numeric" }) : undefined;
  return (
    <>
      <Heading icon={MessageCircle} title={`You told us ${ev.channel === "WhatsApp" ? "on WhatsApp" : "during onboarding"}`} sub={when} />
      <div className="space-y-2">
        <p className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-[13.5px] text-foreground">{ev.question}</p>
        <p className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-right text-[13.5px] text-foreground">{ev.answer}</p>
      </div>
      <p className="text-[12px] text-muted-foreground">Your own answer, not yet backed by a document.</p>
    </>
  );
}
