# knowledge — YAML tax rules

Human-authored. One YAML per rule. Layout is `<jurisdiction>/<tax_year>/<topic>/<rule-slug>.yaml`.

See `.cursor/rules/knowledge-schema.mdc` for the full schema and hard rules on authoring.

## First rules to author (Week 2 of the build)

**India (`india/2026-27/`):**

- `residency/resident-182.yaml` — IN-RES-RESIDENT-182
- `residency/resident-60-365.yaml` — IN-RES-RESIDENT-60-365
- `residency/rnor-9-of-10.yaml` — IN-RES-RNOR-9OF10
- `residency/rnor-729-days.yaml` — IN-RES-RNOR-729DAYS
- `residency/deemed-resident.yaml` — IN-RES-DEEMED (Section 6(1A))

**US (`us/2026/`):**

- `residency/spt.yaml` — US-RES-SPT (Substantial Presence Test)
- `residency/closer-connection.yaml` — US-RES-CC
- `residency/dual-status.yaml` — US-RES-DUAL

**DTAA (`india/2026-27/dtaa/` and `us/2026/dtaa/` — same treaty, both sides reference it):**

- `art-4-tie-breaker.yaml` — IN-US-DTAA-ART-4
- `art-13-capital-gains.yaml` — IN-US-DTAA-ART-13
- `art-20-pensions.yaml` — IN-US-DTAA-ART-20

Each rule needs at least two `test_cases`. Cite `sources/` by ID.
