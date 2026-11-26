/**
 * Prototype journeys. Each one starts a fresh demo persona (backend reset) and then
 * runs on the real product pages. A journey only adds a guide bar: which step you're
 * on and what to try. It never changes what the pages show or do.
 */

export type JourneyStep = {
  title: string;
  /** Path the step lives on; `{id}` is replaced with the persona's case id. */
  path: string;
  hint: string;
  /** Optional help outside the product, e.g. a sample file to upload. */
  extra?: { label: string; href: string };
};

export type Journey = {
  key: string;
  reset: string;
  side: "customer" | "expert";
  persona: string;
  role: string;
  relationship: string;
  start: string;
  demonstrates: string;
  outcome: string;
  steps: JourneyStep[];
  recap: string[];
};

export const JOURNEYS: Journey[] = [
  {
    key: "arjun",
    reset: "arjun",
    side: "customer",
    persona: "Arjun Mehta",
    role: "New user · free",
    relationship: "No account yet",
    start: "Messages Kiyos on WhatsApp for the first time",
    demonstrates: "The live intake agent on WhatsApp, then his real travel dates turned into a year-by-year residency calculation for both countries, with the rules shown.",
    outcome: "Arjun understood his position before paying, then got a workspace that started reading his documents straight away.",
    steps: [
      { title: "WhatsApp", path: "/portal/whatsapp", hint: "Answer Kiyos with the reply buttons (the real intake bot). Save the scan, open the PDF Kiyos sends, then tap “Open my risk map”: a secure link that signs you in without a code." },
      { title: "Sign in", path: "/portal/signin", hint: "Only if a link has expired: sign in with your WhatsApp number and any six digits." },
      { title: "Risk map", path: "/portal/assessment", hint: "Tap “Add your travel and money details”." },
      { title: "Your details", path: "/portal/onboarding", hint: "Enter real-looking dates: moved abroad, US arrival, return, and at least one trip to India. Pick ranges, then Save and calculate." },
      { title: "Assessment", path: "/portal/assessment", hint: "Tap any year on the Residency Clock to see the rules, days and sources. Then tap a grid cell. Then “Ask on WhatsApp”." },
      { title: "Ask on WhatsApp", path: "/portal/whatsapp", hint: "Ask a general question (e.g. “What is RNOR?”), then a personal one. The agent answers live and routes personal questions to plans." },
      { title: "Plans and payment", path: "/portal/plans", hint: "Pick a plan and confirm the scope. Pay opens your secure payment link (also sent on WhatsApp, valid 24 hours), pre-filled. Pay, then “Open my workspace”. Nothing is charged." },
      { title: "Your workspace", path: "/portal/overview", hint: "Kiyos has requested documents with a reason for each. Tap Upload on one, pick the file and watch Kiyos read it." },
      { title: "WhatsApp", path: "/portal/whatsapp", hint: "Kiyos told you what it read. Ask “What do you still need from me?” or “When is my next deadline?”. Use Finish when you're done." },
    ],
    recap: [
      "A live conversation with the Kiyos intake agent",
      "Exact travel dates in, a residency status per year out, for India and the US",
      "Every status traceable to the rule, the day count and where each date came from",
      "Money shown as the ranges he gave, never totalled",
      "General questions answered free; personal ones routed to an expert plan",
      "After paying: a workspace with a named expert, document requests with reasons, and documents read on upload",
    ],
  },
  {
    key: "preeti",
    reset: "preeti",
    side: "customer",
    persona: "Preeti Nair",
    role: "Paid customer · Full service",
    relationship: "Customer since September",
    start: "Kiyos messages her first on WhatsApp",
    demonstrates: "A proactive agent: it recalculated her residency for a date she mentioned, reads a document she uploads, and catches that it doesn't match what she told us.",
    outcome: "Preeti confirmed a real change, uploaded a document, and Kiyos caught a mismatch before her expert did.",
    steps: [
      { title: "WhatsApp", path: "/portal/whatsapp", hint: "Kiyos wrote first: it re-ran her residency with the new date. Tap “Review the change”." },
      { title: "Confirm change", path: "/portal/profile", hint: "Confirm 12 July. Then open Home." },
      { title: "Home", path: "/portal/overview", hint: "The Residency Clock now uses 12 July. Tap Upload on the Schwab 1099-B, pick the file and watch Kiyos read it. Then open “Message on WhatsApp”." },
      { title: "WhatsApp", path: "/portal/whatsapp", hint: "Kiyos read the 1099-B, placed it in both countries and flagged a mismatch for Vikram. Then open Tax position from the workspace.", extra: { label: "Back to the workspace", href: "/portal/assessment" } },
      { title: "Tax position", path: "/portal/assessment", hint: "Tap FY 2027-28 to see why she'll be RNOR: days, rules and sources." },
    ],
    recap: [
      "Kiyos spoke first, with a calculation, not a reminder",
      "A change she mentioned became a proposal she confirmed, not an overwrite",
      "The residency calculation updated from the confirmed date",
      "A document read, placed in both tax systems, and checked against what she said",
    ],
  },
  {
    key: "expert-new",
    reset: "ananya",
    side: "expert",
    persona: "Vikram Desai",
    role: "Expert · new customer",
    relationship: "Ananya Bose joined today",
    start: "The expert workspace",
    demonstrates: "The case brief Kiyos prepared: her residency calculated, the gaps before sign-off, and document requests drafted with reasons.",
    outcome: "Ananya gets a reasoned document request on WhatsApp within minutes of joining.",
    steps: [
      { title: "Today", path: "/expert", hint: "Open Ananya Bose (Recent customers, or Cases)." },
      { title: "Case brief", path: "/expert/cases/{id}", hint: "Read the Brief: residency, timeline, money and evidence. Request the suggested documents, then use “Add a document for Ananya” and pick her passport: Kiyos finds a trip she didn't mention." },
    ],
    recap: [
      "Residency calculated from her onboarding facts, before anyone opened the case",
      "Gaps found by checking which facts aren't backed by a document",
      "Document requests drafted with a reason each, sent on WhatsApp in one go",
    ],
  },
  {
    key: "expert-existing",
    reset: "preeti-expert",
    side: "expert",
    persona: "Vikram Desai",
    role: "Expert · existing customer",
    relationship: "Preeti Nair, after her 1099-B upload",
    start: "The expert workspace",
    demonstrates: "Picking up a mismatch the agent found, its drafted answer, and replying to the customer in her own WhatsApp thread.",
    outcome: "Vikram answers with the facts already assembled, in Preeti's own WhatsApp thread.",
    steps: [
      { title: "Today", path: "/expert", hint: "Open Preeti Nair." },
      { title: "Case brief", path: "/expert/cases/{id}", hint: "The Brief shows the mismatch and Kiyos's drafted reply. Take over the chat on the right, reply as yourself (edit the draft), then hand back to the agent." },
    ],
    recap: [
      "The document mismatch was found by Kiyos, not by the expert",
      "A drafted answer with the rules it relied on",
      "The expert replies in the customer's own WhatsApp thread, then hands back to the agent",
    ],
  },
  {
    key: "expert-review",
    reset: "rohan",
    side: "expert",
    persona: "Vikram Desai",
    role: "Expert · assessment review",
    relationship: "Rohan Kapoor, assessment awaiting sign-off",
    start: "The expert workspace",
    demonstrates: "Kiyos compares what Rohan said with his passport stamps, shows how the difference changes his status, and holds sign-off until he answers.",
    outcome: "The discrepancy is recorded, Rohan is asked on WhatsApp, and sign-off waits for his answer.",
    steps: [
      { title: "Today", path: "/expert", hint: "Open Rohan Kapoor." },
      { title: "Case brief", path: "/expert/cases/{id}", hint: "His stated days don't match the passport. See the entries, save the note, send the question, then notice sign-off is blocked." },
    ],
    recap: [
      "A stated fact checked against a document by calculation",
      "The effect on his status spelled out with the rule",
      "Internal note and customer question kept separate",
      "Sign-off blocked while the question is open",
    ],
  },
];

export const journeyByKey = (key: string) => JOURNEYS.find((j) => j.key === key);

export const JOURNEY_COOKIE = "kiyos-journey";

export type JourneyState = { key: string; caseId: number; step: number; done?: boolean };

export function readJourney(): JourneyState | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${JOURNEY_COOKIE}=`));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function writeJourney(state: JourneyState | null) {
  if (state === null) {
    document.cookie = `${JOURNEY_COOKIE}=; path=/; max-age=0`;
    return;
  }
  document.cookie = `${JOURNEY_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
}

export const stepPath = (step: JourneyStep, caseId: number) => step.path.replace("{id}", String(caseId));
