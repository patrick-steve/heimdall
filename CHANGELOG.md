# Changelog

All notable changes to Heimdall are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-05-18

The first public, integrable release. Heimdall stops being a
hackathon-style submission and starts being a gateway that other agent
systems can call.

### Added

- **Orgs + API keys.** Two new tables (`organizations`, `api_keys`) and an
  auth middleware that resolves `Authorization: Bearer hd_xxx` to an org id
  bound on a `ContextVar`. Existing dashboard routes keep working by
  falling back to the seeded Demo org when no header is present
  (`backend/auth.py`).
- **`/api/v1/*` endpoints.** Versioned public API: `POST /delegate`,
  `POST /agents`, `GET /agents`, `GET /chains`, `GET /chains/{id}`,
  `GET /audit/{id}`, `GET /whoami`. Every route is org-scoped and requires
  a real API key (`backend/endpoints/v1.py`).
- **Python SDK (`heimdall-sdk`).** Synchronous httpx-based client with
  typed result objects, four typed exception classes, three runnable
  examples (`sdks/python/`).
- **TypeScript SDK (`@heimdall/sdk`).** fetch-based client mirroring the
  Python surface; ships as ESM + CJS via `tsup` with full `.d.ts`
  (`sdks/typescript/`).
- **`heimdall` operator CLI.** `keys create|list|revoke`, `reset`,
  `doctor`, `whoami`. Installed by the repo-root `pyproject.toml`
  console-scripts entry (`cli/heimdall_cli.py`).
- **Docker compose stack.** `backend` + `frontend` services with a
  persistent SQLite volume, a healthcheck, and an optional `dpi` profile
  for the Lobster Trap proxy (`docker-compose.yml`, `backend/Dockerfile`,
  `frontend/Dockerfile`, `.dockerignore`).
- **Permissive CORS on `/api/v1/*`.** Wildcard `Allow-Origin` without
  credentials so external services can call the gateway from anywhere;
  legacy `/api/*` keeps its credentialed allow-list
  (`backend/main.py:V1CorsMiddleware`).
- **Docs.** `docs/QUICKSTART.md`, `docs/API.md`, `docs/POLICIES.md`,
  `docs/INTEGRATE.md`.
- **Landing page Install section.** New `frontend/components/landing/Install.tsx`
  sits between Lobster Trap and Honest Limitations (`§ 05 / INSTALL`).

### Changed

- **`backend/db.py`** — SQLite path now honours `HEIMDALL_DB_PATH`, so the
  container can mount a volume at `/app/data/heimdall.db` without writing
  into the image's read-only layer. Local dev still defaults to
  `<repo>/heimdall.db`.
- **`backend/config.py`** — added `HEIMDALL_DEMO_API_KEY` env var so a
  reproducible test key can be pinned before first boot.
- **`backend/main.py`** — mounts `AuthMiddleware`, `V1CorsMiddleware`, and
  the v1 router; logs the demo API key once on first-boot seeding.
- **`backend/endpoints/{delegate,register,audit,policy_engine}.py`** —
  every insert now writes `org_id`, derived from the active `ContextVar`.
- **`frontend/next.config.js`** — `output: "standalone"` so the
  `frontend/Dockerfile` runner stage stays minimal.
- **Landing page section numbering** — Limitations is now `§ 06`, Close
  is now `§ 07` to make room for Install at `§ 05`.

### Migration notes

- Pre-existing SQLite DBs are upgraded in place on boot: `_ensure_v1_columns()`
  in `backend/db.py` adds `org_id` to the four tables that were missing it.
- Dashboard requests without a `Bearer` header continue to work — they are
  treated as the Demo org.
- New deployments should set `HEIMDALL_SECRET`, `HEIMDALL_ALLOWED_ORIGINS`,
  and (recommended) `HEIMDALL_DEMO_API_KEY` in `.env` before first boot.
