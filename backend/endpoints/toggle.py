"""Heimdall on/off toggle. When off, policy enforcement is bypassed for
the contrast scene in the demo (Scene 6: same attack, opposite outcome).
"""
from __future__ import annotations

from fastapi import APIRouter, Request

from backend.policy_loader import get_heimdall_enabled, set_heimdall_enabled

router = APIRouter()


@router.get("/heimdall/state")
async def state() -> dict:
    return {"enabled": get_heimdall_enabled()}


@router.post("/heimdall/{onoff}")
async def toggle(onoff: str, request: Request) -> dict:
    enabled = onoff.lower() in ("on", "true", "1", "enable", "enabled")
    set_heimdall_enabled(enabled)
    ws_manager = request.app.state.ws_manager
    await ws_manager.broadcast({"type": "heimdall_toggle", "enabled": enabled})
    return {"enabled": enabled}
