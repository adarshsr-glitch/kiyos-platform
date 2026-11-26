/**
 * Sample documents for the prototype: from a source reference (the document, its section
 * and the line Kiyos read), lay out a believable page of that kind of document with the
 * line in place and highlighted: a payslip with its earnings breakdown, a bank statement
 * with its transactions, a valuer's report, an offer letter, a tax form, an RSU release.
 * Surrounding figures are illustrative and derived from the cited value; no tax amounts are
 * shown. Real extraction would show the customer's actual file here.
 */

import type { Evidence, InitialScan } from "./types";
import type { PdfDoc, PdfRow, PdfSection } from "./mock-pdf";

type Doc = Extract<Evidence, { kind: "document" }>;

const seedOf = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const amountOf = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && /\d/.test(v) ? n : null;
};
const isInr = (v: string, ev: Doc) => /₹|Rs\.|INR/.test(v) || /india|hdfc|form 16|ais|itr|salary slip|valuer|licence/i.test(`${ev.title} ${ev.issuer ?? ""}`);
function money(n: number, inr: boolean): string {
  const r = Math.round(n);
  if (!inr) return `$${r.toLocaleString("en-US")}`;
  const s = String(r);
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `Rs. ${head ? `${head},` : ""}${s.slice(-3)}`;
}
const mask = (seed: number, n = 4) => `XXXX${String(seed % 10 ** n).padStart(n, "0")}`;

export function mockDocument(ev: Doc, holder: string): PdfDoc {
  const s = seedOf(`${ev.title}${ev.filename}`);
  const t = `${ev.title} ${ev.issuer ?? ""}`.toLowerCase();
  const cited = ev.lines[0];
  const value = cited?.value ?? "";
  const n = amountOf(value);
  const inr = isInr(value, ev);
  const hit = (label: string, v: string): PdfRow => ({ label, value: v, hit: true });
  const citedRows: PdfRow[] = ev.lines.map((l) => hit(l.label, l.value.replace(/₹/g, "Rs. ")));
  const page = cited?.page ?? 1;
  const pages = Math.max(ev.pages ?? 1, page);
  const reference = `Ref ${String(s).slice(0, 8)}`;
  const period = ev.title.split("·")[1]?.trim() ?? "";
  const base = { issuer: ev.issuer ?? ev.title, page, pages, reference };
  let sections: PdfSection[] = [];
  let meta: [string, string][] = [];
  let title = ev.title.split("·")[0].trim();

  if (/pay stub|salary slip|payslip/.test(t) && n) {
    const india = /salary slip/.test(t);
    title = india ? "Salary slip" : "Earnings statement";
    meta = [
      ["Employee", holder],
      ["Employee ID", `E${10000 + (s % 89999)}`],
      ["Pay period", period || "This month"],
      [india ? "Bank account" : "Deposited to", `${india ? "HDFC" : "Chase"} ${mask(s)}`],
    ];
    const parts = india
      ? [["Basic", 0.5], ["House rent allowance", 0.2], ["Special allowance", 0.25], ["Conveyance and other allowances", 0.05]]
      : [["Regular pay", 0.9], ["Wellness and remote stipend", 0.02], ["Quarterly bonus (pro-rated)", 0.08]];
    sections = [
      { heading: "Earnings", rows: [...parts.map(([l, f]) => ({ label: String(l), value: money(n * Number(f), inr) })), ...citedRows] },
      { heading: "Pre-tax deductions", rows: [{ label: india ? "Provident fund (employee)" : "401(k) deferral", value: money(n * (india ? 0.06 : 0.06), inr) }] },
      { paragraphs: ["Tax withholding lines are omitted from this sample. Figures above are illustrative and derived from the gross amount."] },
    ];
  } else if (/valuer/.test(t)) {
    title = "Valuation report";
    meta = [
      ["Prepared for", holder],
      ["Report date", "12 Mar 2026"],
      ["Valuer registration", `IBBI/RV/${String(s % 99999).padStart(5, "0")}`],
      ["Purpose", "Fair market value assessment"],
    ];
    sections = [
      { heading: "Property", paragraphs: ["Residential property inspected on site. Title documents, approved plan and recent comparable sales in the locality were reviewed. Valuation by the sales comparison method."] },
      {
        heading: cited?.section ?? "Valuation summary",
        rows: [
          { label: "Built-up area", value: `${1200 + (s % 900)} sq ft` },
          { label: "Comparable rate", value: n ? `${money(n / (1200 + (s % 900)), inr)} per sq ft` : "-" },
          ...citedRows,
          ...(n ? [{ label: "Realisable value (90%)", value: money(n * 0.9, inr) }, { label: "Distress value (80%)", value: money(n * 0.8, inr) }] : []),
        ],
      },
    ];
  } else if (/offer letter/.test(t)) {
    title = "Offer of employment";
    meta = [
      ["Candidate", holder],
      ["Date", "2 Jun 2026"],
      ["Location", "Bengaluru, India"],
      ["Reference", `HR/${2026}/${s % 9999}`],
    ];
    sections = [
      { paragraphs: [`Dear ${holder.split(" ")[0]},`, "We are pleased to offer you the position described below, on the terms set out in this letter and the attached schedule. Please sign and return a copy to confirm your acceptance."] },
      { heading: cited?.section ?? "Compensation", rows: [...citedRows, { label: "Notice period", value: "60 days" }, { label: "Probation", value: "None" }] },
    ];
  } else if (/statement|bank|account|deposit|savings/.test(t)) {
    title = ev.title.split("·")[0].trim() || "Account statement";
    meta = [
      ["Account holder", holder],
      ["Account number", mask(s, 6)],
      ["Statement period", period || "Year to date"],
      ["Branch", inr ? "Koramangala, Bengaluru" : "Main branch"],
    ];
    const isBalance = /balance|principal|value/i.test(cited?.label ?? "");
    if (isBalance && n) {
      sections = [
        {
          heading: cited?.section ?? "Account summary",
          rows: [
            { label: "Opening balance", value: money(n * 0.96, inr) },
            { label: "Total credits", value: money(n * 0.07, inr) },
            { label: "Total debits", value: money(n * 0.03, inr) },
            ...citedRows,
          ],
        },
      ];
    } else {
      const smalls = [
        { label: "Card payment - utilities", value: money((n ?? 1000) * 0.04, inr) },
        { label: "Transfer to savings", value: money((n ?? 1000) * 0.2, inr) },
      ];
      sections = [{ heading: cited?.section ?? "Transactions", rows: [smalls[0], ...citedRows, smalls[1], { label: "Closing balance", value: money((n ?? 1000) * (8 + (s % 5)), inr), bold: true }] }];
    }
  } else if (/passport|travel log/.test(t)) {
    title = "Passport - visa and stamp pages";
    meta = [
      ["Holder", holder],
      ["Passport number", `Z${mask(s, 7).slice(4)}`],
      ["Nationality", "Indian"],
      ["Pages", `${page} of ${pages}`],
    ];
    sections = [{ heading: "Immigration stamps", rows: citedRows }];
  } else if (/rsu|equity|carta|shareworks|trade confirmation|409a|grant/.test(t)) {
    title = ev.title.split("·")[0].trim();
    const price = 120 + (s % 260);
    meta = [
      ["Participant", holder],
      ["Plan", "2019 Equity Incentive Plan"],
      ["Grant ID", `G-${s % 999999}`],
      ["Date", period || "This year"],
    ];
    sections = [
      {
        heading: cited?.section ?? "Summary",
        rows: [
          ...(n && /vest|release|value/i.test(cited?.label ?? "") ? [{ label: "Units released", value: `${Math.max(1, Math.round(n / price)).toLocaleString("en-US")}` }, { label: "Fair market value per unit", value: `$${price}.00` }] : []),
          ...citedRows,
        ],
      },
    ];
  } else if (/lease|licence/.test(t)) {
    title = "Leave and licence agreement";
    meta = [
      ["Licensor", holder],
      ["Licensee", "Tenant (name on file)"],
      ["Term", "11 months, renewable"],
      ["Registration", `Sub-Registrar, ${mask(s, 5)}`],
    ];
    sections = [
      { paragraphs: ["This agreement is made between the Licensor and the Licensee for the use of the premises described in Schedule I, on the terms below."] },
      { heading: cited?.section ?? "Licence fee", rows: [...citedRows, ...(n ? [{ label: "Security deposit", value: money(n * 3, inr) }] : []), { label: "Escalation", value: "5% on renewal" }] },
    ];
  } else {
    // A form or statement: identifiers, then the boxes or lines read.
    meta = [
      [/w-2|form 16|pay/.test(t) ? "Employee" : "Recipient", holder],
      [/form 16|ais|itr/.test(t) ? "PAN" : "Taxpayer ID", /form 16|ais|itr/.test(t) ? `ABCDE${String(s % 9999).padStart(4, "0")}F` : `XXX-XX-${String(s % 9999).padStart(4, "0")}`],
      ["Issued by", ev.issuer ?? "Issuer"],
      ["Period", period || "This year"],
    ];
    sections = [{ heading: cited?.section ?? "Details", rows: [{ label: "Account or folio", value: mask(s, 6) }, ...citedRows] }];
  }
  return { ...base, title, meta, sections };
}

/** A sample document from a stored reading (the whole set of fields read), for Documents. */
export function mockFromReading(r: { title: string; issuer: string; period: string; pages: number; fields: { label: string; value: string; page?: number }[] }, holder: string): PdfDoc {
  const s = seedOf(r.title);
  return {
    issuer: r.issuer,
    title: r.title.split("·")[0].trim(),
    meta: [
      ["Name", holder],
      ["Period", r.period],
      ["Reference", mask(s, 6)],
      ["Pages", String(r.pages)],
    ],
    sections: [{ heading: "Details read by Kiyos", rows: r.fields.map((f) => ({ label: f.label, value: f.value.replace(/₹/g, "Rs. "), hit: true })) }],
    page: 1,
    pages: r.pages,
    reference: `Ref ${String(s).slice(0, 8)}`,
  };
}

/* ------------------------------------------------------------------ the initial assessment, as a PDF */

const QUESTION: Record<string, string> = {
  need: "What you wanted help with",
  move_timing: "Your move",
  years_abroad: "Time abroad",
  retirement: "US retirement accounts (401(k), IRA)",
  equity: "US shares, RSUs or stock options",
  india_funds: "Indian mutual funds",
  india_property: "Property in India",
  household: "Household",
};
const LANE: Record<string, string> = { IN: "India", US: "United States", BOTH: "Both countries" };

/** The free initial assessment sent on WhatsApp after the questions: Kiyos's own document. */
export function assessmentPdf(scan: InitialScan, name: string): PdfDoc {
  const inr = (n: number) => money(n, true);
  const when = new Date(scan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const lanes = (["IN", "BOTH", "US"] as const).filter((l) => scan.rows.some((r) => r.country === l));
  return {
    issuer: "Kiyos",
    issuerLine: "India–US tax, for families with a life in both",
    title: "Your initial India–US assessment",
    reference: `Scan ${scan.id} · v${scan.version}`,
    meta: [
      ["Prepared for", name],
      ["Date", when],
      ["Based on", `${Object.keys(scan.answers).length} answers on WhatsApp`],
      ["Confidence", `${scan.confidence} (from your answers only)`],
    ],
    sections: [
      {
        paragraphs: [
          `${scan.rows.length} areas may need attention across India and the US. This is a first look from your answers, not a personal tax opinion: a Kiyos expert confirms each point on a paid plan, against your documents.`,
        ],
      },
      ...lanes.map((l) => ({
        heading: LANE[l],
        paragraphs: scan.rows
          .filter((r) => r.country === l)
          .map((r) => `${r.area}: ${r.finding}. ${r.why} (Based on your answer "${r.input}".)${r.priced_separately ? " Quoted separately by an expert." : ""}`),
      })),
      { heading: "Still unknown", paragraphs: scan.missing.length ? scan.missing : ["Nothing flagged as missing from your answers."] },
      { heading: "Your answers", rows: Object.entries(scan.answers).map(([k, v]) => ({ label: QUESTION[k] ?? k.replace(/_/g, " "), value: v })) },
      {
        heading: "Indicative price",
        rows: [{ label: scan.household === "couple" ? "For the two of you" : "For you", value: `${inr(scan.price_low_inr)} to ${inr(scan.price_high_inr)} incl. GST` }],
        paragraphs: ["Mutual funds or property may be quoted separately by an expert. Choose a plan from the link in your WhatsApp chat."],
      },
    ],
    page: 1,
    pages: 1,
    paginate: true,
    footer: "Kiyos initial assessment. Preliminary, from your answers only; not tax advice.",
  };
}
