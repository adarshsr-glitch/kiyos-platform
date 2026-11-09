# sources — primary statutes

Public-domain tax law material. Every rule in `knowledge/` cites back to a stable ID declared in a `_manifest.yaml` here.

See `.cursor/rules/sources.mdc` for the manifest format and naming conventions.

## What to download (see `docs/PLAN.md` → "The sources layer")

**India:**

- ITA §6, §90, §91, §139 (relevant sections only, not the full Act)
- India-US DTAA (full)
- Black Money Act 2015 (full)
- CBDT Circular 24/2022 and other NRI-relevant circulars
- Form 67, Schedule FA instructions

**US:**

- IRC §7701(b), §871, §872, §877A, §894, §1291, §1296, §402, §72(t)
- IRS Pub 519, 54, 514
- Form 8938, 8621, 1040-NR instructions
- Rev. Proc. 2020-17

## Processing checklist for each source

1. Download PDF.
2. `pdftotext -layout in.pdf out.md`.
3. Commit both.
4. Add to `_manifest.yaml` in the same directory with `{id, title, authority, url_when_fetched, as_of_date, files}`.
5. The stable ID becomes citable from `knowledge/*/sources[].id`.

Only public-domain government works. No commercial commentary.
