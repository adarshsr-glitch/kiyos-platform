# Kiyos platform

## Running the app
- Use `make up` (stops old copies, clears `web/.next`, starts API :8000 + web :3000) and `make down`. Never start a second `pnpm dev`/`next dev`: two web servers share `web/.next` and corrupt it (500s, MODULE_NOT_FOUND).
- If both servers already respond, reuse them. Logs are in `data/logs/`.

## Product review council
- When asked for a council/product review, follow `docs/council/README.md`: read `docs/council/decision-log.md` first, inspect code and live screens, write minutes to `docs/council/reviews/`, update the log, and change no code until the user approves.
