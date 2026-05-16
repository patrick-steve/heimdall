"""Forensic replay: rewinds a chain hop-by-hop over WebSocket so the
dashboard can visualise the attack frame-by-frame.

Supports speed multipliers (1x / 2x / 4x) for Scene 4 polish.
"""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import ChainCredential, RuleEvaluation, get_db

router = APIRouter()

BASE_HOP_DELAY_S = 1.0


@router.get("/replay/chains")
async def list_chains(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Returns distinct chain_ids visible to the current session, newest first."""
    from backend.session import current_session_id
    sid = current_session_id()
    rows = (
        db.query(ChainCredential)
        .filter(ChainCredential.session_id == sid)
        .order_by(ChainCredential.issued_at.desc())
        .all()
    )
    seen: dict[str, dict[str, Any]] = {}
    for r in rows:
        if r.chain_id not in seen:
            seen[r.chain_id] = {
                "chain_id": r.chain_id,
                "tenant_id": r.tenant_id,
                "hop_count": 0,
                "started_at": r.issued_at.isoformat() if r.issued_at else None,
                "head_caller": r.caller_id,
                "head_callee": r.callee_id,
            }
        seen[r.chain_id]["hop_count"] += 1
    return {"chains": list(seen.values())}


@router.get("/replay/{chain_id}")
async def get_chain(chain_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    creds = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id)
        .order_by(ChainCredential.issued_at)
        .all()
    )
    if not creds:
        raise HTTPException(status_code=404, detail="chain not found")

    evals = (
        db.query(RuleEvaluation)
        .filter_by(chain_id=chain_id)
        .order_by(RuleEvaluation.evaluated_at)
        .all()
    )

    return {
        "chain_id": chain_id,
        "credentials": [_serialise_cred(c) for c in creds],
        "evaluations": [_serialise_eval(e) for e in evals],
    }


@router.post("/replay/{chain_id}")
async def replay_chain(
    chain_id: str,
    request: Request,
    speed: float = 1.0,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Stream the chain hop-by-hop over WebSocket. `speed` is a multiplier:
    1.0 = real-time pacing, 2.0 = twice as fast, 4.0 = four times as fast."""
    creds = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id)
        .order_by(ChainCredential.issued_at)
        .all()
    )
    if not creds:
        raise HTTPException(status_code=404, detail="chain not found")

    evals_by_chain = (
        db.query(RuleEvaluation)
        .filter_by(chain_id=chain_id)
        .order_by(RuleEvaluation.evaluated_at)
        .all()
    )

    ws_manager = request.app.state.ws_manager
    speed = max(0.25, min(8.0, speed))
    delay = BASE_HOP_DELAY_S / speed

    await ws_manager.broadcast({"type": "replay_start", "chain_id": chain_id, "speed": speed})

    for i, cred in enumerate(creds):
        await ws_manager.broadcast({
            "type": "replay_hop",
            "chain_id": chain_id,
            "hop_index": i,
            "credential": _serialise_cred(cred),
        })
        await asyncio.sleep(delay)

    for ev in evals_by_chain:
        await ws_manager.broadcast({
            "type": "replay_evaluation",
            "chain_id": chain_id,
            "evaluation": _serialise_eval(ev),
        })
        await asyncio.sleep(delay * 0.3)

    await ws_manager.broadcast({"type": "replay_end", "chain_id": chain_id})
    return {"chain_id": chain_id, "hops_replayed": len(creds), "speed": speed}


def _serialise_cred(c: ChainCredential) -> dict[str, Any]:
    return {
        "jti": c.jti,
        "parent_jti": c.parent_jti,
        "caller_id": c.caller_id,
        "callee_id": c.callee_id,
        "action": c.action,
        "tenant_id": c.tenant_id,
        "scope": c.scope,
        "value_limit": c.value_limit,
        "declared_intent": c.declared_intent,
        "detected_intent": c.detected_intent,
        "issued_at": c.issued_at.isoformat() if c.issued_at else None,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "chain_id": c.chain_id,
    }


def _serialise_eval(e: RuleEvaluation) -> dict[str, Any]:
    return {
        "id": e.id,
        "rule_name": e.rule_name,
        "rule_type": e.rule_type,
        "layer": e.layer,
        "result": e.result,
        "reason": e.reason,
        "matched_segment": e.matched_segment,
        "evaluated_at": e.evaluated_at.isoformat() if e.evaluated_at else None,
    }
