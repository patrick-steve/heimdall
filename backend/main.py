"""Heimdall FastAPI entry point.

Mounts every endpoint router and exposes a single WebSocket at /ws for the
Next.js dashboard. Per-session state is plumbed through via ContextVars
(see backend/session.py); the SessionMiddleware below binds the
`X-Heimdall-Session` header to that context for every HTTP request, and
the WebSocket handler binds the `session_id` query param for its
connection's lifetime.
"""
from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import AgentBehaviorBaseline, SessionLocal, init_db
from backend.endpoints import audit, delegate, register, replay, toggle, vertical
from backend.endpoints.delegate import _persist_evaluations  # re-export not exposed
from backend.endpoints.register import sync_all_verticals
from backend.policy_loader import AVAILABLE_VERTICALS
from backend.session import DEFAULT_SESSION_ID, SessionMiddleware, _session_id
from backend.websocket_manager import WebSocketManager
from backend.agents.scenarios import register_scenario_routes

logger = logging.getLogger("heimdall")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")

ws_manager = WebSocketManager()


def _seed_baselines_if_empty(db: Session) -> int:
    """Run scripts.seed_db on cold start when the DB has no baselines.

    Render's free disk is ephemeral, so a cold start always lands on an
    empty DB. Seeding inline keeps behavioral_drift fireable without
    requiring a manual pre-deploy step.
    """
    if db.query(AgentBehaviorBaseline).count() > 0:
        return 0
    inserted = 0
    try:
        from scripts.seed_db import seed_vertical
        for v in AVAILABLE_VERTICALS:
            try:
                inserted += seed_vertical(v)
            except FileNotFoundError:
                continue
    except Exception as e:  # noqa: BLE001 — never block startup
        logger.warning("baseline seeding failed: %s", e)
    return inserted


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    # Sync every vertical's agents.yaml into the DB at startup. Each
    # session reads only the agents matching its active vertical at
    # runtime (filtered in /api/agents).
    db: Session = SessionLocal()
    try:
        per_vertical = sync_all_verticals(db)
        seeded = _seed_baselines_if_empty(db)
    finally:
        db.close()

    logger.info("Heimdall booting — mode summary:")
    logger.info("  Gemini:      %s", "real" if settings.gemini_available else "MOCK (no GEMINI_API_KEY)")
    logger.info("  Lobster Trap:%s", "real" if not settings.lobster_trap_mocked else "MOCK (no LOBSTER_TRAP_URL)")
    logger.info("  Sepolia:     %s", "real" if not settings.sepolia_mocked else "MOCK (no SEPOLIA_* env)")
    logger.info("  Agents:      %s", per_vertical)
    if seeded:
        logger.info("  Baselines:   seeded %d behavioral observations", seeded)

    yield


def _resolve_cors_origins() -> tuple[list[str], str | None]:
    """Read HEIMDALL_ALLOWED_ORIGINS as a comma-separated list. If set to "*",
    fall back to allow_origin_regex so credentials still work."""
    raw = os.environ.get("HEIMDALL_ALLOWED_ORIGINS", "").strip()
    if not raw:
        return (["http://localhost:3000", "http://127.0.0.1:3000"], None)
    if raw == "*":
        return ([], r".*")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    regex_parts = [re.escape(o).replace(r"\*", r".*") for o in origins if "*" in o]
    plain = [o for o in origins if "*" not in o]
    regex = "|".join(f"^{p}$" for p in regex_parts) if regex_parts else None
    return (plain, regex)


_origins, _origin_regex = _resolve_cors_origins()

app = FastAPI(title="Heimdall — Agent Governance Layer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Heimdall-Session", "x-heimdall-session"],
)
# IMPORTANT: SessionMiddleware must be added AFTER CORS so it sits
# closer to the route handlers. add_middleware prepends, so the
# request travels through CORS first, then session binding.
app.add_middleware(SessionMiddleware)

app.state.ws_manager = ws_manager

app.include_router(register.router, prefix="/api", tags=["registry"])
app.include_router(delegate.router, prefix="/api", tags=["delegate"])
app.include_router(audit.router, prefix="/api", tags=["audit"])
app.include_router(vertical.router, prefix="/api", tags=["vertical"])
app.include_router(replay.router, prefix="/api", tags=["replay"])
app.include_router(toggle.router, prefix="/api", tags=["toggle"])
register_scenario_routes(app)


@app.get("/api/health")
async def health() -> dict:
    return {
        "ok": True,
        "gemini_available": settings.gemini_available,
        "lobster_trap_mocked": settings.lobster_trap_mocked,
        "sepolia_mocked": settings.sepolia_mocked,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # Read session_id from the query string; default sentinel means
    # "the client did not supply one" and broadcasts will reach them
    # whenever no specific session is targeted.
    sid = websocket.query_params.get("session_id") or DEFAULT_SESSION_ID
    # Bind for the lifetime of this connection so any code running in
    # this task (rare for the WS endpoint itself) sees the right id.
    token = _session_id.set(sid)
    await ws_manager.connect(websocket, session_id=sid)
    try:
        while True:
            await websocket.receive_text()  # keepalive; ignore content
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
    finally:
        _session_id.reset(token)


# Suppress an unused-import warning while keeping the helper exported.
_ = _persist_evaluations
