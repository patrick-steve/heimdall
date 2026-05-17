"""Basic two-hop delegation.

Demonstrates the happy path: user → research_agent → search_agent.
Both hops succeed because each child's capabilities are a subset of its
parent's.

Usage:
    HEIMDALL_API_KEY=hd_test_... python 01_basic_delegation.py
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
        first = hd.delegate(
            from_agent="user",
            to_agent="research_agent",
            action="read:data",
            capabilities=["read:data", "read:market"],
            declared_intent="User asked: what's Tesla's Q4 outlook?",
        )
        print(f"hop 1: {first.decision} (depth={first.depth}, chain={first.chain_id[:8]})")
        assert first.allowed, "first hop should be allowed"

        second = hd.delegate(
            parent_credential=first.credential,
            from_agent="research_agent",
            to_agent="search_agent",
            action="read:market",
            capabilities=["read:market"],
            declared_intent="Fetching Tesla earnings call transcript",
        )
        print(f"hop 2: {second.decision} (depth={second.depth})")
        assert second.allowed, "second hop should be allowed — scope shrinks"

        print(f"\nchain {first.chain_id[:8]} authorised through 2 hops.")


if __name__ == "__main__":
    main()
