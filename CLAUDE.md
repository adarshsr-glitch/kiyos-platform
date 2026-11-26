# Kiyos platform

## Running the app
- The user runs `make up` / `make down` in their own dedicated terminal (stops old copies, clears `web/.next`, starts API :8000 + web :3000). Do not run them yourself unless the user asks. Never start a second `pnpm dev`/`next dev`/`uvicorn`: two web servers share `web/.next` and corrupt it (500s, MODULE_NOT_FOUND).
- If both servers already respond, reuse them. Logs are in `data/logs/`.

## Workflow (Claude Code + Cursor)
- Claude Code Desktop is the primary coding agent. Cursor is used mainly for reading code and live visual preview.
- Both work in the same folder: /Users/adarsh/Downloads/Kiyos/kiyos-platform. There is no separate worktree.
- Exactly one frontend (:3000) and one backend (:8000) run at any time, started by the user with `make up` in a dedicated terminal.
- Never start, stop, restart or kill a server (including `make up`, `make down`, `pnpm dev`, `uvicorn`, `kill`) without asking the user first.
- If a server doesn't respond, report it and what the logs show. Don't assume it should be restarted.
- Check before acting: `lsof -nP -iTCP:3000 -iTCP:8000 -sTCP:LISTEN` shows who owns the ports.
- Run `git status` before modifying files. Never overwrite, discard, reset or stash uncommitted changes, yours or anyone else's. If a file you need has unexpected edits, stop and ask.
- Work on one defined implementation task at a time. Don't start the next one until the user says so.
- After a change, run the relevant checks (`npx tsc --noEmit --incremental false` and eslint in web/; residency and rule tests in api/) and report every file modified or created, with the results.
- Do not commit or push without the user's approval.
- The product review council is internal: never show it in any product or prototype UI.

## Product review council
- When asked for a council/product review, follow `docs/council/README.md`: read `docs/council/decision-log.md` first, inspect code and live screens, write minutes to `docs/council/reviews/`, update the log, and change no code until the user approves.
