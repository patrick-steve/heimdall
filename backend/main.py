"""Heimdall FastAPI entry point.

Mounts every endpoint router and exposes a single WebSocket at /ws for the
Next.js dashboard. Initialises SQLite + active vertical agents at startup.
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
from backend.endpoints.register import sync_agents
from backend.policy_loader import AVAILABLE_VERTICALS, set_active_vertical
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

    # Default vertical: DeFi. Seed its agent registry so the dashboard has
    # something to render before the user picks anything.
    set_active_vertical("defi")
    db: Session = SessionLocal()
    try:
        class _FakeRequest:
            app = app
        await sync_agents(_FakeRequest(), db)  # type: ignore[arg-type]
        seeded = _seed_baselines_if_empty(db)
    finally:
        db.close()

    # Log mock-mode banner so it's obvious at startup which subsystems are real.
    logger.info("Heimdall booting — mode summary:")
    logger.info("  Gemini:      %s", "real" if settings.gemini_available else "MOCK (no GEMINI_API_KEY)")
    logger.info("  Lobster Trap:%s", "real" if not settings.lobster_trap_mocked else "MOCK (no LOBSTER_TRAP_URL)")
    logger.info("  Sepolia:     %s", "real" if not settings.sepolia_mocked else "MOCK (no SEPOLIA_* env)")
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
        # Credentials require an explicit origin, not "*". Use a regex that
        # matches anything; the browser will echo back the requesting origin.
        return ([], r".*")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    # Translate `*.vercel.app` style globs into a regex.
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
    allow_headers=["*"],
)

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
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keepalive; ignore content
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# Suppress an unused-import warning while keeping the helper exported.
_ = _persist_evaluations
