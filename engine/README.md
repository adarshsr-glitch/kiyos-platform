# engine — deterministic tax calculation

Pure Python. Reads YAML rules from `../knowledge/` and applies them to structured inputs. Returns results plus a `DerivationTrail`.

## Non-negotiables (see `.cursor/rules/engine.mdc`)

- No network calls.
- No `anthropic`, `openai`, `httpx`, `requests` imports.
- No wall-clock reads, no randomness. Dates passed in.
- Pydantic in, Pydantic out.
- Every output includes a derivation trail.

## First functions to implement

1. `determine_india_residency(inputs, as_of)` — RNOR, NR, ROR per Section 6 + 6(1A) + 6(6).
2. `determine_us_residency(inputs, as_of)` — SPT + exempt individuals + closer connection.
3. `cap_gains_india_listed_equity(sale, purchase, holding_period)` — LTCG / STCG under current regime.

Everything else is incremental.
