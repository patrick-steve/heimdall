"""Agent registration / listing.

Refactored for per-session state: every vertical's agents.yaml is synced
into the DB once at startup. Each session reads only its own active
vertical via the policy_loader (which is itself session-keyed). The
`/api/register/sync` endpoint re-syncs the caller's current vertical
on demand; it is otherwise idempotent and rarely needed at runtime.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

import yaml
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import Agent, get_db, utcnow
from backend.policy_loader import (
    AVAILABLE_VERTICALS,
    get_active_agents,
    get_active_vertical,
)

router = APIRouter()


def _agents_yaml_for(vertical: str) -> list[dict[str, Any]]:
    path = settings.REPO_ROOT / "verticals" / vertical / "agents.yaml"
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return list(data.get("agents", []))


def _upsert(db: Session, vertical: str, specs: list[dict[str, Any]]) -> int:
    count = 0
    for spec in specs:
        registered_days_ago = int(spec.get("registered_days_ago", 0))
        registered_at = utcnow() - timedelta(days=registered_days_ago)
        is_dormant = bool(spec.get("dormant", False)) or registered_days_ago >= 60

        existing = db.query(Agent).filter_by(id=spec["id"]).first()
        if existing:
            existing.display_name = spec["display_name"]
            existing.tenant_id = spec["tenant_id"]
            existing.vertical = vertical
            existing.owner = spec.get("owner", "")
            existing.scope = spec.get("scope", [])
            existing.role = spec["role"]
            existing.registered_at = registered_at
            existing.is_dormant = is_dormant
        else:
            db.add(Agent(
                id=spec["id"],
                display_name=spec["display_name"],
                tenant_id=spec["tenant_id"],
                vertical=vertical,
                owner=spec.get("owner", ""),
                scope=spec.get("scope", []),
                role=spec["role"],
                registered_at=registered_at,
                last_active_at=registered_at,
                is_dormant=is_dormant,
            ))
        count += 1
    db.commit()
    return count


def sync_all_verticals(db: Session) -> dict[str, int]:
    """Called once at startup. Idempotent. Per-vertical row counts returned."""
    result: dict[str, int] = {}
    for v in AVAILABLE_VERTICALS:
        result[v] = _upsert(db, v, _agents_yaml_for(v))
    return result


@router.post("/register/sync")
async def sync_agents(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Re-sync the caller's current vertical from YAML."""
    vertical = get_active_vertical()
    yaml_agents = get_active_agents()
    ws_manager = request.app.state.ws_manager
    count = _upsert(db, vertical, yaml_agents)
    await ws_manager.broadcast({"type": "agents_synced", "vertical": vertical, "count": count})
    return {
        "vertical": vertical,
        "agents": [{"id": s["id"], "role": s["role"]} for s in yaml_agents],
    }


@router.get("/agents")
async def list_agents(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Return agents for the caller's active vertical only."""
    vertical = get_active_vertical()
    rows = db.query(Agent).filter_by(vertical=vertical).all()
    return {
        "vertical": vertical,
        "agents": [
            {
                "id": a.id,
                "display_name": a.display_name,
                "role": a.role,
                "tenant_id": a.tenant_id,
                "owner": a.owner,
                "scope": a.scope,
                "is_dormant": a.is_dormant,
                "registered_at": a.registered_at.isoformat() if a.registered_at else None,
                "last_active_at": a.last_active_at.isoformat() if a.last_active_at else None,
            }
            for a in rows
        ],
    }
