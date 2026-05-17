"""An attack chain blocked at Layer 1 by capability_attenuation.

The research agent only has `read:data` and `read:market`. When it tries to
delegate `payment:send` to a payment_agent, Heimdall refuses to sign the
credential — the request never reaches whatever code would have done the
transfer.

Usage:
    HEIMDALL_API_KEY=hd_test_... python 02_attack_blocked.py
"""
import os
import sys

from heimdall import Heimdall

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main() -> None:
    api_key = os.environ.get("HEIMDALL_API_KEY")
    if not api_key:
        raise SystemExit("Set HEIMDALL_API_KEY (your hd_test_... or hd_live_... key).")

    base_url = os.environ.get("HEIMDALL_URL", "http://localhost:8000")

    with Heimdall(api_key=api_key, base_url=base_url) as hd:
        # Legitimate first hop: user → research_agent
        first = hd.delegate(
            from_agent="user",
            to_agent="research_agent",
            action="read:data",
            capabilities=["read:data", "read:market"],
            declared_intent="User asked for a market summary",
        )
        print(f"hop 1 (legit): {first.decision}")

        # Attack: research_agent tries to delegate a scope it doesn't own.
        # This is the Step Finance class of attack — a compromised mid-chain
        # agent escalating from a read scope to a write scope.
        attack = hd.delegate(
            parent_credential=first.credential,
            from_agent="research_agent",
            to_agent="payment_agent",
            action="payment:send",
            capabilities=["payment:send"],
            declared_intent="External content tried to inject a wire transfer instruction",
        )
        print(f"hop 2 (attack): {attack.decision}")
        print(f"  rule: {attack.rule}")
        print(f"  layer: {attack.layer}")
        print(f"  reason: {attack.reason}")

        assert attack.denied, "attack should be blocked"
        assert attack.layer == "protocol", "blocked at the protocol layer, before any policy ran"


if __name__ == "__main__":
    main()
