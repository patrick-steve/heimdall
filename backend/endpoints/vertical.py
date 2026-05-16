"""Switch active vertical at runtime.

POST /api/vertical/{name} sets the global active vertical and re-syncs
that vertical's agent registry. Frontend calls this when the user picks
DeFi / Healthcare / Customer Service in the selector dropdown.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.endpoints.register import sync_agents
from backend.policy_loader import (
    AVAILABLE_VERTICALS,
    get_active_policies,
    get_active_vertical,
    set_active_vertical,
)

router = APIRouter()


@router.get("/vertical")
async def current_vertical() -> dict:
    return {"active": get_active_vertical(), "available": AVAILABLE_VERTICALS}


@router.post("/vertical/{name}")
async def switch_vertical(name: str, request: Request, db: Session = Depends(get_db)) -> dict:
    if name not in AVAILABLE_VERTICALS:
        raise HTTPException(status_code=404, detail=f"Unknown vertical: {name}")

    set_active_vertical(name)
    sync_result = await sync_agents(request, db)

    ws_manager = request.app.state.ws_manager
    await ws_manager.broadcast({"type": "vertical_switched", "vertical": name})

    return {
        "active": name,
        "agents": sync_result["agents"],
        "policy_count": len(get_active_policies()),
    }
