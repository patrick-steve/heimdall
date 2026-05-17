"""Delegation endpoint: the heart of Layer 1 + Layer 2 enforcement.

Two flavours:

- POST /api/delegate/raw
    Construct + sign a single credential. Layer 1 violations raise 403
    immediately. Layer 2 policies are evaluated against the full chain
    reconstructed from chain_id.

- POST /api/scenario/{name}
    Orchestrates a full scenario (e.g. the Scene 3 attack) by chaining
    multiple raw delegations. See `backend.agents.scenarios`.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import current_org_id
from backend.db import ChainCredential, RuleEvaluation, get_db, utcnow
from backend.jwt_chain import (
    AttenuationViolation,
    ChainError,
    TenantMismatch,
    sign_credential,
)
from backend.policy_engine import evaluate_policies
from backend.policy_loader import get_active_policies, get_heimdall_enabled
from backend.session import current_session_id

router = APIRouter()


def _persist_cred(db: Session, cred: dict[str, Any]) -> ChainCredential:
    row = ChainCredential(
        jti=cred["jti"],
        parent_jti=cred.get("parent_jti"),
        caller_id=cred["caller_id"],
        callee_id=cred["callee_id"],
        action=cred["action"],
        tenant_id=cred["tenant_id"],
        scope=cred["scope"],
        value_limit=cred.get("value_limit"),
        declared_intent=cred.get("declared_intent"),
        detected_intent=cred.get("detected_intent"),
        signature=cred["signature"],
        chain_id=cred["chain_id"],
        issued_at=utcnow(),
        session_id=current_session_id(),
        org_id=current_org_id(),
    )
    db.add(row)
    db.commit()
    return row


async def _persist_evaluations(
    db: Session,
    ws_manager: Any,
    chain_id: str,
    rule_name: str,
    rule_type: str,
    layer: str,
    result: str,
    reason: str,
    matched_segment: str | None = None,
) -> None:
    db.add(RuleEvaluation(
        chain_id=chain_id,
        rule_name=rule_name,
        rule_type=rule_type,
        layer=layer,
        result=result,
        reason=reason,
        matched_segment=matched_segment,
        session_id=current_session_id(),
        org_id=current_org_id(),
    ))
    db.commit()
    await ws_manager.broadcast({
        "type": "rule_evaluation",
        "chain_id": chain_id,
        "rule_name": rule_name,
        "rule_type": rule_type,
        "layer": layer,
        "result": result,
        "reason": reason,
        "matched_segment": matched_segment,
    })


@router.post("/delegate/raw")
async def delegate_raw(
    payload: dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Construct one credential. Enforces Layer 1 at sign time; evaluates
    Layer 2 policies against the chain that includes this new hop.

    Required payload keys:
        caller_id, callee_id, action, tenant_id, scope (list[str])
    Optional:
        parent_jti, value_limit, declared_intent, chain_id
    """
    ws_manager = request.app.state.ws_manager

    caller_id = payload["caller_id"]
    callee_id = payload["callee_id"]
    action = payload["action"]
    tenant_id = payload["tenant_id"]
    scope = list(payload.get("scope") or [])
    parent_jti = payload.get("parent_jti")
    declared_intent = payload.get("declared_intent")
    detected_intent = payload.get("detected_intent")
    value_limit = payload.get("value_limit")
    chain_id = payload.get("chain_id")

    parent_row = None
    if parent_jti:
        parent_row = db.query(ChainCredential).filter_by(jti=parent_jti).first()
        if not parent_row:
            raise HTTPException(status_code=400, detail=f"parent_jti {parent_jti} not found")
        chain_id = parent_row.chain_id

    chain_id = chain_id or str(uuid.uuid4())
    heimdall_on = get_heimdall_enabled()

    # ---- Layer 1: protocol-level enforcement at construction ----
    try:
        new_cred = sign_credential(
            caller_id=caller_id,
            callee_id=callee_id,
            action=action,
            tenant_id=tenant_id,
            scope=scope,
            parent_jti=parent_jti,
            parent_scope=list(parent_row.scope) if parent_row else None,
            parent_tenant_id=parent_row.tenant_id if parent_row else None,
            value_limit=value_limit,
            declared_intent=declared_intent,
            chain_id=chain_id,
        )
    except AttenuationViolation as e:
        await _persist_evaluations(
            db, ws_manager, chain_id,
            rule_name="capability_attenuation",
            rule_type="protocol_attenuation",
            layer="protocol",
            result="DENY",
            reason=str(e),
            matched_segment=f"{caller_id}→{callee_id}",
        )
        if heimdall_on:
            raise HTTPException(status_code=403, detail={
                "layer": "protocol",
                "rule": "capability_attenuation",
                "reason": str(e),
            })
        # Heimdall off: forge the credential anyway (the demo's "what if" mode).
        new_cred = _forge_unsafe_credential(
            caller_id, callee_id, action, tenant_id, scope,
            parent_jti, value_limit, declared_intent, chain_id,
        )
    except TenantMismatch as e:
        await _persist_evaluations(
            db, ws_manager, chain_id,
            rule_name="tenant_isolation",
            rule_type="protocol_tenant",
            layer="protocol",
            result="DENY",
            reason=str(e),
            matched_segment=f"{caller_id}@{tenant_id}",
        )
        if heimdall_on:
            raise HTTPException(status_code=403, detail={
                "layer": "protocol",
                "rule": "tenant_isolation",
                "reason": str(e),
            })
        new_cred = _forge_unsafe_credential(
            caller_id, callee_id, action, tenant_id, scope,
            parent_jti, value_limit, declared_intent, chain_id,
        )
    except ChainError as e:
        raise HTTPException(status_code=400, detail=str(e))

    new_cred["detected_intent"] = detected_intent
    _persist_cred(db, new_cred)

    # Successful Layer 1 hop → emit positive evaluations so the dashboard
    # shows green cards too.
    await _persist_evaluations(
        db, ws_manager, chain_id,
        rule_name="capability_attenuation",
        rule_type="protocol_attenuation",
        layer="protocol",
        result="ALLOW",
        reason=f"scope ⊆ parent scope",
        matched_segment=f"{caller_id}→{callee_id}",
    )
    await _persist_evaluations(
        db, ws_manager, chain_id,
        rule_name="tenant_isolation",
        rule_type="protocol_tenant",
        layer="protocol",
        result="ALLOW",
        reason=f"tenant {tenant_id} consistent",
        matched_segment=tenant_id,
    )

    # ---- Layer 2: policy engine ----
    chain = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id)
        .order_by(ChainCredential.issued_at)
        .all()
    )
    evaluations = []
    if heimdall_on:
        evaluations = evaluate_policies(chain, get_active_policies(), db)
        for ev in evaluations:
            await ws_manager.broadcast({
                "type": "rule_evaluation",
                "chain_id": chain_id,
                "rule_name": ev.rule_name,
                "rule_type": ev.rule_type,
                "layer": ev.layer,
                "result": ev.result,
                "reason": ev.reason,
                "matched_segment": str(ev.matched_segment) if ev.matched_segment else None,
            })

    denied = [e for e in evaluations if e.result == "DENY"]
    if denied:
        raise HTTPException(status_code=403, detail={
            "layer": "policy",
            "violations": [{"rule": e.rule_name, "reason": e.reason} for e in denied],
            "credential": new_cred,
        })

    await ws_manager.broadcast({
        "type": "delegation",
        "chain_id": chain_id,
        "caller_id": caller_id,
        "callee_id": callee_id,
        "action": action,
        "scope": scope,
        "declared_intent": declared_intent,
        "detected_intent": detected_intent,
        "value_limit": value_limit,
        "depth": len(chain),
    })

    return {
        "credential": new_cred,
        "chain_id": chain_id,
        "depth": len(chain),
        "evaluations": [
            {
                "rule_name": e.rule_name,
                "rule_type": e.rule_type,
                "layer": e.layer,
                "result": e.result,
                "reason": e.reason,
            }
            for e in evaluations
        ],
    }


def _forge_unsafe_credential(
    caller_id: str,
    callee_id: str,
    action: str,
    tenant_id: str,
    scope: list[str],
    parent_jti: str | None,
    value_limit: int | None,
    declared_intent: str | None,
    chain_id: str,
) -> dict[str, Any]:
    """Bypass attenuation/tenant checks (only when Heimdall is OFF).
    Demonstrates the "no governance" baseline in Scene 6."""
    from backend.jwt_chain import sign_credential_unsafe
    return sign_credential_unsafe(
        caller_id=caller_id,
        callee_id=callee_id,
        action=action,
        tenant_id=tenant_id,
        scope=scope,
        parent_jti=parent_jti,
        value_limit=value_limit,
        declared_intent=declared_intent,
        chain_id=chain_id,
    )
