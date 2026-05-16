"""Agent registration / listing. Reads from the active vertical's agents.yaml
and upserts rows into the `agents` table.

`is_dormant` is computed from `registered_days_ago` minus a "last seen"
heuristic — a shadow agent registered 92 days ago and idle counts as dormant.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.db import Agent, get_db, utcnow
from backend.policy_loader import get_active_agents, get_active_vertical

router = APIRouter()


@router.post("/register/sync")
async def sync_agents(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Upsert all agents defined in the active vertical's agents.yaml."""
    vertical = get_active_vertical()
    yaml_agents = get_active_agents()
    ws_manager = request.app.state.ws_manager

    synced: list[dict[str, Any]] = []
    for spec in yaml_agents:
        registered_days_ago = int(spec.get("registered_days_ago", 0))
        registered_at = utcnow() - timedelta(days=registered_days_ago)
        # Heuristic: a shadow agent or one not seen in 60+ days is dormant.
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
            agent = existing
        else:
            agent = Agent(
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
            )
            db.add(agent)
        synced.append({"id": agent.id, "role": agent.role, "is_dormant": agent.is_dormant})

    db.commit()
    await ws_manager.broadcast({"type": "agents_synced", "vertical": vertical, "count": len(synced)})
    return {"vertical": vertical, "agents": synced}


@router.get("/agents")
async def list_agents(db: Session = Depends(get_db)) -> dict[str, Any]:
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
