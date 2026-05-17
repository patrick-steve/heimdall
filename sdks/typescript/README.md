# Heimdall TypeScript SDK

Runtime governance for AI agent delegation chains.

```bash
npm install @heimdall/sdk
```

Requires Node 18+ or any modern browser (uses the global `fetch`).

## Quick start

```typescript
import { Heimdall, isAllowed } from "@heimdall/sdk";

const hd = new Heimdall({
  apiKey: process.env.HEIMDALL_API_KEY!,
  baseUrl: "https://heimdall.example.com",
});

const result = await hd.delegate({
  from_agent: "research_agent",
  to_agent: "payment_agent",
  action: "payment:send",
  capabilities: ["payment:send"],
  declared_intent: "wire $5,000 to vendor for invoice #4421",
});

if (isAllowed(result)) {
  // proceed; pass result.credential to payment_agent on its next delegation
  console.log(`Approved. Chain ${result.chain_id}, hop depth ${result.depth}.`);
} else {
  console.warn(`Blocked at ${result.layer} layer by ${result.rule}: ${result.reason}`);
}
```

## Multi-hop chains

Pass the previous hop's `credential` as `parent_credential`:

```typescript
const first = await hd.delegate({
  from_agent: "user",
  to_agent: "research_agent",
  action: "read:data",
  capabilities: ["read:data", "read:market"],
});
// Research agent now tries to escalate to a payment scope it doesn't have:
const second = await hd.delegate({
  parent_credential: first.credential,
  from_agent: "research_agent",
  to_agent: "payment_agent",
  action: "payment:send",
  capabilities: ["payment:send"],
});
// second.decision === "DENY", second.rule === "capability_attenuation"
```

## Errors

| Status | Class                  | When                              |
|--------|------------------------|-----------------------------------|
| 401    | `AuthenticationError`  | missing or invalid API key        |
| 400    | `InvalidPayloadError`  | malformed request body            |
| 404    | `NotFoundError`        | chain / agent not in this org     |
| 5xx    | `HeimdallError`        | server error                      |
| —      | `NetworkError`         | transport failure before response |

All inherit from `HeimdallError`.

## Other operations

```typescript
await hd.registerAgent({
  id: "my_agent",
  display_name: "My Agent",
  role: "executor",
  scope: ["payment:send"],
});
await hd.listAgents();
await hd.listChains({ status: "denied", limit: 20 });
await hd.getChain("chain_id_...");
await hd.getAudit("chain_id_...");  // latest incident report (Markdown)
await hd.whoami();                   // diagnostic: which org owns this key
```

## License

MIT. See [github.com/patrick-steve/heimdall](https://github.com/patrick-steve/heimdall).
