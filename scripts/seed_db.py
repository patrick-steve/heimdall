"""Pre-populate `agent_behavior_baseline` with synthetic history for each
non-shadow agent in each vertical.

Without this, the `behavioral_drift` rule won't fire — it requires
`min_history` (default 50) observations to compare against. Run once
before the demo:

    python -m scripts.seed_db

The seeded patterns reflect what each agent *normally* does:
  coordinator → delegates to data_fetcher and executor
  data_fetcher → leaf, no outbound delegations
  executor → leaf
  shadow → no history at all (so any delegation involving it is "novel")
"""
from __future__ import annotations

import random
import sys
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.db import (  # noqa: E402
    AgentBehaviorBaseline,
    SessionLocal,
    init_db,
    utcnow,
)
from backend.policy_loader import (  # noqa: E402
    AVAILABLE_VERTICALS,
    get_active_agents,
    set_active_vertical,
)


NORMAL_PATTERNS: dict[str, list[str]] = {
    "coordinator": ["data_fetcher", "executor"],
    "data_fetcher": [],
    "executor": [],
    "shadow": [],
}

HISTORY_PER_AGENT = 100


def seed_vertical(vertical: str) -> int:
    set_active_vertical(vertical)
    agents = get_active_agents()
    if not agents:
        return 0
    role_to_id = {a["role"]: a["id"] for a in agents}

    db = SessionLocal()
    inserted = 0
    try:
        # Wipe prior baselines for this vertical's agents so the script is idempotent.
        ids = [a["id"] for a in agents]
        if ids:
            db.query(AgentBehaviorBaseline).filter(
                AgentBehaviorBaseline.agent_id.in_(ids)
            ).delete(synchronize_session=False)

        for spec in agents:
            role = spec["role"]
            targets = NORMAL_PATTERNS.get(role, [])
            if not targets:
                continue
            for _ in range(HISTORY_PER_AGENT):
                target_role = random.choice(targets)
                target_id = role_to_id.get(target_role)
                if not target_id:
                    continue
                db.add(AgentBehaviorBaseline(
                    agent_id=spec["id"],
                    delegated_to=target_id,
                    action="legitimate_delegation",
                    chain_depth=random.randint(2, 3),
                    observed_at=utcnow() - timedelta(days=random.randint(1, 60)),
                ))
                inserted += 1
        db.commit()
    finally:
        db.close()
    return inserted


def main() -> None:
    init_db()
    total = 0
    for v in AVAILABLE_VERTICALS:
        try:
            n = seed_vertical(v)
            print(f"[seed] {v}: {n} baseline observations")
            total += n
        except FileNotFoundError:
            print(f"[seed] {v}: skipped (no agents.yaml yet)")
    print(f"[seed] done. {total} rows inserted.")


if __name__ == "__main__":
    main()
