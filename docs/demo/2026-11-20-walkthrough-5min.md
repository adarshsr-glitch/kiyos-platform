# Kiyos prototype walkthrough (superseded)

> **Use [2026-11-20-narration.md](2026-11-20-narration.md) instead.** It is the current recording script, tested end to end. This page is kept for reference.

One customer, Arjun Rao, and his expert, Vikram Desai, carry the whole story. Arjun moved from
the US to India in July 2026. Every customer step is a tap; nothing needs typing except one
amount on the expert side.

**Left column:** what to click. **Right column:** what to say. The times are a guide.

The full spoken script, including choosing a plan, is in [2026-11-20-narration.md](2026-11-20-narration.md).

The demo runs on a staged copy of the data (`make demo-stage`, already done). The sign-up runs
on a WhatsApp-only copy of Arjun, so his paid workspace isn't touched.

## Before you press record

- Window at least **1280 px wide** (the expert's WhatsApp rail needs it).
- Servers running (`make up`).
- **Before each take:** open `localhost:3000/demo` (or the home page `localhost:3000/`) and click **Reset demo**. It puts everything back as staged (a fresh sign-up thread, no leftovers from the last take, agent fixes off) and opens Arjun's WhatsApp. The terminal equivalent is `make demo-retake`.
- Sign in as Vikram once (side rail → **Sign in** → `vikram@kiyos.example` → any 6 digits), so **My customers** works.
- Open the **presenter link** (printed by `make demo-retake`; currently `http://localhost:3000/m/Dv6FM0aYONeODyu7aqkX3mVxNjieNqif`). Arjun's WhatsApp opens on the first question. Start recording.

---

## 1 · WhatsApp: how a customer arrives (0:00–1:00)

| Do | Say |
|---|---|
| The phone, first question on screen | "Every customer starts where they already are: WhatsApp. No app, no forms." |
| Tap **Moving back to India** → **In the next 6 months** → **10 years or more** → **Yes** to each account question → **With my spouse** | "Kiyos asks a handful of questions, one tap each, and every answer goes straight into his record." |
| The risk map arrives → tap **Yes, save it** → tap **Arjun Rao** | "In about two minutes he has a first assessment by country. WhatsApp already knows his name, so it's one tap." |
| Tap the **Kiyos-initial-assessment.pdf** card → close | "The same assessment as a PDF to keep." |
| Tap **What is RNOR?** | "General questions get an answer that cites the exact law and tax year." |
| (optional) Tap **Am I RNOR?** | "Anything about his own situation isn't guessed. It goes to an expert, which is what the plan is for." |
| Scroll up, tap **Open my risk map** | "One tap signs him in: a secure link that expires in 15 minutes. No password, no code." |
| His assessment page: point at the three lanes | "India, both countries, the US. Each finding says which answer it came from." |

## 2 · The customer's workspace (0:50–2:00)

| Do | Say |
|---|---|
| Name menu (top left) → **Arjun Rao** under **Paid plan** | "He picks Full service and pays. Here's Arjun a few weeks in." |
| Overview: **What Vikram needs from you** (his payslips; a question about Nisha) | "First thing he sees: what his expert needs from him, what kind of task it is, and when it's due." |
| **Your year**: the India and US cards | "Everything is driven by income. Each country shows his residency status, what he earned this year split by source (salary, rent, interest, capital gains), and the tax his expert has entered." |
| Click **₹75 L** salary → open a payslip | "Every number is one click from its source document. Nothing on this page is unexplained." |
| Point at **Tax this year · from Vikram Desai** | "Kiyos never calculates tax. Tax figures, and any way to save, come only from his named expert." |
| **Profile** → **1 You and your household** | "His file in nine sections. He can edit what he told us, like his employer or his wife's visa. Anything from a document is locked and says which document; to change it, he sends a newer one. Every edit goes to Vikram to check." |
| **Documents** → click an accepted card | "Each document is scanned for malware, read, and checked against what he told us. The payslips are still waiting for him." |
| **Messages** → under **Ask Vikram about your case**, tap **Where do we stand on my 401(k) distribution strategy?** | "Messages is his WhatsApp thread, inside the workspace. His open questions are one tap away, and they go to Vikram. Let's see the other side." |

## 3 · Same case, the expert's side (2:00–3:05)

| Do | Say |
|---|---|
| Top-right pill → **Vikram's view** | "One click and we're Vikram, still on Arjun's case." |
| Today tab: **Case picture**, **Case timeline**, income | "The expert opens on the full picture: residency in both countries, the timeline of moves and filing dates, and the income split. Context first." |
| **To review** → Arjun's question (the bell in the rail also shows he wrote) | "Here's the question Arjun just sent. Kiyos has already drafted an answer from his record: roll the 401(k) into an IRA and file Form 10-EE. Vikram can edit it. The expert stays in control." |
| **Send answer** | "One send, and it reaches Arjun's workspace and his WhatsApp." |
| **Tax figures and ways to save** → **Add one** → choose **Put a property gain into 54EC bonds** → type **1500000** in "Could save about" → **Save and show to customer** | "Ways to save are options set in law, like 54EC bonds. The reason starts from what the law allows; the expert decides, adjusts it and puts his name on it." |
| Pill → **Arjun's view** | "Back as Arjun. He didn't need WhatsApp open: a red count on Messages and the reply waiting at the top of his Overview. And the new way to save is already on his dashboard." |

## 4 · The expert's command centre (3:05–4:05)

| Do | Say |
|---|---|
| Pill → **Vikram's view** → **Home** (left rail) | "Now the expert's whole book of customers." |
| **Coming up, week by week** → click a busy week | "Each bar is a week, split into filings, reviews and documents due. It holds ten customers or a thousand the same way. Click a week and you see exactly whose dates fall in it." |
| **Document pipeline** | "Every document requested across all customers, from requested through read to accepted. It shows where work is piling up." |
| **India status this year** | "Residency mix across the book, calculated from each customer's travel record." |
| **Needs an expert**, **Customers** list | "Open questions, sign-offs and notices come first. When a customer replies on WhatsApp, the bell and a Replied tag show it straight away." |
| **Cases** → **My customers** | "Each expert sees their own customers, and every customer has their own profile, timeline, documents, tickets and audit trail in one place. That's how one expert can handle many cases without losing the thread." |

## 5 · Rules and agent quality (4:05–5:20)

| Do | Say |
|---|---|
| **Rules** → **Sample spreadsheet** → **Import rules** | "The agent can only answer from approved rules. The tax team keeps them in a spreadsheet. Every row is checked on import: here three are valid and one is rejected, with the reason." |
| **Import 3 valid rules as a new version** | "They become a new version, pending validation. Until a tax expert approves them, the agent won't answer from them. It hands off instead." |
| **Agent quality** → **Run the evaluation** | "This is how we know the agent behaves. Ten fixed questions run against the live agent, one by one." |
| Wait for **8 of 10**; point at **3** and **9** | "Two fail. Question 3, 'R.N.O.R.' written with dots, didn't match the rule, so it was handed off. Question 9 is in Hinglish: 'mera' means 'my', so it's personal, but the agent treated it as general." |
| **Apply fix and check again** on both | "For each failure there's a suggested fix with the reason. Apply it, and that question runs again and passes. Ten of ten." |
| Point at **Fixes applied to the agent** | "Every change to the agent is visible and can be undone. This is observability: you can see what the agent does, catch it when it's wrong, and prove the fix before customers ever see it." |

## Close (5:20–5:35)

> "So: customers start on WhatsApp and get a workspace built around their income in both
> countries, where every number shows its source. Experts get the whole case in context, with the
> agent doing the legwork and the expert making every tax call. The rules and the agent's quality
> are visible and checked. All in one place."

---

**Between takes:** **Reset demo** at `localhost:3000/demo`.

**When you're done recording:** `make demo-unstage` puts the database back exactly as it was
before staging.
