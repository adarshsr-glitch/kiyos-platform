# Kiyos walkthrough: the recording script (about 7 minutes)

One story, no gaps. Arjun signs up on WhatsApp, chooses a plan and pays. The payment opens his
workspace, and we go through every page of it. The last thing he does is ask his expert a
question. We then switch to Vikram, his expert, whose view opens on that question. After that:
Vikram's command centre, the rules, and the agent quality checks.

*[Brackets]* are clicks. Everything else is what you say.

## Before you press record

1. Open `localhost:3000/demo` and click **Reset demo**. Arjun's WhatsApp opens on the first question.
2. Keep the window at least 1280 px wide.
3. Optional, for **My customers** in section 6: sign in as Vikram beforehand (expert side rail → **Sign in** → `vikram@kiyos.example` → any 6 digits). Then click **Reset demo** again.

Between takes, click **Reset demo** at `localhost:3000/demo`. When you've finished recording, run
`make demo-unstage` to put the database back as it was.

---

## Opening (≈15 s)

Most people with money in two countries don't know where to start with their taxes: what counts
where, what paperwork they need, or who to ask. That's the problem Kiyos solves. I'll show it from
the customer's side, then the expert's side, and finally how we keep the AI behind it honest.

## 1 · WhatsApp sign-up (≈60 s)

*[WhatsApp is open on the first question]*

This is Arjun. Like most of our customers, he starts on WhatsApp: nothing to download, no account to set up.

*[Tap **Moving back to India** → **In the next 6 months** → **10 years or more** → **Yes** on each account question → **With my spouse**]*

Kiyos asks a few questions about his move, his time abroad, his US accounts and his wife. He
taps through the answers, and every answer goes into his record.

*[The summary arrives → **Yes, save it** → **Arjun Rao**]*

In a couple of minutes he has a first picture: what needs attention in India, in the US, and
where the two overlap. He saves it, and WhatsApp already knows his name, so that's one tap.

*[Tap the **PDF** card, then close it]*

He gets the same assessment as a PDF to keep.

*[Tap **What is RNOR?**]*

General questions get an answer that cites the law and the tax year it comes from.

*[Tap **Am I RNOR?**]*

But "Am I RNOR?" is about his own situation. Kiyos won't guess at that. It's what an expert is
for, and it points him to the plans.

## 2 · Choosing a plan and paying (≈50 s)

*[Tap **See plans**]*

That's a secure link that expires in 15 minutes. It signs him in with no password and no code.

*[Point at **Who's covered**]*

We price by household, not per form, and his WhatsApp answers already say it's him and his wife.

*[**Continue** → point at the two plans]*

There are two plans. **Advisory only** is planning across both countries, alongside the CA or
CPA he already has. **Full service** adds filing in both countries, and nothing is filed
without his approval. Both come with a named expert who owns his case.

*[**Full service** → **Continue**]*

Before paying, he sees exactly what's covered and what would be quoted separately. Nothing
changes price without asking him first.

*[**This matches what I need** → **Continue** → tick both boxes → **Pay ₹59,000**]*

He pays by UPI, card or netbanking and signs the terms and NDA. His data is never used to train AI.

*[The payment page: point at the pre-filled details → **Pay ₹59,000**]*

The payment page is pre-filled and valid for 24 hours, and the same link goes to his WhatsApp.

*[**Payment received** → **Open my workspace**]*

He's paid, his expert is assigned, and his workspace opens. For the demo, we jump ahead a few
weeks into his engagement.

## 3 · Arjun's workspace: every page (≈2 min 15 s)

**Overview**

*[Point at **What Vikram needs from you**]*

The first thing he sees is what his expert, Vikram, needs from him: his payslips, and an answer
about his wife's income. Each item says what kind of task it is and when it's due.

*[Point at **Your year**: the India and US cards]*

This is his year in both countries: his residency status, which is RNOR in India and
dual-status in the US, and his income split by source (salary, rent, interest, capital gains).

*[Click **₹75 L** next to Salary → open the payslip → close]*

Every figure opens its source. Here's the payslip behind the ₹75 lakh salary.

*[Point at **Tax this year**: ₹1.4 L to pay and the $2,500 refund]*

Kiyos never calculates tax. These figures come from Vikram, with his name and the date on them.

*[Scroll to **Ways to save, from Vikram**]*

Ways to save are options set in law, like timing a sale while he's RNOR. Each one shows what it
could save and by when, and it's Vikram's recommendation, not the AI's.

*[Point at the **since your last visit** summary at the bottom]*

And whenever he comes back, he sees what changed since his last visit.

**Profile** *[side nav]*

His file in nine sections, each marked complete, to check, or needed.

*[Open **1 You and your household**]*

He can edit what he told us, like his employer or his wife's visa; every edit goes to Vikram to
check. Anything from a document is locked and names the document. To change it, he sends a newer one.

*[Close → open **2 Where you're resident** → close]*

Residency by year, with the days counted from his travel record.

**Tax position** *[side nav]*

Where he stands in each country: the tax, what's already paid and what's left, his residency,
which return he files and by when, and the stage it's at.

*[Scroll to **Your tax questions**]*

Every tax question on his case, with Vikram's conclusion once it's settled.

**Year at a glance** *[side nav]*

One year at a time; he can pick another at the top. Residency and income for each country, his
time in India and the US, his tax years and every deadline on one timeline.

*[Click one bar on the timeline → close]*

Every bar opens its details.

**Documents** *[side nav]*

What each return still needs: here India has one document missing, and the US has everything.

*[Point at **Flipkart payslips** under Needed from you]*

Every request says why it's needed.

*[Click an accepted card, e.g. **Form 16 from Flipkart**]*

Every upload is scanned for malware, read, and checked against what he told us. He can always
open the original.

**Messages** *[side nav]*

This is his WhatsApp thread, inside the workspace: same conversation, replies reach both places.

*[Under **Ask Vikram about your case**, tap **Where do we stand on my 401(k) distribution strategy?**]*

His open questions are one tap away. This one goes straight to Vikram. Let's see what Vikram sees.

## 4 · Vikram's view of the same case (≈1 min 15 s)

*[Top right: **Vikram's view**]*

We're now Vikram, on Arjun's case, and the first thing he sees is the question Arjun just asked.

*[**Answer**]*

Kiyos has already drafted an answer from Arjun's record: roll the 401(k) into a traditional IRA
and file Form 10-EE. Vikram checks it, edits it if he needs to, and decides what goes out.

*[**Send answer**]*

One send, and it reaches Arjun's workspace and his WhatsApp. The alert clears.

*[Scroll up to **Case picture**: status cards → **Case timeline** → income]*

Below that, Vikram has the whole case in one place: residency in both countries, the timeline of
moves and filing dates, and the income split. It's exactly what Arjun sees, so they work from
the same facts.

*[Scroll to **Tax figures and ways to save** → **Add one** → choose **Put a property gain into 54EC bonds** → type **1500000** → **Save and show to customer**]*

Ways to save are options set in law. The reason starts from what the law allows; Vikram
adjusts it and enters what it could save. The system offers the options; the expert makes the call.

*[Point at the tabs: **Tickets**, **Documents**, **Audit**]*

The full record is one tab away, including an audit trail of every action and AI call.

*[Top right: **Arjun's view**]*

Back as Arjun. He doesn't need to check WhatsApp: Vikram's reply is waiting at the top of his
Overview, Messages shows a count, and the new way to save is already on his dashboard.

## 5 · Vikram's command centre (≈45 s)

*[Top right: **Vikram's view** → side rail **Home**]*

That's one customer. Vikram handles many.

*[**Coming up, week by week** → click a busy week]*

Each bar is a week of filings, reviews and documents due across all his customers. It works the
same for ten customers or a thousand. Click a week to see exactly whose work falls in it.

*[**Document pipeline**, **India status this year**]*

Every document requested across his book, from requested to accepted, so he can see where work is
stuck. And residency across all his customers, calculated from their travel records.

*[**Needs an expert** → **Recent activity** → **Customers**]*

Open questions, sign-offs and notices come first. When a customer writes, it appears at the top
of this page and on the bell.

*[Side rail **Cases**]*

Every customer has a full case: profile, timeline, documents, messages and audit trail.

## 6 · Rules and agent quality (≈1 min)

*[Side rail **Rules** → **Sample spreadsheet** → **Import rules** → choose the downloaded file]*

The agent can't answer tax questions from whatever it generates. It answers only from rules
our tax team approves, kept in a spreadsheet. Every row is checked on import: three pass, and
one is rejected with the reason.

*[**Import 3 valid rules as a new version**]*

They become a new version, pending validation. Until an expert approves them, the agent won't
answer from them; it hands the question to an expert.

*[Side rail **Agent quality** → **Run the evaluation**]*

We also test the agent against a fixed set of questions, live, one at a time.

*[Wait for **8 of 10**]*

Eight pass, two fail. Question 3 wrote RNOR with dots, so the agent didn't match the rule and
handed it off. Question 9 is in Hinglish: "mera" means "my", so it's personal, but the agent
treated it as general.

*[**Apply fix and check again** on question 3, then on question 9]*

Each failure comes with a suggested fix and the reason. Apply it, the question runs again, and
it passes. Ten out of ten.

*[Point at **Fixes applied to the agent**]*

Every change to the agent is visible and can be undone. We can see what the agent does, catch it
when it's wrong, and prove a fix before a customer ever sees it.

## Closing (≈15 s)

So that's Kiyos. A customer starts on WhatsApp and gets a workspace built around their income in
both countries, where every number shows its source. Experts get the full context and the tools to
run many cases well. And the AI works inside rules we can test, review and improve.
