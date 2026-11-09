# Architecture — Kiyos Prototype

**One rule above all others: an LLM must never compute tax.**

This codebase has four layers. Each layer may only call downward. No layer may skip a layer below it to reach the one above.

```
sources   →   knowledge   →   engine   →   ai
 (PDFs)        (YAML rules)    (Python)    (Claude)
```

## The four layers

### 1. Sources (`sources/`)

Raw primary statutes: Income Tax Act sections, DTAA treaty text, IRC sections, IRS publications, CBDT circulars. Public-domain government works, committed as PDF plus an `pdftotext`-extracted markdown version. Each source directory has a `_manifest.yaml` with a stable ID (`IN-ITA-S6`, `US-IRC-7701B`, etc.). Nothing reads sources deterministically — they're the ground truth every rule cites back to.

### 2. Knowledge (`knowledge/`)

Human-authored tax rules, one YAML file per rule, versioned by jurisdiction and tax year. Each rule has a stable ID, cites the specific source passages it derives from, declares its inputs and logic in a form the engine can execute, and ships with test cases. Changes to rules are PRs with reasoning in the commit message.

Rules are authored by hand. **Cursor does not write rules.** Cursor may scaffold the loader, the schema, and tooling — never the content.

### 3. Engine (`engine/`)

Pure Python. Reads YAML rules, applies them to structured facts, returns structured results plus a `DerivationTrail` — the ordered list of rule IDs applied. No network calls. No LLM imports. Unit-tested against the `test_cases` blocks in the YAML rules themselves.

The engine is the only thing in this codebase allowed to compute a tax number.

### 4. AI (`api/services/{extract,explain,converse}.py`)

Claude API, scoped to three jobs:

- **Extract** — turn a document (PDF or image) into structured JSON that validates against a Pydantic schema.
- **Explain** — turn an engine result + derivation trail into plain English that cites rule IDs.
- **Converse** — a tool-call loop that answers questions by calling the engine for numbers and looking up rules for definitions.

Every AI call is logged to the `ai_call` table. The AI never computes a tax number, never cites a rule that isn't in `knowledge/`, and never cites a source that isn't in `sources/`.

## Why this shape

A customer asking "how much tax do I owe?" triggers the engine. Claude only ever says what the engine returned, cites the rules the engine applied, and those rules cite the sources. If a reviewer disagrees with the answer, they can trace it through the derivation trail to the exact rule and the exact statute passage — and either fix the rule or dispute it on the merits.

This is the architectural answer to the only question that matters in a cross-border tax product: **why should I trust this?**

## Hard prohibitions

- No `anthropic`, `openai`, `httpx`, `requests` imports in `engine/`.
- No tax computation in `api/services/*`.
- No rule authored by an LLM. All rule YAML is human-authored and reviewed.
- No source cited that isn't a file in `sources/`.
- No AI response that includes a number not returned by the engine.

See `docs/PLAN.md` for the full plan this architecture supports.
