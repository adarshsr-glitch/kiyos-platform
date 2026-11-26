/**
 * A tiny PDF writer for the prototype's sample documents: one A4 page, Helvetica, a
 * letterhead, key details, tables of label/value rows and a yellow highlight behind the
 * line Kiyos read. No dependency; the output opens in any PDF viewer.
 */

export type PdfRow = { label: string; value: string; hit?: boolean; bold?: boolean };
export type PdfSection = { heading?: string; rows?: PdfRow[]; paragraphs?: string[] };
export type PdfDoc = {
  issuer: string;
  issuerLine?: string;
  title: string;
  meta: [string, string][];
  sections: PdfSection[];
  page: number;
  pages: number;
  reference: string;
  /** Number pages 1..n as the content flows (for documents Kiyos itself issues). */
  paginate?: boolean;
  /** Footer line; defaults to the sample-document notice. */
  footer?: string;
};

const PAGE_W = 595;
const PAGE_H = 842;
const L = 56;
const R = 539;

/** Standard fonts only cover WinAnsi: spell out the rupee sign and plain the punctuation. */
function ascii(s: string): string {
  return s
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[·•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/×/g, "x")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7e]/g, "");
}
const esc = (s: string) => ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** Helvetica advance widths (per 1000 em), close enough to right-align numbers. */
function width(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of ascii(s).split("")) {
    if (/[0-9]/.test(ch)) w += 556;
    else if (/[.,:;'| ]/.test(ch)) w += 278;
    else if (/[A-Z]/.test(ch)) w += bold ? 722 : 667;
    else if (/[mw]/.test(ch)) w += 833;
    else if (/[ijlft]/.test(ch)) w += 260;
    else w += bold ? 556 : 520;
  }
  return (w / 1000) * size;
}

function wrap(text: string, size: number, maxW: number): string[] {
  const words = ascii(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (width(next, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function buildPdf(doc: PdfDoc): Blob {
  // Content flows onto as many A4 pages as it needs.
  const pages: string[][] = [[]];
  let ops = pages[0];
  const text = (x: number, y: number, s: string, size = 10, bold = false, gray = 0) =>
    ops.push(`${gray} g BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(s)}) Tj ET`);
  const right = (y: number, s: string, size = 10, bold = false, gray = 0) => text(R - width(s, size, bold), y, s, size, bold, gray);
  const rule = (y: number, gray = 0.82, w = 0.6) => ops.push(`${gray} G ${w} w ${L} ${y} m ${R} ${y} l S`);

  let y = PAGE_H - 64;
  const room = (h: number) => {
    if (y - h >= 92) return;
    ops = [];
    pages.push(ops);
    y = PAGE_H - 64;
    text(L, y, doc.issuer, 9, true, 0.4);
    right(y, doc.title, 8.5, false, 0.4);
    y -= 12;
    rule(y, 0.82);
    y -= 26;
  };

  // letterhead
  text(L, y, doc.issuer, 15, true);
  if (doc.issuerLine) text(L, y - 15, doc.issuerLine, 8.5, false, 0.4);
  right(y, doc.reference, 8.5, false, 0.4);
  y -= 30;
  rule(y, 0.2, 1.2);
  y -= 30;
  text(L, y, doc.title, 13, true);
  y -= 22;

  // key details, two per line
  for (let i = 0; i < doc.meta.length; i += 2) {
    doc.meta.slice(i, i + 2).forEach(([k, v], j) => {
      const x = L + j * 245;
      text(x, y, k, 8, false, 0.45);
      text(x, y - 11, v, 9.5);
    });
    y -= 28;
  }
  y -= 6;

  for (const sec of doc.sections) {
    if (sec.heading) {
      room(60);
      text(L, y, sec.heading.toUpperCase(), 8.5, true, 0.35);
      y -= 8;
      rule(y);
      y -= 15;
    }
    for (const p of sec.paragraphs ?? []) {
      const lines = wrap(p, 9.5, R - L);
      room(lines.length * 13.5 + 6);
      for (const line of lines) {
        text(L, y, line, 9.5, false, 0.15);
        y -= 13.5;
      }
      y -= 6;
    }
    for (const r of sec.rows ?? []) {
      room(19);
      if (r.hit) {
        // the line Kiyos read: a highlighter mark behind it, and a margin tick
        ops.push(`1 0.92 0.55 rg ${L - 6} ${y - 5} ${R - L + 12} 18 re f`);
        ops.push(`0.85 0.55 0.1 rg ${L - 14} ${y - 5} 3 18 re f`);
      }
      text(L, y, r.label, 9.5, !!r.bold || !!r.hit, r.hit ? 0 : 0.2);
      right(y, r.value, 9.5, !!r.bold || !!r.hit);
      y -= 6;
      rule(y, 0.9, 0.4);
      y -= 13;
    }
    y -= 14;
  }

  // footers
  pages.forEach((p, i) => {
    ops = p;
    rule(64, 0.85);
    text(L, 50, doc.footer ?? "Sample document generated for the Kiyos prototype. Not a real record.", 7.5, false, 0.45);
    right(50, doc.paginate ? `Page ${i + 1} of ${pages.length}` : `Page ${doc.page} of ${doc.pages}`, 7.5, false, 0.45);
  });

  const n = pages.length;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${n} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  pages.forEach((p, i) => {
    const stream = p.join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}
