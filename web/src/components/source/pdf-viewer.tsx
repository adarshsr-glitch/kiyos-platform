"use client";

/**
 * Shows a sample document: the page drawn on screen exactly as the generated PDF lays it
 * out (so it shows in any browser, including ones without a built-in PDF viewer), with the
 * line Kiyos read highlighted, plus the real PDF to open or download.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { SideSheet } from "@/components/side-sheet";
import { buildPdf, type PdfDoc } from "@/lib/mock-pdf";

const rs = (s: string) => s.replace(/Rs\.\s?/g, "₹");

export function PdfViewer({ doc, onClose }: { doc: PdfDoc | null; onClose: () => void }) {
  return (
    <SideSheet open={!!doc} onClose={onClose} wide eyebrow={doc ? pdfEyebrow(doc) : undefined} title={doc?.title ?? ""}>
      {doc && <PdfBody doc={doc} />}
    </SideSheet>
  );
}

/** What sits above a document's title: who issued it, and which page. */
export const pdfEyebrow = (doc: PdfDoc) => (doc.paginate ? doc.issuer : `${doc.issuer} · page ${doc.page} of ${doc.pages}`);

/** The document itself, for any panel: the page as printed, the line Kiyos read, and the real PDF. */
export function PdfBody({ doc }: { doc: PdfDoc }) {
  const blob = useMemo(() => buildPdf(doc), [doc]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  const name = `${doc.title.replace(/[^\w]+/g, "-").replace(/-+$/, "")}.pdf`;

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/70 p-3 sm:p-6">
        <Page doc={doc} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12.5px] text-muted-foreground">
        <span>{doc.paginate ? "Sent to you on WhatsApp. Yours to keep." : "The highlighted line is what Kiyos read. Sample document generated for the prototype."}</span>
        {url && (
          <span className="flex items-center gap-4">
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Open PDF
            </a>
            <a href={url} download={name} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </span>
        )}
      </div>
    </div>
  );
}

/** The A4 page, laid out as the PDF is. */
function Page({ doc }: { doc: PdfDoc }) {
  return (
    <article
      className={`mx-auto flex w-full max-w-[640px] flex-col bg-white ${doc.paginate ? "min-h-[600px]" : "aspect-[595/842]"} px-[7%] pb-[4%] pt-[6%] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_10px_30px_-12px_rgba(0,0,0,0.25)]`}
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      <header className="flex items-start justify-between gap-4 border-b-[1.5px] border-[#333] pb-3">
        <p className="text-[17px] font-bold leading-tight">{doc.issuer}</p>
        <p className="shrink-0 text-[10px] text-[#777]">{doc.reference}</p>
      </header>
      <h3 className="mt-5 text-[15px] font-bold">{doc.title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {doc.meta.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[9.5px] text-[#777]">{k}</dt>
            <dd className="text-[11.5px]">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 space-y-4">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <p className="border-b border-[#ccc] pb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#555]">{s.heading}</p>}
            {s.paragraphs?.map((p, j) => (
              <p key={j} className="mt-2 text-[11.5px] leading-relaxed text-[#333]">
                {p}
              </p>
            ))}
            {s.rows?.map((r, j) => (
              <p
                key={j}
                className={`relative flex items-baseline justify-between gap-4 border-b border-[#eee] py-[5px] text-[11.5px] ${r.hit ? "-mx-2 bg-[#ffeb8c] px-2 font-bold" : ""} ${r.bold ? "font-bold" : ""}`}
              >
                {r.hit && <span className="absolute -left-3 top-0 h-full w-[3px] bg-[#d98c1a]" aria-hidden />}
                <span>{r.label}</span>
                <span className="tabular-nums">{rs(r.value)}</span>
              </p>
            ))}
          </section>
        ))}
      </div>
      <footer className="mt-auto flex justify-between border-t border-[#ddd] pt-2 text-[9px] text-[#888]">
        <span>{doc.footer ?? "Sample document generated for the Kiyos prototype. Not a real record."}</span>
        {!doc.paginate && (
          <span>
            Page {doc.page} of {doc.pages}
          </span>
        )}
      </footer>
    </article>
  );
}
