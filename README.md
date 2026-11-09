# Kiyos Platform — Prototype

Cross-border tax platform for Indians returning from the US. This is a prototype, not a product. Localhost only.

## What's here

```
kiyos-platform/
├── web/          Next.js dashboard
├── api/          FastAPI backend
├── engine/       Python tax calculation (deterministic, no LLM)
├── knowledge/    Human-authored YAML tax rules
├── sources/      Primary statutes (PDF + extracted markdown)
├── docs/         Plan and architecture
├── .cursor/      Rules Cursor auto-loads
└── infra/        Supabase migrations
```

Full plan: `docs/PLAN.md`
Architecture: `docs/ARCHITECTURE.md`

## Non-negotiable principle

An LLM must never compute tax. Four layers, calls flow downward only:

```
sources → knowledge → engine → ai
```

## Running locally

**Prerequisites:** Node 20+, pnpm, Python 3.12, Poetry, a Supabase project (free tier is fine).

```bash
# one-time
cp .env.example .env            # fill in Supabase + Claude keys
make install                    # pnpm install in web/, poetry install in api/

# dev
make dev                        # runs web on :3000 and api on :8000
make test                       # knowledge + engine + api tests
```

## How to work in this repo

1. **Rules are hand-authored.** Author YAML in `knowledge/<jurisdiction>/<year>/<topic>/` by hand. Cite source IDs from `sources/`. Write test cases.
2. **Engine functions read rules and compute.** Pure Python, no network, no LLM. Every output includes a derivation trail.
3. **AI services call the engine.** They explain, extract, and converse — they never compute.
4. **Tag every demo state.** `git tag v0.X-feature-name` so you can roll back.

See `docs/PLAN.md` for the full build plan, week by week.

## What this is not

- Not a product.
- Not deployed anywhere.
- Not storing real customer data.
- Not integrated with WhatsApp yet (the in-dashboard chat is the stand-in).
