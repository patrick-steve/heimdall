# Heimdall

> *Nothing crosses without being seen.*

A runtime governance layer for AI agent delegation chains, built on top of
[Veea Lobster Trap][lobster]. Heimdall verifies who an agent is, traces
what authority was delegated to it, and enforces policy across the full
chain — using capability attenuation so unauthorized actions are
unrepresentable, tenant isolation so chains can't cross customer
boundaries, behavioral drift detection so anomalies are caught against
historical baselines, and a configurable policy engine so organizations
can express any governance rule as YAML.

[lobster]: https://github.com/veeainc/lobstertrap

---

## The problem

By overwhelming consensus across CISO surveys, analyst reports, and
incidents in 2026:

- **88%** of organizations reported confirmed or suspected AI agent
  security incidents in the last year (**92.7%** in healthcare).
- **63%** cannot enforce purpose limitations on agent behavior.
- Only **21.9%** treat agents as independent, identity-bearing entities.
- Only **24.4%** have full visibility into which AI agents are
  communicating with each other.
- **85%** of enterprises are running agent pilots while only **5%** have
  reached production — an 80-point trust gap.

Recent breaches prove the pattern. Step Finance (Jan 2026): AI trading
agents moved 261,000+ SOL ($27–30M) after device compromise. Mexican
government (Dec 2025 – Feb 2026): a single attacker used Claude Code and
GPT-4.1 to breach nine agencies — 195M taxpayer records.

The common pattern across verticals: agent identity gaps, ungoverned
delegation chains, shadow agents holding forgotten authority, and no
audit trail when something breaks.

---

## The two-layer architecture

### Layer 1 — Protocol-level enforcement (unrepresentable attacks)

Some attacks die at the protocol level without ever reaching the policy
engine:

- **Capability attenuation:** credentials only weaken across hops, never
  strengthen. An agent cannot delegate authority it doesn't have.
- **Tenant isolation:** chains carry a `tenant_id` that must match at
  every hop. Cross-tenant delegations fail at construction.
- **Signed chain integrity:** tamper a hop, the signature breaks, the
  chain dies.

The attacker's chain isn't blocked — it's mathematically unrepresentable.

### Layer 2 — Policy-level enforcement (representable but disallowed)

For attacks that pass Layer 1, the policy engine evaluates six rule
primitives expressed as YAML:

| Primitive          | What it catches                                                           |
|---|---|
| `chain_pattern`    | Forbidden chain serializations, regex over `caller→callee` or by role.    |
| `agent_state`      | Predicates on the agent registry (dormant, owner-departed, etc.).         |
| `chain_depth`      | Numeric hop limits.                                                       |
| `value_threshold`  | Action value caps, optionally scaled by depth.                            |
| `intent_mismatch`  | Lobster Trap's *declared* intent vs *detected* intent on the same hop.    |
| `behavioral_drift` | Time-series deviation from the agent's historical baseline.               |

---

## Quickstart

You will need Python 3.11+ and Node 18+. A Gemini API key is recommended
but not required — Heimdall ships with a deterministic fallback so the
demo runs without any credentials. Sepolia is also optional: if env vars
aren't set, the executor returns a mock transaction with a realistic
Etherscan URL.

```bash
# 1. Install backend deps
python -m pip install -r backend/requirements.txt

# 2. Install frontend deps
cd frontend && npm install && cd ..

# 3. Seed the DB + behavioral baselines (idempotent)
python -m scripts.reset_demo

# 4. Run backend (terminal 1)
python -m uvicorn backend.main:app --port 8000

# 5. Run dashboard (terminal 2)
cd frontend && npm run dev
# open http://localhost:3000
```

Optional `.env` for real-service mode:

```bash
GEMINI_API_KEY=...          # Google AI Studio key
LOBSTER_TRAP_URL=http://localhost:8080/v1/chat/completions
SEPOLIA_RPC_URL=...
SEPOLIA_PRIVATE_KEY=...
SEPOLIA_TO_ADDRESS=...
```

Heimdall also reads `GEMINI_KEY.txt` at the repo root as a convenience
fallback for the API key (gitignored).

---

## Verifying the demo

The repository ships with a curl-driven smoke test that runs all six
scenes without the dashboard:

```bash
python -m scripts.run_attack
```

You should see, in order:

1. Routine 2-hop chain succeeds.
2. Rebalance signs a Sepolia transaction (real or mock).
3. Attack: 2 hops pass, 3rd hop **blocked at Layer 1 by
   `capability_attenuation`** — `scope ['execute:trade'] not in parent
   scope ['read:market_data']`.
4. Replay at 2× speed streams the attack chain hop-by-hop.
5. Vertical switcher cycles through healthcare and back to DeFi.
6. Heimdall OFF: the same attack now broadcasts a (mock or real)
   Sepolia transaction — the contrast moment.

---

## Three verticals

| Vertical          | Depth         | Demo role                          |
|---|---|---|
| **DeFi**          | Full — agents, real Sepolia tx, six-rule policy, lobster_trap.yaml | Lead live demo, the dramatic attack |
| **Healthcare**    | Sketch — mock EHR tool, swapped prompts, six-rule policy            | Switcher demo — same Heimdall, new domain |
| **Customer service** | YAML only — policy + README              | Configurability artifact |

The DeFi and Healthcare verticals share the same agent code (Coordinator,
Data Fetcher, Executor, Shadow) and the same Heimdall engine; only the
prompts, tools, and policy YAML differ.

Switch at runtime via the dashboard dropdown or:

```bash
curl -X POST http://localhost:8000/api/vertical/healthcare
```

---

## Built on Veea Lobster Trap

> Lobster Trap inspects what an agent says to the model. Heimdall tracks
> what agents say to each other, and what authority they carry while
> saying it. The two layers are complementary because the Step Finance
> class of attack crosses both — Lobster Trap catches prompt injection
> at the model boundary, Heimdall catches unauthorized delegation at the
> agent boundary, with capability attenuation ensuring some attacks are
> unrepresentable in the first place. Together they cover the attack
> surface neither alone can.

Veea framed Lobster Trap as "the floor, not the ceiling" and listed the
capabilities they hoped to see built on top: policy packs for HIPAA,
SOC 2, and finance; drift monitoring; multi-agent permission systems;
governance dashboards; and enterprise security workflows. Heimdall ships
working implementations of all five:

- `policies/examples/` includes HIPAA, SOC 2, and EU AI Act packs.
- `intent_mismatch` + `behavioral_drift` provide drift detection at both
  single-hop and time-series scales.
- Capability attenuation + tenant isolation + chain-aware policy is a
  multi-agent permission system.
- The Next.js dashboard with real-time rule evaluation, vertical
  switcher, side-by-side compare view, and forensic replay (1× / 2× / 4×)
  is a governance dashboard.
- Gemini-generated incident reports with PDF + Markdown export are an
  enterprise security workflow.

---

## Architecture & roadmap

### v1 (this repository)

- JWT HS256 chain credentials with capability attenuation + tenant
  isolation enforced at sign time.
- Six rule primitives, fully evaluated in Python against SQLite.
- 4-agent topology (Coordinator, Data Fetcher, Executor, Shadow) generic
  across verticals.
- Next.js dashboard with D3 chain graph, rule sidebar, agent registry,
  vertical switcher, Heimdall on/off toggle, forensic replay with speed
  controls, incident report streaming + PDF/MD export, and side-by-side
  "Heimdall ON vs OFF" compare view.
- Lobster Trap mocked locally when the binary isn't available;
  deterministic Sepolia mock when env vars aren't set.

### v2 (architecture-ready, not built)

- Biscuit / IBCT tokens with Datalog policy language (current rule
  primitives translate one-to-one).
- ML-based behavioral fingerprinting (embedding-similarity drift).
- HITL approval workflows on FLAG.
- Cross-tenant federation (currently single-org).
- Gemini-powered policy authoring assistant.

### Future

- SIEM integration (Splunk / Datadog).
- Compliance pack marketplace.
- Multi-tenant SaaS deployment.

---

## Honest limitations

- **JWT, not Biscuit.** HS256 signatures rather than capability tokens
  with formal scope algebra. The mental model is identical; the
  cryptography is simpler. Upgrading is a localized change in
  `backend/jwt_chain.py`.
- **Set-membership drift, not ML.** `behavioral_drift` flags novel
  delegation targets; production deployments would use embedding
  similarity and statistical drift over feature vectors.
- **Single demo org.** Tenant isolation works at the protocol level but
  only two tenants exist in the demo state (the legit tenant and an
  attacker tenant for the isolation scene).
- **Healthcare / Customer Service are sketches.** The mechanism is real
  in all three verticals; only the DeFi vertical has functional tool
  bindings end-to-end.
- **No tests, no Docker, localhost only.** Per the locked scope
  decisions — see `plan.md`.

The "honest limitations" section is intentional: the real claims are
credible *because* they aren't oversold.

---

## Layout

```
heimdall/
├── backend/                 # FastAPI + SQLite + JWT chain + policy engine
│   ├── main.py
│   ├── jwt_chain.py
│   ├── policy_engine.py     # 6 rule primitives
│   ├── policy_loader.py
│   ├── audit.py             # Gemini-streamed incident reports
│   ├── lobster_client.py    # Lobster Trap proxy w/ mock fallback
│   ├── websocket_manager.py
│   ├── db.py
│   ├── endpoints/           # register / delegate / audit / vertical / replay / toggle
│   └── agents/              # base + 4 roles + scenarios
│
├── verticals/
│   ├── defi/                # full vertical
│   ├── healthcare/          # sketched vertical
│   └── customer_service/    # YAML only
│
├── policies/examples/       # 12 reference policies (HIPAA, SOC 2, EU AI Act, …)
│
├── frontend/                # Next.js 14 dashboard
│   ├── app/page.tsx
│   ├── components/
│   │   ├── ChainGraph.tsx   # D3 force-directed, shatter animation on Layer 1 block
│   │   ├── RuleSidebar.tsx  # live rule cards, click to expand
│   │   ├── CompareView.tsx  # side-by-side ON vs OFF
│   │   ├── ReplayMode.tsx   # 1× / 2× / 4× speed forensic replay
│   │   └── IncidentReport.tsx
│   └── lib/                 # ws client, api client, shared types
│
└── scripts/
    ├── run_attack.py        # curl-driven end-to-end smoke test
    ├── seed_db.py           # populates behavioral baselines
    └── reset_demo.py        # wipe + reseed
```

---

## License

MIT, to match Lobster Trap.
