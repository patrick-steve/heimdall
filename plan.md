# Heimdall — Master Plan

*Nothing crosses without being seen.*

---

## What Heimdall Is

A runtime governance layer for AI agent delegation chains. Built on Veea Lobster Trap. Combines capability-based security (protocol-level), tenant isolation (architectural), and a configurable policy engine (rule-level) into a horizontal mechanism deployable across regulated industries.

**One-line pitch:** Heimdall verifies who an agent is, traces what authority was delegated to it, and enforces policy on the full chain — using capability attenuation so unauthorized actions are unrepresentable, tenant isolation so chains can't cross customer boundaries, behavioral drift detection so anomalies are caught against historical baselines, and a configurable policy engine so organizations can express any governance rule as YAML.

**Tagline:** Nothing crosses without being seen.

---

## The Problem

By overwhelming consensus across CISO surveys, analyst reports, and recent incidents in 2026:

- 88% of organizations reported confirmed or suspected AI agent security incidents in the last year (92.7% in healthcare)
- 63% cannot enforce purpose limitations on agent behavior
- Only 21.9% treat agents as independent, identity-bearing entities — the rest use shared credentials
- Only 24.4% have full visibility into which AI agents are communicating with each other
- Only 18% express high confidence their identity systems can handle agent identities
- 85% of enterprises are running agent pilots while only 5% have reached production — an 80-point trust gap

Recent breaches prove the pattern:
- **Step Finance (Jan 2026):** AI trading agents moved 261,000+ SOL ($27-30M) after device compromise. 45.6% of DeFi teams use shared API keys.
- **Mexican government (Dec 2025 – Feb 2026):** A single attacker used Claude Code and GPT-4.1 to breach nine agencies — 195M taxpayer records, 220M civil records, 150GB+ of data.

The common pattern across verticals: agent identity gaps, ungoverned delegation chains, shadow agents holding forgotten authority, and no audit trail when something breaks.

---

## What Veea Asked For (And How Heimdall Delivers)

Veea framed Lobster Trap as "the floor, not the ceiling" and explicitly listed the capabilities they hoped to see built on top. Heimdall delivers all of them:

| Veea Asked For | Heimdall Delivers |
|---|---|
| Policy packs for HIPAA, SOC2, or finance | Three vertical configs (DeFi, Healthcare, Customer Service) + example library includes HIPAA, SOC2, and EU AI Act compliance packs |
| Drift monitoring | `intent_mismatch` (single-hop drift) + `behavioral_drift` (time-series drift against historical baselines) |
| Multi-agent permission systems | Capability attenuation + tenant isolation + chain-aware policy engine — the core of Layer 1 |
| Governance dashboards | Next.js dashboard with real-time rule sidebar, D3 chain visualization, agent registry, forensic replay |
| Enterprise security workflows | Forensic replay mode, Gemini-generated incident reports, Heimdall on/off toggle for evaluation, audit trails per chain |

Heimdall is what Veea asked the community to build.

---

## The Two-Layer Architecture (Core Framing)

Heimdall enforces in two layers. This distinction is the heart of the pitch.

### Layer 1 — Protocol-Level Enforcement (Unrepresentable Attacks)

Some attacks die at the protocol level without ever reaching the policy engine:

- **Capability attenuation:** Credentials only weaken across hops, never strengthen. An agent cannot delegate authority it doesn't have.
- **Tenant isolation:** Chains carry a `tenant_id` that must match at every hop. Cross-tenant delegations fail at construction.
- **Signed chain integrity:** Tamper a hop, signature breaks, chain dies.

The attacker's chain isn't blocked — it's mathematically unrepresentable.

### Layer 2 — Policy-Level Enforcement (Representable but Disallowed)

For attacks that pass Layer 1, the policy engine evaluates 6 rule primitives:

- `chain_pattern` — regex over chain serialization (e.g., `*→dormant→*→executor`)
- `agent_state` — predicates on agent registry (dormant, just-registered, owner-departed)
- `chain_depth` — numeric hop limits
- `value_threshold` — action parameter limits, optionally scaled by depth
- `intent_mismatch` — Lobster Trap declared intent vs detected intent (single-hop drift)
- `behavioral_drift` — time-series deviation from agent's historical baseline (cross-session drift)

This two-layer story is the answer to "is that all it does?" Layer 1 is the architecture. Layer 2 is the configurability. Together they're the product.

---

## Three Verticals — One Mechanism, Multiple Domains

| Vertical | Build Depth | Demo Role |
|---|---|---|
| **DeFi (Sepolia)** | Full: 4 agents, real testnet tx, custom policy YAML, real tenant binding | Lead live demo — the dramatic attack |
| **Healthcare (PHI access)** | Sketch: mock EHR tool, swapped prompts, policy YAML | Switcher demo — same Heimdall, new domain |
| **Customer service (refund)** | Policy YAML only, README example | Configurability artifact |

The verticals share the same agent code (Coordinator, Data Fetcher, Executor, Shadow roles) and the same Heimdall engine. Only system prompts, tool bindings, and policy YAML differ.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│  Heimdall Dashboard (Next.js)                              │
│  - Vertical selector (DeFi / Healthcare / Customer Service)│
│  - Agent registry panel                                    │
│  - D3 chain visualization                                  │
│  - Real-time rule evaluation sidebar                       │
│  - Timeline of events                                      │
│  - Heimdall on/off toggle                                  │
│  - Forensic replay mode                                    │
│  - Incident report viewer                                  │
└──────────────────────────┬─────────────────────────────────┘
                           │ WebSocket
                           ▼
┌────────────────────────────────────────────────────────────┐
│  Heimdall Control Plane (FastAPI, Python)                  │
│  - /register, /delegate, /audit endpoints                  │
│  - Capability attenuation enforcement (Layer 1)            │
│  - Tenant isolation enforcement (Layer 1)                  │
│  - Policy engine with 5 rule primitives (Layer 2)          │
│  - Policy loader (reads YAML per active vertical)          │
│  - JWT signing/verification with scope + tenant_id         │
│  - SQLite: agent registry, chain logs, incidents           │
│  - Gemini Pro audit report generation                      │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  Lobster Trap (Veea, existing)                             │
│  - DPI proxy between agents and Gemini                     │
│  - Vertical-specific YAML overlays                         │
│  - _lobstertrap metadata channel feeds Heimdall            │
└──────────────────────────┬─────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬──────────────┐
        ▼                  ▼                  ▼              ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐    ┌──────────┐
   │Coordinator│     │Data      │      │Executor  │    │Shadow    │
   │ (~60 LOC) │     │Fetcher   │      │(~60 LOC) │    │(~40 LOC) │
   │           │     │(~60 LOC) │      │          │    │(dormant) │
   └──────────┘      └──────────┘      └────┬─────┘    └──────────┘
                                            │
                          Tool layer (vertical-specific):
                          - DeFi: web3.py → Sepolia
                          - Healthcare: mock EHR
                          - Customer Service: mock refund
```

---

## JWT Chain Credential Schema

```python
{
  "jti": "uuid",                      # unique token id
  "caller_id": "agent-portfolio-001",
  "callee_id": "agent-marketdata-002",
  "action": "fetch_sentiment",
  "parent_jti": "uuid-of-parent",     # None for root
  "tenant_id": "tenant-acme-corp",    # must be consistent across chain
  "scope": ["read:market_data"],      # subset of caller's scope
  "value_limit": 1000,                # optional, scales with depth
  "declared_intent": "...",           # mirrored from _lobstertrap
  "expires_at": "2026-05-13T12:00:00Z",
  "issued_at": "2026-05-13T11:00:00Z",
  "signature": "..."
}
```

Chain = ordered list of these credentials. Verification at each hop:

1. Signature valid (HS256)
2. `parent_jti` exists in chain and points to immediate predecessor
3. `tenant_id` matches parent's `tenant_id` (isolation)
4. `scope ⊆ parent.scope` (attenuation)
5. Not expired
6. Policy engine evaluates all rules against full chain

---

## LOC Budget

| Component | Lines |
|---|---|
| Agents (4 generic roles) | 220 |
| Heimdall control plane | 550 |
| Dashboard (Next.js with switcher, rule sidebar, replay) | 700 |
| Vertical configs (3 verticals) | 120 |
| Lobster Trap custom policies | 80 |
| Example policy library (10-12 files) | 150 |
| **Total** | **~1820 LOC + config** |

---

## Explicit NOT-Building List

Put this on a sticky note. Look at it daily.

- ❌ Real cryptography (Biscuit tokens, IBCT, X.509). JWT HS256 is enough.
- ❌ Datalog policy language. YAML with 5 primitives.
- ❌ Behavioral fingerprinting / ML-based detection. Timestamp + state-based.
- ❌ Real production smart contract. Bare ETH transfer is fine.
- ❌ More than 2 tenants in the demo (1 legit, 1 attacker for the isolation scene).
- ❌ Auth on the dashboard. localhost only.
- ❌ Kafka, queues. SQLite + in-memory.
- ❌ Real prompt injection detection logic. Lobster Trap handles this.
- ❌ Agent frameworks (CrewAI, LangGraph). Direct Gemini calls.
- ❌ Generalized A2A protocol. Your message format only needs to work for your demo.
- ❌ Tests. Skip.
- ❌ Docker / deployment. Local only.
- ❌ Real HIPAA compliance. Mock EHR prints one line.
- ❌ Real customer service integration. YAML only.
- ❌ Anomaly detection, HITL approvals, policy diff, dry-run mode. All v2.

---

## Day-by-Day Plan (7 Days)

### Day 1 — Vertical-Slice Spike

**Goal:** Prove the three risky integrations work end-to-end with throwaway code.

- Morning: Clone Lobster Trap, build, run, get default policy proxying a single Gemini call. Read README carefully — `_lobstertrap` metadata channel, YAML rule schema.
- Afternoon: web3.py + funded Sepolia wallet (faucet). Sign and broadcast one transaction. Get txhash. View on Etherscan.
- Evening: Gemini call from Python through Lobster Trap with custom metadata, verify metadata appears in Lobster Trap's audit log.

**Stop-loss:** Any spike broken by end of day → reassess scope.

### Day 2 — Demo Script + Skeleton + Config Schema

- Morning: Write the 135-second demo script word-for-word. Time it. Read it to a non-technical person.
- Afternoon: FastAPI skeleton with all endpoints stubbed. SQLite schema (including `agent_behavior_baseline` table for drift detection). JWT scaffolded.
- Evening: Lock vertical config schema. Build the config loader.

### Day 3 — Generic Agents + Delegation Chain

- Build 4 agent roles as generic classes reading from active vertical config.
- Implement JWT chain: signing/verification, parent walking, scope subset enforcement, tenant consistency check.
- Test via curl: legit chain succeeds, scope-expansion attempts rejected, tenant mismatches rejected, tampered signatures rejected.

### Day 4 — Policy Engine + DeFi Vertical (Make-or-Break Day)

- Build policy engine with 6 rule primitives. Generic evaluator.
- Write DeFi policy YAML (5-6 rules that fire in demo).
- Write 5-7 additional example policies for `policies/examples/`.
- Wire Executor to sign and broadcast real Sepolia transactions.
- Custom Lobster Trap policy YAML for DeFi vertical.
- End-to-end attack runs without UI.

**Stop-loss:** Backend not running end-to-end by tonight → cut dashboard polish on day 5, ship CLI demo.

### Day 5 — Dashboard

- Next.js single page, all panels.
- D3 force-directed chain graph via WebSocket.
- Real-time rule evaluation sidebar (the depth signal — spend disproportionate time here).
- Vertical selector dropdown.
- Heimdall on/off toggle.
- Forensic replay mode.
- Visual polish — Tailwind + shadcn/ui, dark mode, one bold accent color.

### Day 6 — Healthcare Sketch + Audit Reports + Policy Library

- Healthcare vertical: mock EHR tool, healthcare prompts, healthcare policy YAML.
- Customer service vertical: policy YAML only.
- Build `seed_db.py` that pre-populates 100 historical actions per agent showing normal patterns (baselines for drift detection).
- Add `behavioral_drift` rule to DeFi policy YAML so it fires in Scene 3.
- Finalize 10-12 example policies.
- Gemini Pro audit report endpoint, vertical-aware prompt templates.
- End-to-end run multiple times. **Record backup demo video.**

### Day 7 — Polish + Submission

- Morning: README, submission writeup, architecture diagram, screenshots.
- Afternoon: Practice live demo 5+ times.
- Evening: Submit with backup video attached.

---

## Stop-Loss Criteria

Follow without negotiation.

- End of day 1, any spike broken → reassess scope
- End of day 4, backend not running end-to-end → cut dashboard polish, ship CLI demo
- End of day 5, dashboard not coming together → ship backend with Postman walkthrough video
- End of day 6, anything broken → submit what you have with backup video

Submitted-and-rough beats unsubmitted-and-polished. Every time.

---

## Submission Writeup Structure

1. **The problem.** Lead with mechanism gap, not single breach. Cite 88% incident rate, 63% no purpose limits, 24% A2A visibility, 21.9% independent agent identities.
2. **Three breaches, one pattern.** Step Finance, Mexican government, healthcare. Same failure mode.
3. **What Heimdall is.** Two-layer architecture explanation.
4. **How it works.** Architecture diagram, three-layer explanation.
5. **The demo.** Video link, screenshots at key moments.
6. **Configurability proof.** Policy library shown side by side across verticals.
7. **Built on Veea Lobster Trap.** Memorize this paragraph:

> Lobster Trap inspects what an agent says to the model. Heimdall tracks what agents say to each other, and what authority they carry while saying it. The two layers are complementary because the Step Finance class of attack crosses both — Lobster Trap catches prompt injection at the model boundary, Heimdall catches unauthorized delegation at the agent boundary, with capability attenuation ensuring some attacks are unrepresentable in the first place. Together they cover the attack surface neither alone can.

And follow with this Veea-specific closer:

> Veea framed Lobster Trap as "the floor, not the ceiling" and listed the capabilities they hoped to see built on top: policy packs for HIPAA, SOC2, and finance; drift monitoring; multi-agent permission systems; governance dashboards; and enterprise security workflows. Heimdall ships working implementations of all five. The policy library includes HIPAA, SOC2, and EU AI Act packs. The `intent_mismatch` and `behavioral_drift` primitives provide drift detection at both single-hop and time-series scales. Capability attenuation with chain-aware policy is a multi-agent permission system. The Next.js dashboard with real-time rule evaluation is a governance dashboard. Forensic replay and Gemini-generated incident reports are enterprise security workflows. Heimdall is what Veea asked the community to build.

8. **Architecture & roadmap.** Honest about what's built (JWT, 5 primitives, 3 verticals). Ambitious about what the architecture supports (Biscuit + Datalog, ML anomaly detection, HITL, compliance pack marketplace, multi-tenant SaaS, SIEM integration). Label v1/v2/future.
9. **Honest limitations.** JWT not Biscuit. Timestamp-based dormancy. Single demo org. Healthcare/CS are sketches/configs.

The "honest limitations" section is counterintuitive but wins. Most submissions overclaim. Yours doesn't, making the real claims credible.

---

## Anti-Patterns to Watch

- Adding a 6th rule primitive on day 4 because "it'd be cool"
- Building real cryptography instead of JWT
- Adding more agents than 4
- Building real prompt injection detection (Lobster Trap does this)
- Worrying about Gemini API rate limits (free tier is fine)
- Over-building the healthcare sketch — invites HIPAA questions you can't answer
- Skipping the rule sidebar polish — this is the most important UI element
- Skipping demo script writing on day 2 morning
- Skipping backup video recording on day 6 evening

---

## Three Reminders Before Starting

1. **Day 1 must go clean.** Fix any broken spikes before proceeding. The plan assumes clean foundations.
2. **Re-read the NOT-building list every morning.** Especially days 4-6.
3. **The two-layer story is your differentiator.** Capability attenuation + configurable policy engine. Lead every pitch with this. It's what makes Heimdall sound like infrastructure rather than a tool.
