# Heimdall v1 HTTP API

> Companion to the OpenAPI viewer at `http://localhost:8000/docs`. Every
> shape below is curl-able once you have an API key (see [QUICKSTART](./QUICKSTART.md)).

All v1 endpoints share the same contract:

- **Auth:** `Authorization: Bearer hd_live_...` or `hd_test_...` — required.
- **Scope:** everything is filtered by the org that owns the API key. Other orgs
  are invisible; `tenant_id` is always derived from the org and any value the
  client supplies is ignored.
- **Errors:** `{detail: {error, message}}` with the matching 4xx status.
- **Decisions:** the policy verdict for `POST /delegate` lives in the response
  body (`decision`), not in the HTTP status. `200` means "the request was
  processed"; the body says ALLOW or DENY. Anything else is a client or server
  error.

| Code | `error`                       | When                                                |
|------|-------------------------------|-----------------------------------------------------|
| 400  | `invalid_payload`             | missing required field                              |
| 400  | `invalid_parent_credential`   | parent JWT failed signature / expired              |
| 400  | `chain_error`                 | generic chain validation failure                    |
| 401  | `authentication_required`     | no API key                                          |
| 401  | `invalid_api_key`             | bad API key                                         |
| 404  | `parent_not_found`            | parent JWT decodes, but row isn't in this org       |
| 404  | `chain_not_found`             | for `GET /chains/{id}` / `GET /audit/{id}`          |

---

## `POST /api/v1/delegate`

Authorise one hop in a delegation chain. The first hop omits `parent_credential`;
every subsequent hop passes the signed JWT returned by the previous call.

### Request

```json
{
  "parent_credential": "eyJhbGciOi...",
  "from_agent": "research_agent",
  "to_agent": "payment_agent",
  "action": "payment:send",
  "capabilities": ["payment:send"],
  "value_limit": 5000,
  "declared_intent": "wire $5,000 to vendor for invoice #4421",
  "detected_intent": null,
  "context": {"invoice_id": "4421"}
}
```

| Field               | Type            | Required | Notes                                                            |
|---------------------|-----------------|----------|------------------------------------------------------------------|
| `from_agent`        | string          | yes      | Caller agent id, registered in this org                          |
| `to_agent`          | string          | yes      | Callee agent id, registered in this org                          |
| `action`            | string          | yes      | The capability being exercised on this hop                       |
| `capabilities`      | array of string | yes      | Scope to grant the child; must be a subset of the parent's       |
| `parent_credential` | string          | no       | JWT from the previous hop. Omit on the first call                |
| `value_limit`       | integer         | no       | Monetary cap (or row count, etc.) that policy engine can compare |
| `declared_intent`   | string          | no       | Plain-language reason — the agent's own statement                |
| `detected_intent`   | string          | no       | From upstream DPI (Veea Lobster Trap) if available               |
| `context`           | object          | no       | Arbitrary metadata stored verbatim for the audit trail           |

### Response — ALLOW

```json
{
  "decision": "ALLOW",
  "credential": "eyJhbGciOi...",
  "chain_id": "0c98f9db-...",
  "depth": 3,
  "expires_at": "2026-05-17T12:05:00+00:00",
  "evaluations": [
    {"rule": "capability_attenuation", "layer": "protocol", "result": "ALLOW",
     "reason": "scope ⊆ parent scope"},
    {"rule": "value_threshold_by_depth", "layer": "policy", "result": "ALLOW",
     "reason": "value 5000 <= max 10000 at depth 3"}
  ]
}
```

Pass `credential` as the next call's `parent_credential`.

### Response — DENY

```json
{
  "decision": "DENY",
  "rule": "capability_attenuation",
  "layer": "protocol",
  "reason": "scope ['payment:send'] not in parent scope ['read:data', 'read:market']",
  "chain_id": "0c98f9db-...",
  "evaluations": [
    {"rule": "capability_attenuation", "layer": "protocol", "result": "DENY",
     "reason": "scope ['payment:send'] not in parent scope ['read:data', 'read:market']"}
  ]
}
```

`layer` tells you whether the protocol (Layer 1, unrepresentable) or the
policy engine (Layer 2, configurable) caused the deny.

---

## `POST /api/v1/agents`

Register or upsert an agent under the calling org.

### Request

```json
{
  "id": "payment_agent",
  "display_name": "Payment Agent",
  "role": "executor",
  "scope": ["payment:send"],
  "owner": "alice@acme.example",
  "tenant_id": "acme_capital"
}
```

| Field          | Required | Notes                                                          |
|----------------|----------|----------------------------------------------------------------|
| `id`           | yes      | Stable id; re-registering the same id updates the existing row |
| `display_name` | yes      | Shown on the dashboard                                          |
| `role`         | yes      | Used by `chain_pattern` when `match_by: role`                   |
| `scope`        | no       | Default capability bag for the agent                            |
| `owner`        | no       | Human owner (email, slack handle, free-form)                    |
| `tenant_id`    | no       | Defaults to the org's `default_tenant_id`                       |

### Response

```json
{"id": "payment_agent", "status": "registered"}
```

`status` is `"registered"` on first write, `"updated"` on subsequent ones.

---

## `GET /api/v1/agents`

```json
{
  "agents": [
    {
      "id": "research_agent",
      "display_name": "Research Agent",
      "role": "analyst",
      "tenant_id": "acme_capital",
      "scope": ["read:data", "read:market"],
      "owner": "alice@acme.example",
      "is_dormant": false,
      "registered_at": "2026-05-12T11:43:21+00:00"
    }
  ]
}
```

---

## `GET /api/v1/chains?status={allowed|denied|flagged}&limit={1..500}`

```json
{
  "chains": [
    {
      "chain_id": "0c98f9db-...",
      "tenant_id": "acme_capital",
      "started_at": "2026-05-18T09:14:02+00:00",
      "hop_count": 2,
      "head_caller": "user",
      "head_callee": "research_agent",
      "status": "denied"
    }
  ]
}
```

Status is the worst verdict seen across the chain's evaluations: `denied >
flagged > allowed`.

---

## `GET /api/v1/chains/{chain_id}`

```json
{
  "chain_id": "0c98f9db-...",
  "hops": [
    {
      "jti": "...",
      "parent_jti": null,
      "from_agent": "user",
      "to_agent": "research_agent",
      "action": "read:data",
      "tenant_id": "acme_capital",
      "scope": ["read:data", "read:market"],
      "value_limit": null,
      "declared_intent": "What's Tesla's Q4 outlook?",
      "detected_intent": null,
      "issued_at": "2026-05-18T09:14:02+00:00",
      "expires_at": "2026-05-18T09:19:02+00:00"
    }
  ],
  "evaluations": [
    {"rule": "capability_attenuation", "layer": "protocol",
     "result": "ALLOW", "reason": "scope ⊆ parent scope",
     "matched_segment": "user→research_agent"}
  ]
}
```

---

## `GET /api/v1/audit/{chain_id}`

Returns the latest persisted incident report (Markdown). Report generation is
still triggered via the legacy streaming endpoint
`POST /api/audit/report/{chain_id}`; v1 just reads the persisted text.

```json
{
  "chain_id": "0c98f9db-...",
  "incident_id": "inc_a1b2",
  "severity": "high",
  "summary": "Capability escalation attempt blocked at protocol layer.",
  "report": "## Incident Report\n\n…",
  "created_at": "2026-05-18T09:14:09+00:00"
}
```

If no report exists yet, the server returns `{"chain_id": ..., "report": null,
"message": "..."}` instead of 404 — easier to handle in client code.

---

## `GET /api/v1/whoami`

Diagnostic. Returns the org the current API key belongs to.

```json
{
  "org_id": "demo",
  "org_name": "Demo",
  "slug": "demo",
  "default_tenant_id": "acme_capital"
}
```

---

## CORS

The v1 endpoints are designed to be called from external services, not
browsers — but if you want to call them from a frontend, the easiest path is
to set `HEIMDALL_ALLOWED_ORIGINS=*` (development) or a comma-separated allow
list in production. See `.env.example`.
