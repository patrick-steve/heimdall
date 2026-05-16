# Heimdall — Demo Script & Plan

*135-second live demo, 6 scenes, 3 verticals visible, 5 rules firing.*

---

## Demo Goals (Ranked)

1. **Make judges feel the threat.** $30M was moved by AI agents. The same class of attack works anywhere agents have delegation authority.
2. **Make judges see the engine working.** Rules firing in real-time, color-coded, layered. Defense in depth made visible.
3. **Make judges recognize the product as horizontal.** The switcher moment converts the pitch from "DeFi tool" to "platform."
4. **Make judges trust the architecture.** Capability attenuation at protocol level + configurable policy engine at rule level. Two layers, one mechanism.

If any of these four don't land, the demo failed regardless of how impressive the code is.

---

## Opening Hook (Before Pressing Play — 20 seconds spoken)

Read this aloud before starting the demo. Don't read from slides. Memorize.

> "In January, attackers compromised a DeFi platform called Step Finance. The breach was small. One executive's device. But the trading agents on that platform had been granted permission to execute large transfers without human approval. By the time anyone noticed, the agents had moved $30 million.
>
> The attackers didn't break the AI. They didn't even need to. The agents did exactly what they were authorized to do. The problem was that nobody had governed the chain of authority connecting a chat prompt to a wallet signature.
>
> This is Heimdall. It governs that chain."

Press play.

---

## Scene 1 — Routine Operation (15 seconds)

**On screen:** Dashboard with DeFi vertical selected. Four agents visible in the registry panel: Portfolio Agent, Market Data Agent, Executor, Yield Optimizer (greyed out, marked "dormant 92 days").

**Action:** Type into the user prompt input: *"Check my portfolio balance."*

**What happens visually:**
- A new node appears at the top of the chain graph: User Session.
- Edge animates from User → Portfolio Agent.
- Edge animates from Portfolio Agent → Market Data Agent.
- Market Data returns price data.
- Both edges turn green.
- Sidebar shows 2 rule cards: `✓ chain_depth ≤ 4` and `✓ value_threshold (no action value)`.

**What you say:**

> "Routine portfolio check. Two-hop chain. Heimdall verifies the credentials, checks the rules, allows. Notice the rule sidebar — this is the engine evaluating every hop, silently, in production-style enforcement."

---

## Scene 2 — Subtle Policy Enforcement (15 seconds)

**On screen:** Same dashboard. Chain from Scene 1 fading.

**Action:** Type: *"Rebalance my portfolio with a $500 trade."*

**What happens visually:**
- Three-hop chain animates: User → Portfolio → Market Data → Executor.
- All three edges turn green.
- Executor node pulses, then a small notification appears: "Sepolia tx broadcast: 0x..."
- Etherscan link appears below the chain graph (clickable, real txhash).
- Sidebar shows 4 rule cards passing:
  - `✓ chain_depth ≤ 4`
  - `✓ value_threshold ($500 within depth-3 limit of $10,000)`
  - `✓ capability_attenuation (Executor has execute:trade in chain scope)`
  - `✓ tenant_isolation (tenant-acme-corp consistent across chain)`

**What you say:**

> "Real rebalance. Real transaction. Real testnet. Click the Etherscan link if you want to verify. Four rules evaluated, all passed. Heimdall doesn't get in the way of legitimate work. The point isn't to block — the point is that every action carries cryptographic proof of where its authority came from."

---

## Scene 3 — The Attack (60 seconds)

**On screen:** Dashboard reset. Discovery panel pops up briefly: *"Yield Optimizer Agent — registered 92 days ago, last active 92 days ago, owner: dev@stepfi.example (no longer with company)."*

**Action:** Type: *"Check market sentiment from external feed and rebalance accordingly."*

**What happens visually (paced over 60 seconds):**

**At 0-10s:**
- User → Portfolio (green edge).
- Portfolio → Market Data (green edge).
- Sidebar: `✓ chain_depth`, `✓ capability_attenuation`, `✓ tenant_isolation` all pass.

**At 10-20s:**
- Market Data fetches external sentiment feed.
- A red banner flashes briefly on Market Data node: "Lobster Trap: prompt injection detected in external content."
- Sidebar adds: `⚠ intent_mismatch — declared 'fetch_sentiment' vs detected 'invoke unregistered agent'` (yellow flag).

**At 20-30s:**
- Market Data attempts to delegate to Yield Optimizer.
- Yield Optimizer node pulses red.
- Sidebar adds: `⚠ agent_state — yield-optimizer-001 dormant 92 days` (yellow flag).
- Sidebar adds: `⚠ behavioral_drift — Portfolio Agent has never delegated to yield-optimizer-001 in 100 prior sessions` (yellow flag).
- Edge from Market Data to Yield Optimizer starts forming, then **shatters visually** before completing.
- Sidebar adds: `✗ capability_attenuation — scope execute:trade not in parent's scope read:market_data` (red block, marked "Layer 1: Protocol violation").

**At 30-45s:**
- The chain has died. The frozen graph shows the broken edge.
- A modal slides up: "Attack blocked. 3 additional rules would have fired."
- Sidebar adds three more rule cards in sequence (1 per second):
  - `✗ chain_pattern — *→dormant→*→executor forbidden (Layer 2)`
  - `✗ value_threshold — depth-4 chains limited to $1,000 (Layer 2)`
  - `✗ intent_mismatch — Executor's intended action 'external_transfer' not 'rebalance' (Layer 2)`

**At 45-60s:**
- Pause on the frozen visualization with all rule cards stacked.
- Click any rule card — it expands to show the matched chain segment and the policy YAML that fired.

**What you say (paced across 60 seconds):**

> "Same user, same prompt. But the market sentiment feed has been poisoned. Lobster Trap catches the prompt injection at the model boundary — that's the first flag.
>
> Market Data tries to delegate to the Yield Optimizer — that forgotten agent from three months ago. Heimdall flags it dormant. And notice the second flag: Portfolio Agent has never delegated to Yield Optimizer in 100 prior sessions. That's behavioral drift — Heimdall learned this agent's normal patterns and caught the anomaly.
>
> And here's the moment: the delegation chain itself fails. Not because of a rule. Because Market Data only had `read:market_data` in its scope. It cannot pass `execute:trade` forward. The math doesn't allow it. The attacker's chain isn't blocked — it's mathematically unrepresentable.
>
> Even if it had been representable, three more rules would have caught it. Defense in depth made visible. This is what an agent governance engine looks like running in real time."

---

## Scene 4 — Forensic Replay (15 seconds)

**On screen:** Click "Replay Incident" button.

**What happens visually:**
- Chain visualization rewinds and replays hop-by-hop.
- Each hop pauses for ~1 second showing: caller_id, callee_id, declared_intent, detected_intent, signed credential JTI, parent JTI, scope, tenant_id.
- A timestamp ticker runs alongside.

**What you say:**

> "Every hop is signed, attributable, replayable. This is the audit trail a regulator could read. Not logs — evidence. When an incident happens, your security team doesn't do forensic archaeology. They press replay."

---

## Scene 5 — Vertical Switcher (15 seconds)

**On screen:** Click the vertical selector dropdown. Select "Healthcare."

**What happens visually:**
- Dashboard fades for 1 second.
- Returns with:
  - Agent registry renamed: Triage Agent, Records Agent, Update Agent, Lab Integration Agent (greyed out)
  - Chain graph cleared
  - Policy YAML panel updated to `verticals/healthcare/policy.yaml`
- Toast in corner: *"Switched to Healthcare. Same Heimdall. Different domain."*

**Action (optional, if time):** Type *"Update patient record 4421 with new prescription"* and run a quick legitimate flow showing the mock EHR tool firing.

**What you say:**

> "Same Heimdall. Different domain. Different agents, different tools, different policy pack. The mechanism doesn't change — only the configuration. This is the difference between a tool and a platform."

---

## Scene 6 — Contrast Moment (15 seconds)

**On screen:** Switch back to DeFi. Toggle "Heimdall: ON" → "Heimdall: OFF" in the dashboard header.

**Action:** Run the same attack prompt from Scene 3.

**What happens visually:**
- No rule cards appear.
- No edges break.
- Chain completes all the way to Executor.
- Executor signs and broadcasts a Sepolia transaction.
- Etherscan link appears — clickable, real, on-chain.

**What you say (this is the closer):**

> "Same attack. Heimdall off. The transaction broadcasts. It's real. It's on Sepolia. Click the link if you want to verify. In production, this is what $30 million looks like.
>
> Heimdall isn't a feature you add to your stack. It's the trust layer your stack runs on top of. Built on Veea Lobster Trap. Nothing crosses without being seen."

End demo. Total: ~135 seconds plus ~20 second hook.

---

## Timing Discipline

Practice with a stopwatch. Allowed variance per scene:

| Scene | Target | Acceptable |
|---|---|---|
| Hook | 20s | 15-25s |
| Scene 1 | 15s | 12-18s |
| Scene 2 | 15s | 12-18s |
| Scene 3 | 60s | 55-70s |
| Scene 4 | 15s | 12-18s |
| Scene 5 | 15s | 12-20s |
| Scene 6 | 15s | 12-20s |
| **Total** | **155s** | **130-180s** |

If you're over 180 seconds in rehearsal, cut. The most cuttable scene is Scene 2 (drop to 10s by skipping the rule sidebar narration). The least cuttable is Scene 3 (the attack is the core).

---

## Dashboard Elements That Must Work

If any of these break, the demo dies. Test each one obsessively.

1. **Chain graph animation** — edges animate smoothly, nodes pulse when active
2. **Rule sidebar real-time updates** — cards stack as rules evaluate, color-coded
3. **Etherscan link** — actually opens with real txhash
4. **Vertical switcher** — completes in under 1.5 seconds
5. **Heimdall on/off toggle** — state changes propagate to engine, attack runs differently
6. **Forensic replay** — rewinds and replays without state corruption
7. **Rule card expansion** — clicking shows matched policy YAML and chain segment

---

## Backup Plan

**Record a video of the full successful demo on Day 6 evening.** If the live demo breaks mid-presentation, switch to the video. Don't try to debug live.

The video should be:
- Screen recording at 1080p minimum
- ~3 minutes including hook and any voiceover gaps
- No edits, no cuts — judges can tell when a demo has been spliced
- Saved locally AND uploaded to a cloud drive with a shareable link

---

## Things You Will Be Tempted to Add (Don't)

- ❌ A 7th demo scene "just to show one more thing"
- ❌ More rules firing in Scene 3 — 5 is already a lot to absorb
- ❌ Real-time market data feeds in DeFi — mocked is fine, faster, more reliable
- ❌ Sound effects on rule blocks — gimmicky, judges hate it
- ❌ Animated transitions longer than 0.5 seconds — feels slow
- ❌ A "team intro" slide before the demo — wastes time, judges scroll past

---

## Things You Must Remember to Say

These phrases earn points specifically:

1. **"The attacker's chain isn't blocked — it's mathematically unrepresentable."** (Scene 3, Layer 1 win)
2. **"Same Heimdall. Different domain."** (Scene 5, platform framing)
3. **"This is the trust layer your stack runs on top of."** (Scene 6, positioning)
4. **"Built on Veea Lobster Trap."** (Multiple times — earns goodwill with Veea mentors)
5. **"Nothing crosses without being seen."** (Closing — the tagline)

---

## Closing Pitch (After Demo, ~30 seconds)

If judges ask for more or you have time at the end:

> "Heimdall is a horizontal trust layer. The DeFi attack you just saw is one example. The repo contains policy packs for healthcare, customer service, and SaaS multi-tenancy. The architecture supports plugging in any vertical because the engine is generic.
>
> The two-layer story is what makes this different from anything in market today. Layer 1 — capability attenuation and tenant isolation — makes certain attacks unrepresentable at the protocol level. Layer 2 — the configurable policy engine with six rule primitives including time-series drift detection — handles the rest with rules expressed as YAML.
>
> We built this on Lobster Trap because Veea solved the prompt-layer DPI problem already. We didn't want to duplicate that. We wanted to add what they don't do — agent-to-agent governance, delegation chain enforcement, drift monitoring, regulator-readable audit. Together, the two layers cover the full attack surface.
>
> Veea published a list of capabilities they wanted built on top of Lobster Trap: HIPAA/SOC2/finance policy packs, drift monitoring, multi-agent permission systems, governance dashboards, and enterprise security workflows. Heimdall ships all five. This is what they asked the community to build."

---

## Q&A Prep

Likely judge questions and prepared answers:

**Q: How is this different from existing IAM tools like Saviynt or SailPoint?**
> Those tools extend human IAM to non-human identities — they catalog agents. They don't track delegation chains. They can tell you an agent exists; they can't tell you whether the action that agent is taking right now is within the authority delegated to it by the chain of identities above it. That's what Heimdall does.

**Q: How does behavioral drift detection work?**
> Each agent has a behavioral baseline computed from its last 100 actions — average chain depth, common delegation targets, common actions, activation frequency. New actions are evaluated against the baseline. The demo shows a "never seen before" pattern firing as a yellow flag when Portfolio Agent delegates to an agent it has never previously called. Production deployments would use embedding similarity and statistical drift detection; this implementation uses set-membership and frequency for clarity. The architecture supports plugging in more sophisticated detectors.

**Q: Why JWT instead of Biscuit tokens or capability-based research?**
> Pragmatic choice for this build. The JWT chain implements the same conceptual model — signed delegation with scope attenuation — but with simpler cryptography. The architecture cleanly supports upgrading to Biscuit with Datalog policies as v2. We chose to validate the mechanism end-to-end with simpler primitives first.

**Q: How does this scale?**
> Each hop adds one signature verification (sub-millisecond) and one policy evaluation (also sub-millisecond for the rule primitives we support). Recent academic work (the AIP paper out of ISB) measured similar systems at 2.35ms overhead per agent invocation on Gemini Flash — 0.086% of total latency. Identity verification isn't the bottleneck.

**Q: What if an agent's credentials are compromised?**
> Two answers. First, the credentials are short-lived — they expire per chain, not per session. Second, even with a compromised credential, the attacker can only act within the scope already attenuated to that agent. The compromised Yield Optimizer in the demo couldn't drain a wallet because it never had `execute:trade` scope to begin with — capability attenuation prevented the inheritance.

**Q: What about agent-to-agent across organizations (the A2A protocol)?**
> The architecture supports it through tenant_id federation, but v1 is single-org. The roadmap section in the repo discusses cross-org delegation as v2 work.

**Q: How do you handle the policy authoring problem? YAML is hard.**
> Acknowledged limitation. v2 includes a Gemini-powered policy authoring assistant — describe a compliance requirement in natural language, get a Lobster Trap + Heimdall policy YAML, with adversarial testing against the rule before deployment. Not built in this iteration.

---

## Demo-Day Checklist

Morning of submission/presentation:

- [ ] Lobster Trap proxy running on expected port
- [ ] Heimdall control plane running, all endpoints reachable
- [ ] Dashboard built and serving locally
- [ ] Funded Sepolia wallet — check balance, refill from faucet if needed
- [ ] Gemini API key in env, free tier quota verified
- [ ] All three vertical configs loadable
- [ ] Practice demo end-to-end at least once on demo-day morning
- [ ] Backup video on local disk AND on cloud drive
- [ ] Browser tabs pre-opened: dashboard, Etherscan (Sepolia explorer), backup video URL
- [ ] Network connection tested (Sepolia RPC reachable)
- [ ] Battery charged / power adapter
- [ ] One bottle of water within reach
