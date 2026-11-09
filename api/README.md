# api — FastAPI backend

To be scaffolded in the first Cursor session (see `docs/PLAN.md`).

Target stack: Python 3.12, FastAPI, Pydantic v2, Poetry, uvicorn.

Owns:

- HTTP endpoints for the dashboard (`/assess/*`, `/documents/*`, `/conversations/*`).
- AI services (`api/services/{extract,explain,converse}.py`) — see `.cursor/rules/ai-services.mdc`.
- Supabase integration via service role key.

Does NOT own tax computation. That belongs to `engine/`.

Runs on `http://localhost:8000`.
