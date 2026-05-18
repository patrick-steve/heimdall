# Heimdall — Product Demo

> A guided walkthrough of the working system. Pair with the slide deck for
> the conceptual pitch; this doc shows what's actually running and what to
> look for when you click around.

---

## In one paragraph

Heimdall is a runtime governance layer for AI agent delegation chains. When
agent A calls agent B, Heimdall signs a JWT carrying A's capabilities;
when B calls C, the chain is cryptographically attenuated — there is no
way for C to claim a capability that wasn't passed down. That's **Layer 1**.
On top, six rule primitives in YAML — chain pattern, agent state, chain
depth, value threshold, intent mismatch, behavioural drift — give
operators a configurable **Layer 2** without bypassing the protocol guarantee.
Built on Veea Lobster Trap, which inspects the model boundary while Heimdall
covers the agent boundary.

---

## Live URLs

| What | Where |
|------|-------|
| **Landing page** | `https://heimdall-backend.onrender.com/` |
| **Live dashboard** | `https://heimdall-backend.onrender.com/dashboard` |
| **Slide deck** (printable) | `https://heimdall-backend.onrender.com/deck` |
| **OpenAPI docs** | `https://heimdall-backend.onrender.com/docs` |
| **Source** | `https://github.com/patrick-steve/heimdall` |
| **Lobster Trap proxy** | `https://heimdall-lobstertrap.onrender.com/` (TCP-checked) |

> Render free tier spins down after 15 min idle. First request may take 30-60s.

---

## What's actually built

Be specific about what's deployed live vs. configured vs. roadmap:

| Capability | State | Where to verify |
|---|---|---|
| Two-layer enforcement (protocol + policy) | **Live** | `backend/jwt_chain.py`, `backend/policy_engine.py` |
| Six policy primitives in YAML | **Live** | `policies/examples/` — 12 example packs |
| Python SDK (`heimdall-sdk`) | **Live** | `sdks/python/`, three runnable examples |
| TypeScript SDK (`@heimdall/sdk`) | **Live** | `sdks/typescript/`, same surface as Python |
| `/api/v1/*` versioned API | **Live** | OpenAPI at `/docs` |
| Org + API key auth | **Live** | `backend/auth.py`, `heimdall keys create` CLI |
| Real-time dashboard via WebSocket | **Live** | `/dashboard` after running any scenario |
| Veea Lobster Trap proxy in the data path | **Live (Render)** | `lobster_trap_mocked: false` on `/api/health` |
| Sepolia broadcast on the DeFi executor | **Mocked** by default | Set `SEPOLIA_*` env to wire a real wallet |
| Gemini-powered incident reports | **Live** | Stream from `POST /api/audit/report/{chain_id}` |
| HIPAA / SOC 2 / EU AI Act packs | **Configured, not certified** | `policies/examples/compliance_pack_*.yaml` |
| Plain-English → YAML rule authoring | **Roadmap (v0.2)** | See landing's § ROADMAP section |
| Dry-run replay against the ledger | **Roadmap (v0.2)** | Replay endpoint already exists; UI doesn't |
| Traffic-mined rule suggestions | **Exploring** | `agent_behavior_baseline` already collects |

---

## The dashboard walkthrough

The dashboard at `/dashboard` is a guided three-act narrative. Same six
primitives across three verticals (DeFi, Healthcare, Customer Service);
each act drives the chain ledger and renders the rules firing live.

### Act 01 — Meet the cast

What you see when you open the dashboard:

- A header strip with the vertical selector (`DeFi · Healthcare · Customer Service`)
  and a Heimdall ON/OFF toggle.
- A row of agent cards. In DeFi: `coordinator`, `market_data`, `executor`,
  and `shadow` — an idle agent set up months ago and forgotten.
- A right-hand rail with four panels: rule cards (empty for now), agent
  registry, replay mode, incident report.

The agents carry different scopes (`read:portfolio`, `read:market_data`,
`execute:trade`, etc.) — this matters for what the attack tries to forge.

### Act 02 — A routine day

Click `▷ Run routine`. Two hops draw on the chain canvas left-to-right.
The rule sidebar fills with green cards. The "what happened" narrator on
the right tells the story in plain English.

What this proves: when the agents stay in their lane, the governance
layer is invisible. Every rule fires ALLOW. Both layers — protocol and
policy — agreed. **The point isn't that anything was blocked; it's that
the ledger is now auditable.**

### Act 03 — The attack (the headline)

Click `▷ Run attack`. Three things unfold in sequence:

1. **Hops 1 and 2 draw normally.** User → coordinator → market data. So
   far so good.

2. **The DPI evidence card appears under the canvas.** This is the
   integration with Veea Lobster Trap:

   - **Left column** — the declared intent: *"fetch market sentiment from
     external feed"*
   - **Right column** — what the DPI rules detected: *"external content
     attempting to invoke an agent with elevated scope"*
   - Plus the matched rule (`detect_external_injection`), the intent
     category, the risk score, and a `LIVE` / `MOCK` badge depending on
     whether `LOBSTER_TRAP_URL` is bound

   This is the moment Lobster Trap earns its place in the architecture.
   The agent thought it was fetching prices; the prompt it sent through
   the proxy contained an injection payload.

3. **A red deny burst lands on the chain canvas.** The compromised market
   data agent tries to forge `execute:trade` scope and hand it to the
   shadow account. **Heimdall's signing function refuses.** The rule
   sidebar shows `capability_attenuation DENY` pinned to the top. The
   credential is never minted. The executor never receives a JWT to act
   on.

   **There is no rule to bypass. The cryptography itself is what refuses.**
   That's Layer 1.

### The counterfactual — without Heimdall

The Compare Act lets you run the same attack with the toggle flipped off.

- Forged credential is signed because no one is checking
- Executor receives it, broadcasts a Sepolia transfer (mocked by default,
  real if `SEPOLIA_*` env is set)
- Green tx URL chip appears on the canvas — `0xATTACKER · +$27,000,000`

This is the entire reason the protocol layer is unrepresentable rather
than configurable. A rule that can be turned off is a rule that *was*
turned off.

### The incident report

Click any chain ID in the right rail → `Generate incident report`. Gemini
streams a Markdown incident memo summarising what happened, which rules
fired, and which compliance section the violation maps to. Compliance and
security teams subscribe to these.

---

## Vertical switching

The same dashboard runs three verticals from one engine:

- **DeFi** — fully wired with executor tool bindings. The attack scene
  signs (or mocks) a real Sepolia transfer.
- **Healthcare** — fully wired with a mock EHR. The attack rewrites
  patient 4421's chart from external lab content; the HIPAA pack catches
  it.
- **Customer Service** — policy YAML only. Agents and tools left for an
  integrator to wire up. Shows that "no pack" still gracefully degrades.

Switch verticals from the top selector. The chain canvas, rule sidebar,
and narrator all rewire to the new pack with zero code changes.

---

## How to try it yourself (5 minutes)

```bash
git clone https://github.com/patrick-steve/heimdall
cd heimdall
cp .env.example .env
docker compose up
```

Backend at `:8000`, dashboard at `:3000`. The demo API key prints in the
backend logs between two `===` banner lines on first boot.

Then in another terminal, with `HEIMDALL_API_KEY` set to that key:

```python
from heimdall import Heimdall

hd = Heimdall(api_key="hd_test_...", base_url="http://localhost:8000")

result = hd.delegate(
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
)
if result.denied:
    print("blocked at", result.layer, "by", result.rule, "—", result.reason)
```

Full quickstart: [`docs/QUICKSTART.md`](./QUICKSTART.md).
API reference: [`docs/API.md`](./API.md).
Policy authoring: [`docs/POLICIES.md`](./POLICIES.md).
Integration recipes: [`docs/INTEGRATE.md`](./INTEGRATE.md).

---

## What we're proudest of

1. **The Layer 1 / Layer 2 split.** Most agent governance projects ship a
   rules engine and call it done. Heimdall ships a rules engine on top of
   a cryptographic attenuation primitive that makes a class of attack
   *unrepresentable*. That distinction is the whole moat.

2. **The integration is two lines.** `pip install heimdall-sdk`, then
   `hd.delegate(...)` before each agent-to-agent call. No framework, no
   sidecar, no rewrite. Compare to "rewrite your agents on top of our
   platform" — the entire shape of competing products.

3. **The Veea complement.** Lobster Trap inspects the model boundary;
   Heimdall inspects the agent boundary. The Step Finance class of attack
   crosses both — and the proof is the DPI evidence card sitting under
   the chain canvas during the attack scene. Two boundaries, no overlap.

4. **Three verticals from one engine.** DeFi, Healthcare, and Customer
   Service share the same six primitives. The verticals differ only by
   YAML — agents, tools, and policy packs. That's the strongest evidence
   we have that the primitives are the right primitives.

---

## What's honestly missing

Pulled verbatim from the landing page's § HONEST LIMITATIONS section:

- **JWT, not Biscuit.** HS256 signatures instead of capability tokens with
  formal scope algebra. Upgrade is localised to `backend/jwt_chain.py`.
- **Set-membership drift, not ML.** `behavioral_drift` flags novel
  delegation targets via membership. Production would use embedding
  similarity over feature vectors.
- **Single demo organisation.** Tenant isolation works at the protocol
  level; the demo seed contains two tenants (legit + attacker).
- **Healthcare and Customer Service are sketches.** The mechanism is real
  in every vertical; only DeFi has functional tool bindings end-to-end.
- **No production-grade tests.** Scope decisions in `plan.md`. Auditable
  in a single afternoon, not deployable to staging.

---

## The roadmap

Three things, all extensions of code that already ships:

1. **Plain-English → YAML.** Operator types a sentence; the same Gemini
   pipeline that writes incident memos emits a candidate rule against the
   six primitives.
2. **Dry-run against the ledger.** Replay the last N days of real chains
   against a candidate rule. Show the diff before any DENY hits production.
3. **Traffic-mined rule suggestions.** Run in shadow for a week. Cluster
   the chains the gateway saw. Propose the rules the operator never
   thought to write.

See the landing page's § ROADMAP section for the cards each of these
points at (`backend/policy_engine.py`, `backend/endpoints/replay.py`,
`agent_behavior_baseline`).

---

## Credits

Built on **[Veea Lobster Trap](https://github.com/veeainc/lobstertrap)** — the
open-source DPI proxy that handles the model boundary. Gemini handles the
incident memo generation. The rest is Python, FastAPI, SQLAlchemy, JWT,
Next.js, Tailwind, and the smallest amount of D3 we could get away with.

MIT licensed. Single contributor (Patrick). Codebase walkable in one
afternoon — `plan.md`, `implementation.md`, and `demo_script_plan.md` at
repo root are the original design docs.
