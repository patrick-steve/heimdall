"""Iterate the chain ledger and pull an incident report.

After running the other examples to populate some chains, this script
shows how to retrieve them and inspect what fired.

Usage:
    HEIMDALL_API_KEY=hd_test_... python 03_chain_audit.py
"""
import os
import sys

from heimdall import Heimdall

# Heimdall returns reason strings that include math symbols (⊆) and unicode
# arrows. Make the console resilient on Windows / non-UTF-8 terminals.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main() -> None:
    api_key = os.environ.get("HEIMDALL_API_KEY")
    if not api_key:
        raise SystemExit("Set HEIMDALL_API_KEY (your hd_test_... or hd_live_... key).")

    base_url = os.environ.get("HEIMDALL_URL", "http://localhost:8000")

    with Heimdall(api_key=api_key, base_url=base_url) as hd:
        chains = hd.list_chains(limit=10)
        print(f"{len(chains)} recent chain(s):\n")
        for c in chains:
            print(f"  [{c.status:>7}] {c.chain_id[:8]}  {c.hop_count} hop(s)  {c.head_caller} -> {c.head_callee}")

        if not chains:
            return

        target = next((c for c in chains if c.status == "denied"), chains[0])
        detail = hd.get_chain(target.chain_id)
        print(f"\nchain {target.chain_id[:8]} ({target.status}):")
        for hop in detail["hops"]:
            print(f"  hop: {hop.from_agent} -> {hop.to_agent}  action={hop.action}  scope={hop.scope}")
        for ev in detail["evaluations"]:
            mark = {"ALLOW": "ok ", "FLAG": "!  ", "DENY": "x  "}.get(ev["result"], "   ")
            print(f"  {mark} [{ev['layer']:>8}] {ev['rule']:<28}  {ev.get('reason', '')}")

        # If you've also POSTed /api/audit/report/{chain_id} you can pull the
        # Markdown incident report:
        report = hd.get_audit(target.chain_id)
        if report.exists:
            print(f"\nincident report (severity={report.severity}):")
            print(report.report)
        else:
            print("\nNo incident report yet for this chain.")


if __name__ == "__main__":
    main()
