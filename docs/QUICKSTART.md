# Heimdall — Quickstart

> Clone → run → authorise your first delegation in under five minutes.

By the end of this you will have:

- a Heimdall backend on `:8000` and a live dashboard on `:3000`,
- an API key minted into the demo organisation,
- one successful two-hop delegation chain visible in the dashboard,
- one delegation **refused** by `capability_attenuation` at Layer 1.

If anything goes sideways, [`heimdall doctor`](#heimdall-doctor) prints the
full env-and-mock status report.

---

## 1. Install

```bash
git clone https://github.com/patrick-steve/heimdall
cd heimdall
cp .env.example .env

# Optional: pin a known demo key before first boot so you can paste it later.
echo 'HEIMDALL_DEMO_API_KEY=hd_test_quickstart_demo' >> .env

docker compose up
```

The backend prints the demo API key between two `===` banner lines:

```
=================================================================
DEMO API KEY (save this — shown once):
  hd_test_quickstart_demo
Use it: curl -H 'Authorization: Bearer hd_test_quickstart_demo' ...
=================================================================
```

If you didn't pin one in `.env`, copy the auto-generated value now — only its
hash is stored after this boot.

---

## 2. Verify the install

```bash
export HEIMDALL_API_KEY=hd_test_quickstart_demo

curl -H "Authorization: Bearer $HEIMDALL_API_KEY" http://localhost:8000/api/v1/whoami
# → {"org_id":"demo","org_name":"Demo","slug":"demo","default_tenant_id":"acme_capital"}
```

Open `http://localhost:3000` — the dashboard is live, scoped to your session.

---

## 3. Your first delegation

Pick a language. The two SDKs are wire-compatible — switch any time.

### Python

```bash
pip install heimdall-sdk
```

```python
import os
from heimdall import Heimdall

hd = Heimdall(
    api_key=os.environ["HEIMDALL_API_KEY"],
    base_url="http://localhost:8000",
)

first = hd.delegate(
    from_agent="user",
    to_agent="research_agent",
    action="read:data",
    capabilities=["read:data", "read:market"],
    declared_intent="What's Tesla's Q4 outlook?",
)
print("hop 1:", first.decision)            # ALLOW

second = hd.delegate(
    parent_credential=first.credential,
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
)
print("hop 2:", second.decision, second.rule)  # DENY capability_attenuation
```

### TypeScript

```bash
npm install @heimdall/sdk
```

```typescript
import { Heimdall, isAllowed, isDenied } from "@heimdall/sdk";

const hd = new Heimdall({
  apiKey: process.env.HEIMDALL_API_KEY!,
  baseUrl: "http://localhost:8000",
});

const first = await hd.delegate({
  from_agent: "user",
  to_agent: "research_agent",
  action: "read:data",
  capabilities: ["read:data", "read:market"],
  declared_intent: "What's Tesla's Q4 outlook?",
});
console.log("hop 1:", first.decision);   // ALLOW

if (!isAllowed(first)) process.exit(1);

const second = await hd.delegate({
  parent_credential: first.credential,
  from_agent: "research_agent",
  to_agent: "payment_agent",
  action: "payment:send",
  capabilities: ["payment:send"],
});
console.log("hop 2:", second.decision, second.rule);  // DENY capability_attenuation
```

### What just happened

The first call signed a credential granting `read:data` and `read:market` to
`research_agent`. The second call asked Heimdall to sign a credential giving
`payment:send` to `payment_agent` — but `payment:send` is not in the parent
scope. `capability_attenuation` at **Layer 1** (the protocol) refuses to
emit the credential. The payment never has a signed delegation to carry, so
even a fully-compromised executor cannot make the transfer.

Switch to the dashboard tab. The two hops are visible in the chain ledger
with the second hop highlighted red.

---

## 4. Where to go next

| Want to…                                 | Read                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| See every endpoint and exact wire format | [API reference](./API.md) (live OpenAPI at `http://localhost:8000/docs`) |
| Author your own policies                 | [Policies guide](./POLICIES.md)                                      |
| Integrate Heimdall into an agent runtime | [Integration recipes](./INTEGRATE.md)                                |
| Manage API keys / orgs                   | `docker compose exec backend heimdall keys --help`                   |

### <a id="heimdall-doctor"></a>`heimdall doctor`

```
docker compose exec backend heimdall doctor

  LLM (Gemini)         real
  Lobster Trap         mock (no LOBSTER_TRAP_URL)
  Sepolia              mock (no SEPOLIA_* env)
  HEIMDALL_SECRET      set
  DB path              /app/data/heimdall.db
  Allowed origins      http://localhost:3000
```

Anything in `MOCK` mode keeps the demo working without external services —
flip the matching env vars in `.env` and restart to switch to real
integrations.
