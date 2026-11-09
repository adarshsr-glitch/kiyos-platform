# api — FastAPI backend

Target stack: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async, over SQLite via `aiosqlite`), Poetry, uvicorn.

Owns:

- HTTP endpoints for the dashboard (`/health`, `/cases`, `/cases/{id}`, `/documents/*`, `/conversations/*`).
- AI services (`api/services/{extract,explain,converse}.py`) — see `.cursor/rules/ai-services.mdc`.
- Data access via SQLAlchemy — session factory in `api/db.py`. Schema in `../infra/schema.py`.

Does NOT own tax computation. That belongs to `engine/`.

Runs on `http://localhost:8000`.
