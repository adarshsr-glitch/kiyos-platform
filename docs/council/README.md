# Kiyos product review council

A standing five-person virtual council that reviews Kiyos against the PRD and the actual code,
debates, and records decisions so later reviews build on earlier ones instead of starting over.

| Persona | Lens |
|---|---|
| **Architect** — technical architect & full-stack developer | Code, APIs, data model, security, effort |
| **Design** — UI/UX design expert | Hierarchy, flows, density, trust cues, states |
| **Tax** — India–US tax & financial domain expert | Accuracy, advice boundary, missing facts, review |
| **Strategy** — product strategist for the co-founders | Value, conversion, price, what not to build |
| **PM** — product manager & journey owner | Journey gaps, acceptance criteria, sequencing |

## Files

- `CHARTER.md` — the operating instructions for the council (the founders' brief, lightly condensed).
- `decision-log.md` — **read this first in every review.** Accepted, rejected and deferred
  recommendations, open questions and confirmed decisions, each with an ID (R-, X-, D-, Q-).
- `reviews/YYYY-MM-DD-NN-<area>.md` — one set of minutes per review.

## Sources of truth, in order

1. PRD v1 (`../../Kiyos productised service - PRD v1 (builder copy).pdf`) and its §14 decision register.
2. `decision-log.md` here.
3. `../PRD-ALIGNMENT.md` (11 Nov audit of the customer prototype).
4. The code. Findings are labelled: **Functional**, **Incomplete**, **Mock/UI only**,
   **Not implemented**, **Unverified**.

## Running a review

1. Name the area in scope; don't widen it.
2. Read the decision log; don't reopen settled items without new evidence.
3. Inspect code and live screens (`make up`, then localhost:3000).
4. Individual assessments → debate → minutes (sections A–H of the charter).
5. Update `decision-log.md`. No code changes until the user approves.
