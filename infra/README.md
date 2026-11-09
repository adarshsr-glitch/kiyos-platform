# infra — schema and seed

For the prototype, infra is minimal:

- `schema.py` — SQLAlchemy 2.0 declarative models for every table in `docs/PLAN.md` → "Data model". Applied via `Base.metadata.create_all()` at FastAPI startup.
- `seed.py` — creates one demo case (Arjun Rao, returning NRI) plus a few facts. Run with `make seed`.

That's it. No migrations tool, no cloud dependencies, no auth.

## When the schema changes

Prototype rule: forward-only, destructive is fine.

1. Edit `schema.py`.
2. `make reset-db` deletes the SQLite file.
3. `make seed` creates a fresh one.

Data lives in `./data/` (gitignored). To preserve a known-good demo state between resets, commit a `data/kiyos.db.seed` and restore with `cp data/kiyos.db.seed data/kiyos.db`.

## Later — when this becomes multi-user

The migration path is isolated to this directory:

1. Swap `DATABASE_URL` to a Postgres URL.
2. Add a `user` table + `user_id` foreign keys.
3. Add RLS policies.
4. Introduce a migrations tool (Alembic) because destructive resets stop being OK.

The engine, knowledge, sources, and AI services don't move. That's the whole point of the four-layer separation.
