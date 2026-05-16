# Customer Service Vertical (YAML-only)

This vertical is intentionally shipped as policy-only. There is no
`agents.yaml`, `prompts.yaml`, or `tools.py` here — it exists to
demonstrate that the Heimdall policy engine is configurable independent
of any code change.

## How an integrator would plug this in

1. Drop `agents.yaml` defining your CS agents (e.g. `triage-bot`,
   `account-bot`, `refund-issuer`, `escalation-handler`).
2. Drop `prompts.yaml` with system prompts per role.
3. Drop `tools.py` exporting a `TOOLS` dict mapping action names to async
   callables (e.g. `issue_refund(amount_usd: int) -> dict`).
4. The policy in `policy.yaml` already enforces:
   - Chain depth ≤ 4
   - Dormant-handler block (e.g. bot accounts whose owner has churned)
   - Refund amount caps by depth (escalation = lower cap, the opposite
     of a normal IAM "promote-on-escalation" pattern)
   - Forbidden bot→executor patterns
   - Intent mismatch (Lobster Trap declared vs detected)
   - Behavioral drift against baseline

Switching to this vertical at runtime is the same one-call dropdown
the dashboard offers — `POST /api/vertical/customer_service`.
