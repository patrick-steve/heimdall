# Heimdall — Resume the Gateway Build (Days 4–7)

> For the next session picking up the v0.1.0 gateway/SDK ship. Read this top-to-bottom.
> Companion files: `GENERALIZE.md` (the plan), `HANDOFF.md` (pre-gateway hackathon handoff).

---

## TL;DR

We are halfway through `GENERALIZE.md`'s 7-day plan. Days 1–3 landed, Days 4–7 remain.

| Day | Status | Artifact |
|---|---|---|
| 1 — Orgs + API keys + auth middleware | ✅ shipped | `backend/auth.py`, new tables in `backend/db.py` |
| 2 — `/api/v1/*` endpoints, org-scoped | ✅ shipped | `backend/endpoints/v1.py` |
| 3 — Python SDK | ✅ shipped | `sdks/python/heimdall/`, three working examples |
| 4 — TypeScript SDK | ⏳ TODO | this doc, §4 |
| 5 — Docker compose + `heimdall` CLI | ⏳ TODO | this doc, §5 |
| 6 — Docs (QUICKSTART/API/POLICIES/INTEGRATE) | ⏳ TODO | this doc, §6 |
| 7 — Polish + landing page Install section | ⏳ TODO | this doc, §7 |

Nothing in Days 1–3 has been committed yet. The user reviews before commits.

---

## What's already shipped (the foundation)

### Day 1 — auth layer

Two new tables in `backend/db.py`:

```python
class Organization(Base):
    __tablename__ = "organizations"
    id, name, slug, default_tenant_id, created_at

class ApiKey(Base):
    __tablename__ = "api_keys"
    id, org_id, name, key_prefix, key_hash, created_at, last_used_at, revoked_at
```

`org_id` column added to `agents`, `chain_credentials`, `rule_evaluations`, `incidents`. A helper `_ensure_v1_columns()` (in `backend/db.py`) `ALTER TABLE`s pre-existing SQLite DBs to add the column with default `'demo'`.

`backend/auth.py` is the heart:

- `AuthMiddleware` — reads `Authorization: Bearer hd_xxx`, hashes, looks up `ApiKey` row, sets a `current_org_id()` ContextVar. **No header → falls back to Demo org** (so the dashboard's existing legacy `/api/*` requests keep working).
- `require_api_key()` — a FastAPI dependency that 401s if the request was the demo fallback. Used on every `/api/v1/*` route.
- `ensure_demo_org()` — idempotent boot-time seed. Creates the Demo org if missing. If env `HEIMDALL_DEMO_API_KEY` is set, pins that as the demo key. Otherwise generates a fresh `hd_test_*` key and logs it once.
- `create_api_key(org_id, name, env)` — mints a new key. Returns `(raw, row)`; the raw value is shown once, hash is stored.

Demo org's `default_tenant_id` is `acme_capital` (matching what the existing demo data uses).

Mount order in `backend/main.py`:
```python
app.add_middleware(CORSMiddleware, ...)   # outermost
app.add_middleware(SessionMiddleware)     # session UUID per tab
app.add_middleware(AuthMiddleware)        # API key → org_id
```

### Day 2 — `/api/v1/*` endpoints

All live in `backend/endpoints/v1.py`. Routes (all require `Authorization: Bearer`):

| Method + path | Purpose |
|---|---|
| `POST /api/v1/delegate` | Authorise one hop. The headline endpoint. |
| `POST /api/v1/agents` | Register/upsert an agent under the calling org. |
| `GET  /api/v1/agents` | List agents in the calling org. |
| `GET  /api/v1/chains?status=&limit=` | Recent chains, optionally filtered by `allowed|denied|flagged`. |
| `GET  /api/v1/chains/{chain_id}` | Full hop list + evaluations for one chain. |
| `GET  /api/v1/audit/{chain_id}` | Latest persisted incident report Markdown. |
| `GET  /api/v1/whoami` | Returns the org for the current API key. SDK diagnostic. |

Wire shapes — see §"Reference: the wire format" below. The v1 endpoint internally calls the same `sign_credential` / `evaluate_policies` machinery as the legacy `/api/delegate/raw`, but:
- derives `tenant_id` from the org (drops any client-supplied value)
- queries are filtered by `org_id=current_org_id()`
- response shape is the public v1 contract (`decision`, `credential`, `chain_id`, `evaluations`)

### Day 3 — Python SDK

Lives in `sdks/python/`:

```
sdks/python/
├── pyproject.toml          # heimdall-sdk 0.1.0, depends on httpx
├── README.md               # 5-min quickstart
├── heimdall/
│   ├── __init__.py         # public API: Heimdall, *Result types, *Error
│   ├── client.py           # synchronous httpx-based client
│   ├── types.py            # DelegationResult, Evaluation, Agent, Hop, …
│   └── errors.py           # HeimdallError + subclasses
└── examples/
    ├── 01_basic_delegation.py    # happy-path two-hop chain
    ├── 02_attack_blocked.py      # capability_attenuation DENY
    └── 03_chain_audit.py         # list_chains + get_chain + get_audit
```

The client class:
```python
hd = Heimdall(api_key="hd_test_...", base_url="http://localhost:8000")
hd.delegate(from_agent=..., to_agent=..., action=..., capabilities=[...], ...)
hd.register_agent(...) / hd.list_agents() / hd.list_chains() / hd.get_chain() / hd.get_audit() / hd.whoami()
hd.close()  # or use as a context manager
```

All HTTP errors are mapped to typed exceptions: `AuthenticationError` (401), `InvalidPayloadError` (400), `NotFoundError` (404), `HeimdallError` (any other non-2xx), `NetworkError` (transport).

**Verified end-to-end** against a fresh `heimdall.db` — see "How to verify what exists" below.

---

## How to verify what exists

Start a fresh local backend with a known demo key, then run the SDK examples.

```bash
cd C:\Users\patri\Documents\Heimdall

# Pin a known key so tests are reproducible
export HEIMDALL_DEMO_API_KEY="hd_test_smoketestkey123456"   # PowerShell: $env:HEIMDALL_DEMO_API_KEY = "..."

# Fresh DB so the org+key get seeded
rm -f heimdall.db
python -m uvicorn backend.main:app --port 8765 --log-level warning &
sleep 4

# v1 sanity
curl -H "Authorization: Bearer hd_test_smoketestkey123456" http://127.0.0.1:8765/api/v1/whoami
# → {"org_id":"demo","org_name":"Demo","slug":"demo","default_tenant_id":"acme_capital"}

# 401 without a key
curl -X POST http://127.0.0.1:8765/api/v1/delegate \
  -H "Content-Type: application/json" -d '{"from_agent":"a","to_agent":"b","action":"x","capabilities":["y"]}'
# → 401 {"detail":{"error":"authentication_required","message":"..."}}

# SDK examples
export HEIMDALL_API_KEY=hd_test_smoketestkey123456
export HEIMDALL_URL=http://127.0.0.1:8765
export PYTHONPATH=$PWD/sdks/python
python sdks/python/examples/01_basic_delegation.py    # → both hops ALLOW
python sdks/python/examples/02_attack_blocked.py      # → second hop DENY by capability_attenuation
python sdks/python/examples/03_chain_audit.py         # → lists 2 chains, dumps hops + evals
```

The legacy dashboard (`/api/*` without auth) **also keeps working** — the auth middleware falls back to the Demo org when no Bearer is supplied. To smoke-test that, just hit `/api/health` without a header and confirm 200.

---

## Day 4 — TypeScript SDK

**Goal:** `@heimdall/sdk` on npm with the same shape as the Python SDK. Mirror the file layout and the method signatures so the docs can show them side-by-side.

### Directory layout

```
sdks/typescript/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts        # public exports
│   ├── client.ts       # Heimdall class (fetch-based)
│   ├── types.ts        # DelegationResult, Evaluation, Agent, Hop, …
│   └── errors.ts       # HeimdallError + subclasses
└── examples/
    ├── 01_basic_delegation.ts
    ├── 02_attack_blocked.ts
    └── 03_chain_audit.ts
```

### `package.json`

```json
{
  "name": "@heimdall/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for Heimdall — runtime governance for AI agent delegation chains.",
  "license": "MIT",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist/"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "test": "node --import tsx --test examples/*.ts"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.10.0"
  },
  "engines": { "node": ">=18" }
}
```

`fetch` is global on Node 18+ and in every modern browser — no runtime deps. That's why the SDK has nothing in `dependencies`.

### `src/types.ts` — match Python `types.py` shape

```typescript
export interface Evaluation {
  rule: string;
  layer: "protocol" | "policy";
  result: "ALLOW" | "FLAG" | "DENY";
  reason?: string;
}

export interface DelegationResult {
  decision: "ALLOW" | "DENY";
  chain_id: string;
  evaluations: Evaluation[];
  // present when ALLOW
  credential?: string;
  depth?: number;
  expires_at?: string;
  // present when DENY
  rule?: string;
  layer?: string;
  reason?: string;
}

export interface Agent { /* id, display_name, role, tenant_id, scope, owner, is_dormant, registered_at */ }
export interface ChainSummary { /* chain_id, tenant_id, hop_count, started_at, head_caller, head_callee, status */ }
export interface Hop { /* jti, parent_jti, from_agent, to_agent, action, tenant_id, scope, value_limit, declared_intent, detected_intent, issued_at, expires_at */ }
export interface IncidentReport { /* chain_id, incident_id?, severity?, summary?, report?, created_at? */ }
```

Add convenience helpers:
```typescript
export function isAllowed(r: DelegationResult): r is DelegationResult & { credential: string } {
  return r.decision === "ALLOW";
}
export function isDenied(r: DelegationResult): boolean {
  return r.decision === "DENY";
}
```

### `src/errors.ts`

```typescript
export class HeimdallError extends Error {
  constructor(message: string, public statusCode?: number, public body?: unknown) {
    super(message);
    this.name = "HeimdallError";
  }
}
export class AuthenticationError extends HeimdallError { name = "AuthenticationError"; }
export class InvalidPayloadError extends HeimdallError { name = "InvalidPayloadError"; }
export class NotFoundError extends HeimdallError { name = "NotFoundError"; }
export class NetworkError extends HeimdallError { name = "NetworkError"; }
```

### `src/client.ts`

```typescript
import { AuthenticationError, HeimdallError, InvalidPayloadError, NetworkError, NotFoundError } from "./errors";
import type { Agent, ChainSummary, DelegationResult, Hop, IncidentReport } from "./types";

export interface HeimdallOptions {
  apiKey: string;
  baseUrl?: string;       // default http://localhost:8000
  timeoutMs?: number;     // default 30000
  fetch?: typeof fetch;   // injectable for tests
}

export interface DelegateInput {
  from_agent: string;
  to_agent: string;
  action: string;
  capabilities: string[];
  parent_credential?: string;
  declared_intent?: string;
  detected_intent?: string;
  value_limit?: number;
  context?: Record<string, unknown>;
}

export class Heimdall {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private _fetch: typeof fetch;

  constructor(opts: HeimdallOptions) {
    if (!opts.apiKey) throw new Error("apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:8000").replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this._fetch = opts.fetch ?? fetch;
  }

  async delegate(input: DelegateInput): Promise<DelegationResult> {
    return this.post<DelegationResult>("/api/v1/delegate", input);
  }

  async registerAgent(input: { id: string; display_name: string; role: string; scope?: string[]; owner?: string; tenant_id?: string }): Promise<{ id: string; status: string }> {
    return this.post("/api/v1/agents", input);
  }

  async listAgents(): Promise<Agent[]> {
    const r = await this.get<{ agents: Agent[] }>("/api/v1/agents");
    return r.agents;
  }

  async listChains(opts: { status?: "allowed" | "denied" | "flagged"; limit?: number } = {}): Promise<ChainSummary[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit) params.set("limit", String(opts.limit));
    const r = await this.get<{ chains: ChainSummary[] }>(`/api/v1/chains?${params}`);
    return r.chains;
  }

  async getChain(chainId: string): Promise<{ chain_id: string; hops: Hop[]; evaluations: Evaluation[] }> {
    return this.get(`/api/v1/chains/${encodeURIComponent(chainId)}`);
  }

  async getAudit(chainId: string): Promise<IncidentReport> {
    return this.get(`/api/v1/audit/${encodeURIComponent(chainId)}`);
  }

  async whoami(): Promise<{ org_id: string; org_name: string; slug: string; default_tenant_id: string }> {
    return this.get("/api/v1/whoami");
  }

  // ------------ internals ------------
  private async get<T>(path: string): Promise<T> { return this.request<T>("GET", path); }
  private async post<T>(path: string, body: unknown): Promise<T> { return this.request<T>("POST", path, body); }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let resp: Response;
    try {
      resp = await this._fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e: any) {
      throw new NetworkError(`${method} ${path} failed: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }

    let data: any;
    try { data = await resp.json(); } catch { data = await resp.text(); }

    if (resp.status === 200) return data as T;
    const msg = extractMessage(data);
    if (resp.status === 401) throw new AuthenticationError(msg, 401, data);
    if (resp.status === 400) throw new InvalidPayloadError(msg, 400, data);
    if (resp.status === 404) throw new NotFoundError(msg, 404, data);
    throw new HeimdallError(msg, resp.status, data);
  }
}

function extractMessage(body: any): string {
  if (body && typeof body === "object") {
    const detail = body.detail;
    if (detail && typeof detail === "object") return detail.message ?? detail.error ?? JSON.stringify(detail);
    if (detail) return String(detail);
    return body.message ?? body.error ?? JSON.stringify(body);
  }
  return String(body);
}
```

### Examples — mirror Python

`examples/01_basic_delegation.ts`:
```typescript
import { Heimdall } from "../src";
const hd = new Heimdall({
  apiKey: process.env.HEIMDALL_API_KEY!,
  baseUrl: process.env.HEIMDALL_URL ?? "http://localhost:8000",
});
const first = await hd.delegate({
  from_agent: "user", to_agent: "research_agent",
  action: "read:data", capabilities: ["read:data", "read:market"],
  declared_intent: "User asked: what's Tesla's Q4 outlook?",
});
console.log(`hop 1: ${first.decision} (depth=${first.depth}, chain=${first.chain_id.slice(0,8)})`);
if (first.decision !== "ALLOW") process.exit(1);

const second = await hd.delegate({
  parent_credential: first.credential,
  from_agent: "research_agent", to_agent: "search_agent",
  action: "read:market", capabilities: ["read:market"],
});
console.log(`hop 2: ${second.decision} (depth=${second.depth})`);
```

`02_attack_blocked.ts` and `03_chain_audit.ts` follow exactly the same flow as the Python equivalents.

### Day 4 verification

```bash
cd sdks/typescript
npm install
npm run build
# In another terminal: backend running (see "How to verify").
HEIMDALL_API_KEY=hd_test_smoketestkey123456 HEIMDALL_URL=http://127.0.0.1:8765 \
  npx tsx examples/01_basic_delegation.ts
```

Acceptance:
- All three examples behave identically to their Python counterparts.
- `npm publish --dry-run` shows only `dist/` shipped.
- TypeScript strict mode passes (`tsc --noEmit --strict`).

---

## Day 5 — Docker compose + `heimdall` CLI

**Goal:** `git clone && cp .env.example .env && docker compose up` brings up backend + frontend with a working demo org. `heimdall keys create` mints new keys without leaving the container.

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend /app/backend
COPY verticals /app/verticals
COPY policies /app/policies
COPY scripts /app/scripts
COPY cli /app/cli
ENV PYTHONPATH=/app
ENV HEIMDALL_ALLOWED_ORIGINS=http://localhost:3000
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `frontend/Dockerfile`

```dockerfile
# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ---- runner ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

If `next.config.js` doesn't already opt into `output: 'standalone'`, add it.

### `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports: ["8000:8000"]
    environment:
      HEIMDALL_SECRET: ${HEIMDALL_SECRET:-dev-secret-do-not-use-in-prod-32bytes-hex}
      HEIMDALL_DEMO_API_KEY: ${HEIMDALL_DEMO_API_KEY:-}
      HEIMDALL_ALLOWED_ORIGINS: ${HEIMDALL_ALLOWED_ORIGINS:-http://localhost:3000}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      LOBSTER_TRAP_URL: ${LOBSTER_TRAP_URL:-}
    volumes:
      - heimdall-data:/app/data
      - ./verticals:/app/verticals
      - ./policies:/app/policies
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 10s
      timeout: 3s
      retries: 5

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
    ports: ["3000:3000"]
    depends_on:
      backend:
        condition: service_healthy

  lobstertrap:
    profiles: ["dpi"]
    build:
      context: ./lobstertrap_service
      dockerfile: Dockerfile
    ports: ["8080:8080"]
    environment:
      LT_BACKEND: "https://generativelanguage.googleapis.com/v1beta/openai"

volumes:
  heimdall-data:
```

**Important fix needed in `backend/db.py`:** `DATABASE_URL = f"sqlite:///{settings.REPO_ROOT / 'heimdall.db'}"` puts the DB inside the image's read-only filesystem. Change to read `HEIMDALL_DB_PATH` env var (default `/app/data/heimdall.db` in container, repo-root file locally):
```python
DB_PATH = os.environ.get("HEIMDALL_DB_PATH") or str(settings.REPO_ROOT / 'heimdall.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"
```
Set `HEIMDALL_DB_PATH=/app/data/heimdall.db` in the backend service env. Make sure the directory exists at startup (create it in the Dockerfile or in `init_db`).

### `.env.example`

```bash
# === Required for production ===
HEIMDALL_SECRET=                       # 32+ random bytes for JWT signing
HEIMDALL_ALLOWED_ORIGINS=http://localhost:3000

# === Optional: pin a known demo key (otherwise auto-generated, shown once in logs) ===
HEIMDALL_DEMO_API_KEY=

# === LLM ===
GEMINI_API_KEY=                        # leave empty for deterministic mock incident reports

# === Optional: real Lobster Trap DPI proxy ===
LOBSTER_TRAP_URL=                      # e.g. http://lobstertrap:8080 when using --profile dpi

# === Optional: real Sepolia for the DeFi demo's execute_trade tool ===
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
SEPOLIA_TO_ADDRESS=
```

### The `heimdall` CLI

A standalone Python module at `cli/heimdall_cli.py`, exposed as a console script via `pyproject.toml` at repo root (or use `python -m cli.heimdall_cli`).

```python
"""heimdall — operator CLI.

Talks to the same SQLite DB the backend uses. Run inside the container with:
    docker compose exec backend heimdall keys create --name production
"""
import argparse, os, sys
from backend.auth import create_api_key, ensure_demo_org, hash_api_key
from backend.db import ApiKey, Organization, SessionLocal, init_db, utcnow


def cmd_keys_create(args):
    init_db()
    raw, row = create_api_key(args.org or "demo", args.name, env=args.env)
    print(f"id:     {row.id}")
    print(f"prefix: {row.key_prefix}")
    print(f"name:   {row.name}")
    print(f"org:    {row.org_id}")
    print()
    print(f"KEY (shown once): {raw}")


def cmd_keys_list(args):
    init_db()
    db = SessionLocal()
    try:
        rows = db.query(ApiKey).filter_by(org_id=args.org or "demo").all()
        for r in rows:
            state = "active" if r.revoked_at is None else "revoked"
            print(f"  {r.id}  {r.key_prefix}…  {r.name:<30}  {state}")
    finally:
        db.close()


def cmd_keys_revoke(args):
    init_db()
    db = SessionLocal()
    try:
        row = db.query(ApiKey).filter_by(id=args.id).first()
        if not row: sys.exit(f"no such key: {args.id}")
        row.revoked_at = utcnow()
        db.commit()
        print(f"revoked {row.id} ({row.key_prefix}…)")
    finally:
        db.close()


def cmd_reset(args):
    from scripts.reset_demo import main as reset_main
    reset_main()


def cmd_doctor(args):
    from backend.config import settings
    checks = [
        ("LLM (Gemini)",      "ok" if settings.gemini_available else "mock (no GEMINI_API_KEY)"),
        ("Lobster Trap",      "real" if not settings.lobster_trap_mocked else "mock (no LOBSTER_TRAP_URL)"),
        ("Sepolia",           "real" if not settings.sepolia_mocked else "mock (no SEPOLIA_* env)"),
        ("HEIMDALL_SECRET",   "set" if settings.HEIMDALL_SECRET != "dev-secret-do-not-use-in-prod-32bytes-hex" else "DEV DEFAULT (insecure!)"),
        ("DB path",           os.environ.get("HEIMDALL_DB_PATH") or "(repo root)"),
    ]
    for name, status in checks:
        print(f"  {name:<20} {status}")


def main():
    p = argparse.ArgumentParser(prog="heimdall")
    sub = p.add_subparsers(dest="cmd", required=True)

    keys = sub.add_parser("keys", help="manage API keys").add_subparsers(dest="sub", required=True)
    k_create = keys.add_parser("create"); k_create.add_argument("--name", required=True); k_create.add_argument("--org"); k_create.add_argument("--env", default="live", choices=["live","test"]); k_create.set_defaults(func=cmd_keys_create)
    k_list   = keys.add_parser("list");   k_list.add_argument("--org");   k_list.set_defaults(func=cmd_keys_list)
    k_rev    = keys.add_parser("revoke"); k_rev.add_argument("id");       k_rev.set_defaults(func=cmd_keys_revoke)

    sub.add_parser("reset", help="wipe DB and reseed").set_defaults(func=cmd_reset)
    sub.add_parser("doctor", help="env + mock status report").set_defaults(func=cmd_doctor)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
```

Register the entry point — add to a new `pyproject.toml` at repo root:
```toml
[project]
name = "heimdall"
version = "0.1.0"
# ...
[project.scripts]
heimdall = "cli.heimdall_cli:main"
```

In the backend Dockerfile, add `RUN pip install -e .` after copying.

### Day 5 verification

```bash
docker compose build
docker compose up -d
docker compose logs backend | grep "DEMO API KEY"
# Save the printed key.

curl http://localhost:8000/api/health           # → 200
curl http://localhost:3000                       # → landing page HTML

docker compose exec backend heimdall keys create --name "production app" --env live
docker compose exec backend heimdall keys list
docker compose exec backend heimdall doctor
```

---

## Day 6 — Docs

Write four files under `docs/`. Aim for ruthless concision; this is integration documentation, not a textbook.

### `docs/QUICKSTART.md`

Five minutes from clone to a successful `delegate()` call.

Outline:
1. **What you'll have at the end** (one paragraph + screenshot of the dashboard).
2. **Install** — `docker compose up`, copy the demo key from logs.
3. **Verify** — curl `/api/v1/whoami`.
4. **Your first delegation** — Python and TypeScript side-by-side, two hops, second one denied to show the value.
5. **Where to go next** — link to API.md, POLICIES.md, INTEGRATE.md.

### `docs/API.md`

Full endpoint reference. For each route, show: method+path, headers, request body, 200 response, error responses. The wire format in §"Reference" below is the source material.

Better still: link directly to FastAPI's autogenerated `/docs` OpenAPI viewer (runs at `http://localhost:8000/docs`). Keep API.md as the "human-readable companion" with examples curl-able from the page.

### `docs/POLICIES.md`

How the six rule primitives work and how to author them.

Outline:
1. The two-layer model (Layer 1 unrepresentable, Layer 2 configurable).
2. The six primitives, each with: YAML shape, what it catches, an example.
3. The example library in `policies/examples/` (HIPAA, SOC 2, EU AI Act packs).
4. How to load custom YAML (currently vertical-bound; phase 2 will be org-bound).

### `docs/INTEGRATE.md`

Three integration recipes, each ~30 lines of code:

1. **Raw Python loop** — what `examples/01_basic_delegation.py` already shows, but framed as a generic "wrap each agent call".
2. **FastAPI middleware** — drop-in middleware for any FastAPI service that runs `hd.delegate()` before forwarding to the underlying agent.
3. **LangChain `Runnable` adapter** — wrap a `RunnableLambda` so every step in a chain hits Heimdall first. Short and concrete.

---

## Day 7 — Polish + landing page Install section

### Backend polish

- **API errors** — every non-200 already returns `{detail: {error, message}}` from the auth path. Audit `backend/endpoints/v1.py` for consistent shapes (`400 invalid_payload`, `404 chain_not_found`, etc.). Already mostly done.
- **CORS** — `/api/v1/*` should accept any origin (callers are external services, not browsers). Easiest: add a second middleware that toggles `Access-Control-Allow-Origin: *` for paths starting with `/api/v1/`, while the dashboard `/api/*` keeps the existing allow-list.
- **`/api/v1/keys/logs` (stretch)** — list the last 100 requests per API key. Add a `KeyUsage` table or just query `ChainCredential` filtered by org+key.
- **CHANGELOG.md** — start it; `0.1.0` line with the gateway features.

### Landing page Install section

Add a new section between `LobsterTrap` and `Limitations` (so it sits in the natural reading order after "what it is" and before "what it isn't"). Section number `§ 05`; the existing `§ 05 Limitations` gets bumped to `§ 06`, `Close` to `§ 07`.

Component: `frontend/components/landing/Install.tsx`.

**Design intent:** match the existing tonal language. Three columns, each with the install verb in mono type. Below them, a single, copyable terminal block showing the entire flow.

Sketch:

```tsx
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const STEPS = [
  {
    n: "01",
    title: "Clone + bring it up",
    cmd: "git clone https://github.com/patrick-steve/heimdall\ncd heimdall\ndocker compose up",
    note: "Backend at :8000, dashboard at :3000. Demo API key printed in logs on first boot.",
  },
  {
    n: "02",
    title: "Install the SDK",
    cmd: "pip install heimdall-sdk\n# or\nnpm install @heimdall/sdk",
    note: "Python 3.9+ or Node 18+. Both ship with the same surface; pick one.",
  },
  {
    n: "03",
    title: "Authorise a delegation",
    cmd: `from heimdall import Heimdall
hd = Heimdall(api_key="hd_test_...", base_url="http://localhost:8000")
result = hd.delegate(
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
)
if result.denied:
    print("blocked by", result.rule, "-", result.reason)`,
    note: "If the parent agent doesn't carry payment:send, Heimdall refuses to sign at Layer 1.",
  },
];

export function Install() {
  return (
    <Section index="05" label="INSTALL" id="install">
      <Reveal as="div" className="mb-10 md:mb-14 max-w-prose">
        <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-5">
          Self-host in two minutes. <span className="text-zinc-500">SDK in five.</span>
        </h2>
        <p className="text-zinc-400 leading-relaxed">
          Heimdall is MIT-licensed and ships as a Docker compose file plus two SDKs (Python and
          TypeScript). Run it locally, on Render, on your own infrastructure — the wire format is
          the same everywhere.
        </p>
      </Reveal>

      <ol className="border border-edge grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-edge">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 120} className="p-6 md:p-7">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-[11px] tracking-widest uppercase text-bifrost">§ {s.n}</span>
              <h3 className="font-display text-base md:text-lg font-semibold text-zinc-100">{s.title}</h3>
            </div>
            <pre className="bg-slab/70 border border-edge p-4 font-mono text-[11.5px] leading-relaxed text-zinc-200 overflow-x-auto mb-4 whitespace-pre">
{s.cmd}
            </pre>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed">{s.note}</p>
          </Reveal>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <a href="/docs/QUICKSTART" className="text-zinc-300 hover:text-bifrost transition-colors">full quickstart ↗</a>
        <span className="text-zinc-700">/</span>
        <a href="/docs/API" className="text-zinc-300 hover:text-bifrost transition-colors">api reference ↗</a>
        <span className="text-zinc-700">/</span>
        <a href="https://github.com/patrick-steve/heimdall" target="_blank" rel="noopener" className="text-zinc-300 hover:text-bifrost transition-colors">github ↗</a>
      </div>
    </Section>
  );
}
```

Wire it into `frontend/app/page.tsx`:

```tsx
import { Install } from "@/components/landing/Install";
// ...
<LobsterTrap />
<Install />        {/* new */}
<Limitations />
<Close />
```

Also update `Limitations.tsx` and `Close.tsx` section index strings if they hard-code `§ 05` / `§ 06`. Audit them after editing.

### Versioning + release

- `CHANGELOG.md` with the v0.1.0 entry summarising Days 1–7.
- Tag `git tag v0.1.0 && git push --tags`.
- (Stretch) draft a GitHub release with the SDK install commands and a screenshot of the new Install section.

---

## Reference: the wire format

### `POST /api/v1/delegate`

Request:
```json
{
  "parent_credential": "eyJhbGciOiJIUzI1NiIs...",   // JWT, null/missing on first hop
  "from_agent": "research_agent",
  "to_agent": "payment_agent",
  "action": "payment:send",
  "capabilities": ["payment:send"],
  "value_limit": 5000,
  "declared_intent": "wire $5,000 to vendor for invoice #4421",
  "detected_intent": null,            // from upstream DPI (Lobster Trap) if present
  "context": {"invoice_id": "4421"}
}
```

Response 200 ALLOW:
```json
{
  "decision": "ALLOW",
  "credential": "eyJhbGciOi...",
  "chain_id": "0c98f9db-...",
  "depth": 3,
  "expires_at": "2026-05-17T12:05:00+00:00",
  "evaluations": [
    {"rule": "capability_attenuation", "layer": "protocol", "result": "ALLOW", "reason": "scope ⊆ parent scope"},
    {"rule": "value_threshold_by_depth", "layer": "policy", "result": "ALLOW", "reason": "..."}
  ]
}
```

Response 200 DENY (note: still 200 — the request was *processed*; the policy decision is in the body):
```json
{
  "decision": "DENY",
  "rule": "capability_attenuation",
  "layer": "protocol",
  "reason": "scope ['payment:send'] not in parent scope ['read:data', 'read:market']",
  "chain_id": "0c98f9db-...",
  "evaluations": [...]
}
```

Errors are 4xx with `{detail: {error, message}}`:
- 400 `invalid_payload` — missing required fields
- 400 `invalid_parent_credential` — JWT bad signature / expired
- 400 `chain_error` — generic chain validation failure
- 401 `authentication_required` — no API key
- 401 `invalid_api_key` — bad API key
- 404 `parent_not_found` — parent JWT decodes but the row isn't in this org
- 404 `chain_not_found` — for `GET /chains/{id}` / `GET /audit/{id}`

### `POST /api/v1/agents`
Request: `{id, display_name, role, scope?, owner?, tenant_id?}` → `{id, status: "registered" | "updated"}`.

### `GET /api/v1/agents` → `{agents: [Agent, ...]}`

### `GET /api/v1/chains?status=denied&limit=50` → `{chains: [ChainSummary, ...]}`

### `GET /api/v1/chains/{chain_id}` → `{chain_id, hops: [Hop], evaluations: [...]}`

### `GET /api/v1/audit/{chain_id}` → `{chain_id, incident_id?, severity?, summary?, report?, created_at?}` (`report=null` if not yet generated)

### `GET /api/v1/whoami` → `{org_id, org_name, slug, default_tenant_id}`

---

## Gotchas (real, learned the hard way)

1. **SQLite stores naive datetimes; `utcnow()` returns tz-aware.** Subtracting them raises `TypeError: can't subtract offset-naive and offset-aware datetimes`. Workaround in `auth.py` line ~104: `now = utcnow().replace(tzinfo=None)`. Same pattern needed anywhere else you compare to a DB datetime column.
2. **Windows console is cp1252 by default.** Heimdall returns reason strings with `⊆`, `→`, etc. SDK examples reconfigure stdout:
   ```python
   if hasattr(sys.stdout, "reconfigure"):
       sys.stdout.reconfigure(encoding="utf-8", errors="replace")
   ```
   Add this to any new Python script that prints server responses.
3. **Pyright shows endless SQLAlchemy column-type warnings.** Documented in `HANDOFF.md`. Runtime is fine; don't try to "fix" by adding casts everywhere.
4. **`add_middleware` prepends** in Starlette — the LAST middleware added is the OUTERMOST in execution order. Current order: `CORSMiddleware → SessionMiddleware → AuthMiddleware → routes`. Don't reorder.
5. **Multiple uvicorn processes pile up** when `&`-backgrounded without a clean kill. `kill $BACKEND_PID; wait $BACKEND_PID 2>/dev/null` after every test, or run on a non-standard port to avoid stepping on a dev server.
6. **Tests must `cd` to repo root BEFORE starting uvicorn**, otherwise `ModuleNotFoundError: No module named 'backend'`. Don't `cd sdks/python` before launching the backend.
7. **`heimdall.db` location.** Currently hard-coded to `settings.REPO_ROOT / 'heimdall.db'`. Day 5 must externalise this via `HEIMDALL_DB_PATH` (see §5).
8. **First-boot demo key** is shown once, in the backend logs, between two `===` banner lines. After that it's gone (only the hash is stored). To pin a stable key for tests, set `HEIMDALL_DEMO_API_KEY` *before first boot*. If you boot, lose the key, then set the env var — you have to delete `heimdall.db` for it to take effect (because `ensure_demo_org()` checks "does this org already have any key?" and skips).
9. **The dashboard does not yet send an API key.** It relies on the demo-fallback path in `AuthMiddleware`. Don't break that fallback without also updating `frontend/lib/api.ts` to attach a key.
10. **Per-session ContextVar** stays the dashboard's isolation mechanism. Don't confuse it with `org_id` (orgs are auth boundaries; sessions are per-tab UX). Both are set, both are independent.

---

## File-by-file map of what we touched

| File | Day | What changed |
|---|---|---|
| `backend/db.py` | 1 | Added `Organization`, `ApiKey`, `_ensure_v1_columns()`. Added `org_id` column to four tables. |
| `backend/config.py` | 1 | Added `HEIMDALL_DEMO_API_KEY` env var. |
| `backend/auth.py` | 1 | **New file.** Middleware + helpers + `ensure_demo_org`. |
| `backend/main.py` | 1 | Mounted `AuthMiddleware`. Seed demo org in `lifespan`. |
| `backend/endpoints/delegate.py` | 1 | `_persist_cred` and `_persist_evaluations` write `org_id`. |
| `backend/endpoints/register.py` | 1 | `_upsert` writes `org_id`. |
| `backend/endpoints/audit.py` | 1 | Incident rows write `org_id`. |
| `backend/policy_engine.py` | 1 | `RuleEvaluation` inserts write `org_id`. |
| `backend/endpoints/v1.py` | 2 | **New file.** All `/api/v1/*` routes. |
| `backend/main.py` | 2 | Mounted v1 router under `/api/v1`. |
| `sdks/python/**` | 3 | **New tree.** Full SDK + 3 examples + README + pyproject. |

Nothing else has been edited.

---

## Suggested commit / PR plan

If the user approves commits after this session:

1. **Commit A — Day 1 auth layer.** `backend/auth.py`, `backend/db.py`, `backend/config.py`, `backend/main.py`, and the `org_id` plumbing in `delegate.py`/`register.py`/`audit.py`/`policy_engine.py`. Commit message: `Add org + API key auth, scope existing tables`.
2. **Commit B — Day 2 v1 API.** `backend/endpoints/v1.py` + the `main.py` router mount. Message: `Add /api/v1/* endpoints (delegate, agents, chains, audit, whoami)`.
3. **Commit C — Day 3 Python SDK.** `sdks/python/**`. Message: `Add heimdall-sdk (Python) 0.1.0`.
4. **Commit D+ — Days 4–7** as you ship them.

---

## One last thing

The `GENERALIZE.md` plan is the source of truth for *what* and *why*. This file (`RESUME.md`) is the source of truth for *where we are* and *how to continue*. If they ever disagree, this file wins.
