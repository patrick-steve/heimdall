# Heimdall — Policies

> How the two-layer model works and how to author rules.

## The two layers

Heimdall enforces in two layers, deliberately separate:

**Layer 1 — Protocol.** Cryptographic. Hard-coded in `backend/jwt_chain.py`.
A child credential can only ever have a subset of its parent's scope and
must stay in the same tenant. This is **unrepresentable** behaviour: there
is no way for a child agent to obtain a capability its parent didn't carry,
no policy file, no toggle — the signature simply isn't emitted.

**Layer 2 — Policy.** Configurable. Six rule primitives, each a pure
function over a chain. New rules are YAML files, not code. When a rule
fires DENY, the chain is rejected; FLAG keeps it running but lights up the
dashboard and the audit trail.

In every flow, Layer 1 runs first. Layer 2 only sees chains the protocol
already accepted.

---

## The six primitives

Each primitive lives in `backend/policy_engine.py` and takes the same shape:

```yaml
policies:
  - name: <your name for the rule>
    type: <one of the six primitives>
    config:
      ...primitive-specific keys...
    on_violation: DENY | FLAG    # default DENY
```

### 1. `chain_pattern`

Regex over the chain serialised as `caller_id → ... → callee_id`. Use
`match_by: role` to match on agent role instead of id.

```yaml
- name: phi_external_egress_block
  type: chain_pattern
  config:
    match_by: role
    pattern: ".*->shadow->.*executor"
  on_violation: DENY
```

Catches: every chain whose role sequence contains a shadow-account hop
followed by any executor.

### 2. `agent_state`

Tiny predicate over the agent registry — `is_dormant`, `owner_departed`,
`just_registered`.

```yaml
- name: dormant_agent_block
  type: agent_state
  config:
    condition: "is_dormant == true"
  on_violation: DENY
```

Catches: someone reviving a long-idle agent (a classic exfil-via-old-creds
pattern).

### 3. `chain_depth`

Numeric hop limit. The simplest rule.

```yaml
- name: max_chain_depth
  type: chain_depth
  config:
    max: 6
  on_violation: DENY
```

Catches: pathological chains. Legitimate agents almost never need >5 hops.

### 4. `value_threshold`

Action value cap, optionally scaled by chain depth. The deeper the chain,
the smaller the allowed value — counterintuitive but empirically correct:
legitimate high-value actions are direct.

```yaml
- name: value_threshold_by_depth
  type: value_threshold
  config:
    thresholds:
      - {depth: 2, max_value: 100000}
      - {depth: 3, max_value: 10000}
      - {depth: 4, max_value: 1000}
  on_violation: DENY
```

Catches: the wire-the-money-through-six-agents pattern.

### 5. `intent_mismatch`

Compares the agent's `declared_intent` to the upstream DPI's `detected_intent`
via Jaccard similarity over tokens. Below the threshold → fire.

```yaml
- name: declared_intent_mismatch
  type: intent_mismatch
  config:
    threshold_similarity: 0.3
  on_violation: FLAG
```

This is where the Veea Lobster Trap integration shines. The agent says
"fetch market sentiment", Lobster Trap sees "invoke agent with elevated
scope", and the overlap is 0.0 — the rule fires before any executor moves.

### 6. `behavioral_drift`

Set-membership check against `AgentBehaviorBaseline`. If an agent suddenly
starts delegating to targets it has never used before, fire.

```yaml
- name: novel_chain_pattern
  type: behavioral_drift
  config:
    window_hops: 1   # how far back to compare
  on_violation: FLAG
```

Catches: account takeover. A compromised agent will exercise scopes its
behavioural baseline never showed.

---

## The example library

Twelve packs live under `policies/examples/`. Most are single-rule
illustrations; the three `compliance_pack_*` files bundle the rules that
operationalise a real-world framework:

| File                              | What it demonstrates                                          |
|-----------------------------------|---------------------------------------------------------------|
| `chain_depth_limit.yaml`          | the simplest rule — max hops                                  |
| `credential_scope_attenuation.yaml` | Layer 1 in YAML form (always on; this is the explicit copy) |
| `cross_tenant_isolation.yaml`     | tenant-aware `chain_pattern`                                  |
| `value_threshold_by_depth.yaml`   | depth-scaled value caps                                       |
| `declared_intent_mismatch.yaml`   | the Lobster Trap integration rule                             |
| `dormant_agent_block.yaml`        | revived agents                                                |
| `novel_chain_pattern.yaml`        | behavioural drift                                             |
| `pii_boundary.yaml`               | block PII fields from leaving the tenant                      |
| `after_hours_restriction.yaml`    | temporal rule via `chain_pattern`                             |
| `compliance_pack_hipaa.yaml`      | five rules mapped to HIPAA §164.* sections                    |
| `compliance_pack_soc2.yaml`       | SOC 2 CC6/CC7 controls                                        |
| `compliance_pack_eu_ai_act.yaml`  | EU AI Act risk-tier obligations                               |

---

## Loading custom policies

Today, policies are loaded per-vertical from
`verticals/<vertical>/policies.yaml`. To add your own:

1. Drop a YAML file into the vertical you care about (or use the `custom`
   vertical for org-specific rules).
2. Restart the backend, or hit `POST /api/policies/reload` if the toggle
   endpoint is enabled in your build.
3. The dashboard's policy panel will show your rule alongside the built-ins.

Org-bound policy loading (so two orgs sharing one Heimdall install can have
different rulesets) is a phase-2 feature; today, every org served by a
single backend sees the same policy.yaml.

---

## Authoring tips

- **Name rules after the violation, not the implementation.** A regex hidden
  behind `phi_external_egress_block` reads better in an audit log than one
  called `chain_pattern_03`.
- **Default to DENY.** FLAG exists for cases where you genuinely want the
  chain to run while operators investigate; everything else should DENY.
- **Stack rules.** A compliance pack is just five primitives with carefully
  chosen configs. The primitives are simple on purpose so the combinations
  are testable.
- **Run them through the dashboard before shipping.** Toggle Heimdall off,
  reproduce the scenario, toggle back on, watch the rule card light up.
  If it doesn't, the regex is wrong; the engine itself is small enough to
  read in one sitting.
