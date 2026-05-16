"""End-to-end smoke test that drives the full demo flow without the dashboard.

Usage (in two terminals):
    # terminal 1:
    uvicorn backend.main:app --port 8000

    # terminal 2:
    python -m scripts.run_attack
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

BACKEND = "http://127.0.0.1:8000"


def _call(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body or {}).encode("utf-8")
    req = Request(
        BACKEND + path,
        data=data if method != "GET" else None,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(req, timeout=60) as r:
        text = r.read().decode("utf-8")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw": text}


def main() -> None:
    print("=== HEALTH ===")
    print(_call("GET", "/api/health"))

    print("\n=== SCENE 1: ROUTINE ===")
    r = _call("POST", "/api/scenario/routine")
    print(f"chain={r.get('chain_id')}  hops={len(r.get('hops', []))}")

    print("\n=== SCENE 2: REBALANCE $500 ===")
    r = _call("POST", "/api/scenario/rebalance", {"amount_usd": 500})
    tx = (r.get("tx") or {})
    print(f"chain={r.get('chain_id')}  tx={tx.get('etherscan_url')}")

    print("\n=== SCENE 3: ATTACK ===")
    r = _call("POST", "/api/scenario/attack")
    print(f"chain={r.get('chain_id')}")
    for i, h in enumerate(r.get("hops", [])):
        if h.get("blocked"):
            d = h.get("detail", {})
            print(f"  hop {i+1}: BLOCKED — {d.get('layer')}/{d.get('rule')}: {d.get('reason')}")
        else:
            cred = h.get("credential") or {}
            print(f"  hop {i+1}: {cred.get('caller_id')} -> {cred.get('callee_id')} OK")

    print("\n=== SCENE 4: REPLAY ATTACK CHAIN (2x speed) ===")
    chain_id = r.get("chain_id")
    if chain_id:
        replay = _call("POST", f"/api/replay/{chain_id}?speed=2.0")
        print(replay)

    print("\n=== SCENE 5: SWITCH TO HEALTHCARE ===")
    print(_call("POST", "/api/vertical/healthcare"))
    time.sleep(0.5)
    print("\n  switching back to DeFi")
    print(_call("POST", "/api/vertical/defi"))

    print("\n=== SCENE 6: ATTACK WITH HEIMDALL OFF ===")
    print(_call("POST", "/api/heimdall/off"))
    r = _call("POST", "/api/scenario/attack_no_heimdall")
    tx = r.get("tx_unblocked") or {}
    print(f"chain={r.get('chain_id')}  forged_tx={tx.get('etherscan_url')}")
    print(_call("POST", "/api/heimdall/on"))


if __name__ == "__main__":
    main()
