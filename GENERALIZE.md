# Heimdall — Open the Gateway

*Make Heimdall callable by anyone, this week.*

The previous version of this file proposed a 5-week refactor to make the demo configurable. Wrong scope. The hard work — Layer 1 enforcement, Layer 2 policy engine, JWT chain, audit trail, dashboard — **already exists** in `backend/`. What's missing is the thin shell that turns it from "demo I run locally" into "API anyone can call."

This plan ships in **7 days**.

---

## Goal

A developer somewhere reads our docs, runs:

```bash
pip install heimdall-sdk
```

Then writes:

```python
from heimdall import Heimdall
hd = Heimdall(api_key="hd_live_xxx", base_url="https://heimdall.example.com")

result = hd.delegate(
    from_agent="research_agent",
    to_agent="payment_agent",
    capabilities=["payment:send"],
    intent="wire $5,000 to vendor for invoice #4421",
)

if result.allowed:
    proceed_with(credential=result.credential)
else:
    log.warn("Heimdall blocked", reason=result.reason, rule=result.rule)
```

…and it works. Their agent system is governed by Heimdall.

That's the success criterion.

---

## What we ship

| Artifact | Today | After this plan |
|---|---|---|
| `POST /api/delegate/raw` | Session-UUID-auth, accepts arbitrary `tenant_id` | `POST /api/v1/delegate` with API-key auth, org-scoped, versioned |
| Caller identity | `X-Heimdall-Session: <tab uuid>` | `Authorization: Bearer hd_live_xxx` |
| Multi-tenancy | Session-per-tab inside the dashboard | Orgs + API keys; sessions stay per-tab inside the dashboard, scoped under each org |
| Agent registration | YAML files synced at boot | Plus `POST /api/v1/agents` runtime register |
| SDK | None | `heimdall-sdk` (Python) + `@heimdall/sdk` (TypeScript) |
| Install | `python -m uvicorn ...` + `npm run dev` | `docker compose up`, key created via `heimdall keys create` |
| Docs | `README.md` + `DEPLOY.md` | + `docs/QUICKSTART.md` (5-min integration) + `docs/API.md` |

The dashboard, policies, mock fallbacks, narrative, three example verticals — **all of it stays**. The demo becomes a built-in `Demo` org with a pre-seeded API key. Eating our own dog food.

---

## NOT doing (still)

- No web UI to manage orgs/keys. CLI only. (UI is its own project; not a blocker.)
- No RBAC inside an org. One API key = full access to that org. Refine later.
- No Postgres. SQLite stays. (Yes, an installation can scale to thousands of chains in SQLite. Switch when someone complains.)
- No OAuth, no SSO, no webhooks, no rate limiting (beyond what the LLM provider already imposes), no audit log export. v0.2.
- No agent-framework adapters (LangChain, LlamaIndex). Plain SDK first; adapters are 50 lines each, ship as needed.
- No hosted SaaS. People self-host. (We can deploy a public demo, but billing/ops is a separate decision.)

---

## The wire format (v1)

This is the contract. Everything else is plumbing.

### `POST /api/v1/delegate`

```http
Authorization: Bearer hd_live_xxxxxxxx
Content-Type: application/json

{
  "parent_credential": "<JWT or null for first hop>",
  "from_agent": "research_agent",
  "to_agent": "payment_agent",
  "action": "payment:send",
  "capabilities": ["payment:send"],
  "value_limit": 5000,
  "declared_intent": "wire $5,000 to vendor for invoice #4421",
  "context": { "invoice_id": "4421" }
}
```

Response 200:

```json
{
  "decision": "ALLOW",
  "credential": "eyJhbGciOi...",
  "chain_id": "0c98f9db-...",
  "depth": 3,
  "expires_at": "2026-05-17T12:05:00Z",
  "evaluations": [
    { "rule": "capability_attenuation", "layer": "protocol", "result": "ALLOW" },
    { "rule": "value_threshold_by_depth", "layer": "policy", "result": "ALLOW" }
  ]
}
```

Response 403:

```json
{
  "decision": "DENY",
  "rule": "capability_attenuation",
  "layer": "protocol",
  "reason": "scope ['payment:send'] not in parent scope ['read:market_data']",
  "chain_id": "0c98f9db-...",
  "evaluations": [...]
}
```

`tenant_id` is **derived from the org**, not supplied by the caller. Cross-org chains are unrepresentable.

### `POST /api/v1/agents`

```json
{
  "id": "research_agent",
  "display_name": "Research Agent",
  "role": "data_fetcher",
  "scope": ["read:market_data", "read:database"],
  "owner": "alice@example.com"
}
```

### `GET /api/v1/chains?status=denied&limit=50`

Returns recent chains for the org. The dashboard uses this same endpoint.

### `GET /api/v1/audit/{chain_id}`

Returns the full chain + the streaming Gemini incident report.

---

## Day-by-day

### Day 1 — Orgs, API keys, auth middleware

- [ ] DB: `organizations(id, name, created_at)`, `api_keys(id, org_id, key_hash, name, created_at, revoked_at)`
- [ ] `backend/auth.py` — middleware that reads `Authorization: Bearer hd_...`, hashes, looks up org, sets `current_org_id()` ContextVar
- [ ] Keep the existing `X-Heimdall-Session` middleware for the dashboard (it now runs *under* the implicit Demo org's API key)
- [ ] Migration: on boot, if no orgs exist, create `Demo` + a `DEMO_API_KEY` env var or fixed local key. Dashboard uses it transparently.

### Day 2 — Versioned API, org-scoped resources

- [ ] Mount `/api/v1/*` routers alongside the existing `/api/*` (don't break the dashboard mid-flight; both work for v0.1)
- [ ] Add `org_id` columns to `agents`, `chain_credentials`, `rule_evaluations`, `incidents`. All queries filter on it.
- [ ] `POST /api/v1/delegate` wraps the existing `delegate_raw` but: derives `tenant_id` from the org, ignores spoofed `tenant_id`, returns the v1 response shape
- [ ] `POST /api/v1/agents`, `GET /api/v1/agents`, `GET /api/v1/chains`, `GET /api/v1/audit/{chain_id}` — thin wrappers, org-scoped

### Day 3 — Python SDK

- [ ] `sdks/python/heimdall/` — single class `Heimdall`, sync + async methods (`delegate`, `register_agent`, `list_chains`, `get_audit`)
- [ ] Typed dataclasses for the response (`DelegationResult`, `Evaluation`, …)
- [ ] `examples/` — three minimal scripts: (1) two-hop delegation, (2) attack that gets blocked, (3) integrate with a fake "research → payment" agent loop
- [ ] `pyproject.toml`, MIT license, ready to `pip install` from PyPI

### Day 4 — TypeScript SDK

- [ ] `sdks/typescript/` — same shape as Python; `Heimdall` class, types from the OpenAPI spec
- [ ] `examples/` — same three scenarios, Node + a browser demo that calls a localhost Heimdall
- [ ] `package.json`, ready to `npm publish`

### Day 5 — Docker, install CLI

- [ ] `Dockerfile` for backend, `Dockerfile` for frontend, `docker-compose.yml` (backend + frontend; lobstertrap under `--profile dpi`)
- [ ] `.env.example` listing every knob
- [ ] Named volume for SQLite so re-up doesn't wipe state
- [ ] `heimdall` CLI (Python entry point in the backend image):
  - `heimdall keys create --name <label>` → prints a fresh `hd_live_xxx` and the curl command to test it
  - `heimdall keys list` / `heimdall keys revoke <id>`
  - `heimdall reset` (existing reset script)
  - `heimdall doctor` (env-var + port + mock-status report)
- [ ] `README.md`: 5-line quickstart up top

### Day 6 — Docs

- [ ] `docs/QUICKSTART.md` — 5 minutes from clone to a successful `delegate()` call, in Python and TS
- [ ] `docs/API.md` — full endpoint reference (or expose `/docs` from FastAPI's autogen OpenAPI, link both)
- [ ] `docs/POLICIES.md` — six primitives + the example library + how to load custom YAML
- [ ] `docs/INTEGRATE.md` — three integration recipes (raw Python loop, FastAPI proxy, LangChain hook)
- [ ] At least one screenshot per doc

### Day 7 — Polish, cut v0.1.0

- [ ] CORS hardening: API endpoints accept any origin (with API key auth), dashboard endpoints keep the existing allow-list
- [ ] Friendly 401 / 403 / 422 error bodies (the SDK relies on them)
- [ ] Per-key request log (last 100) — viewable via `heimdall keys logs <id>`
- [ ] `CHANGELOG.md`, GitHub release tag `v0.1.0`
- [ ] Deploy public demo to `heimdall.<your-domain>`; the README shows the live endpoint people can test against without installing first

---

## Risks & mitigations

- **Existing dashboard breaks during the v1 refactor.** Mitigation: keep `/api/*` (v0) mounted alongside `/api/v1/*` until day 7; the dashboard migrates at the end.
- **API key leaks in logs.** Mitigation: log only the prefix (`hd_live_abcd…`), hash the rest before storage, never log the raw header.
- **`tenant_id` spoofing.** Mitigation: drop any client-supplied `tenant_id`; derive it server-side from the org. Reject if a parent credential's `tenant_id` doesn't match the calling org.
- **Mock fallbacks regress.** Mitigation: smoke-test the demo flow before merging each day's changes (`scripts/run_attack.py` still passes).
- **People want managed hosting.** Mitigation: ship self-host first; offer hosted as a separate decision after we see who shows up.

---

## What this unlocks

After day 7, Heimdall is a real product:

- Any team running agents can plug Heimdall in as a policy gate in an afternoon.
- The example verticals become integration tests, not the product itself.
- The dashboard becomes the operator UI for *their* chains, not just the demo's.
- The phase-2 conversations (Postgres, hosted SaaS, RBAC, LangChain adapter, web policy editor) are now grounded in real user feedback instead of guesses.

The configurable-demo work from the prior plan **still happens** — just as a natural side-effect of people writing their own integration code and asking for the rough edges to be smoothed. It's pulled by demand instead of pushed on speculation.
