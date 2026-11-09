# infra — Supabase migrations and deployment config

For the prototype, infra is small:

- `migrations/` — numbered forward-only SQL migrations applied to the Supabase Postgres.
- `apply_migrations.sh` — thin wrapper that applies pending migrations against `$SUPABASE_DB_URL`.

No deployment config yet. Localhost only until the Kiyos demo forces the decision.

## Migration file naming

```
infra/migrations/0001_init.sql
infra/migrations/0002_add_fact_source_link.sql
```

Numbers are forward-only. If a migration is destructive, write a paired `0002_add_fact_source_link.down.sql` so a rollback is possible, but the forward file is still what gets committed and applied.

The initial migration `0001_init.sql` creates:

- Core tables listed in `docs/PLAN.md` → "Data model"
- RLS policies: a user sees only their own case/document/fact/assessment
- Elevated role for case captains, with every elevated read logged

See `docs/PLAN.md` for the full table list.
