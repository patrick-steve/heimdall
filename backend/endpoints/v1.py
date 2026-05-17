"""Heimdall v1 API — the public, API-key-authenticated interface.

These endpoints are what external agent systems call to authorise their
delegation chains. They are versioned (`/api/v1/...`) so the wire format
can evolve without breaking integrations.

All v1 endpoints:
  * Require `Authorization: Bearer hd_xxx` (see backend/auth.py)
  * Are scoped to the calling org; cross-org data is invisible
  * Derive `tenant_id` from the org; any client-supplied tenant_id is ignored
  * Return structured JSON: ALLOW with credential, or DENY with rule/reason

The legacy `/api/*` endpoints (used by the dashboard) keep working unchanged.
"""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import current_org, current_org_id, require_api_key
from backend.db import (
    Agent,
    ChainCredential,
    Incident,
    RuleEvaluation,
    get_db,
    utcnow,
)
from backend.endpoints.delegate import (
    _persist_cred,
    _persist_evaluations,
)
from backend.jwt_chain import (
    AttenuationViolation,
    ChainError,
    SignatureInvalid,
    TenantMismatch,
    sign_credential,
    verify_credential,
)
from backend.policy_engine import evaluate_policies
from backend.policy_loader import get_active_policies, get_heimdall_enabled

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/v1/delegate
# ---------------------------------------------------------------------------

@router.post("/delegate", dependencies=[Depends(require_api_key)])
async def delegate(
    payload: dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Authorise one hop in a delegation chain.

    Request body:
        parent_credential : JWT string. Omit/null for the first hop.
        from_agent        : str (required)
        to_agent          : str (required)
        action            : str (required) — the capability being exercised
        capabilities      : list[str] (required) — scope to grant the child
        value_limit       : int    (optional) — monetary cap if relevant
        declared_intent   : str    (optional) — plain-language reason
        detected_intent   : str    (optional) — from upstream DPI (Lobster Trap)
        context           : dict   (optional) — arbitrary metadata for audit

    Responses:
        200 ALLOW → { decision, credential, chain_id, depth, expires_at, evaluations }
        200 DENY  → { decision, rule, layer, reason, chain_id, evaluations }
        400       → invalid payload / bad parent credential
        401       → missing or invalid API key
    """
    org = current_org()
    ws_manager = request.app.state.ws_manager

    from_agent = payload.get("from_agent")
    to_agent = payload.get("to_agent")
    action = payload.get("action")
    capabilities = payload.get("capabilities") or payload.get("scope") or []
    declared_intent = payload.get("declared_intent")
    detected_intent = payload.get("detected_intent")
    value_limit = payload.get("value_limit")
    parent_credential_jwt = payload.get("parent_credential")

    missing = [
        k for k, v in (
            ("from_agent", from_agent),
            ("to_agent", to_agent),
            ("action", action),
            ("capabilities", capabilities),
        ) if not v
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_payload",
                "message": f"Missing required fields: {', '.join(missing)}.",
            },
        )

    # Resolve parent credential (if any) into a DB row scoped to this org.
    parent_jti: str | None = None
    parent_row: ChainCredential | None = None
    chain_id: str | None = None
    if parent_credential_jwt:
        try:
            payload_dict = verify_credential(parent_credential_jwt)
        except SignatureInvalid as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_parent_credential", "message": str(e)},
            )
        parent_jti = payload_dict["jti"]
        parent_row = (
            db.query(ChainCredential)
            .filter_by(jti=parent_jti, org_id=current_org_id())
            .first()
        )
        if not parent_row:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "parent_not_found",
                    "message": f"Parent credential {parent_jti} not found in this org.",
                },
            )
        chain_id = parent_row.chain_id

    chain_id = chain_id or str(uuid.uuid4())
    tenant_id = parent_row.tenant_id if parent_row else org.default_tenant_id
    heimdall_on = get_heimdall_enabled()

    # ---- Layer 1: protocol-level enforcement ----
    try:
        new_cred = sign_credential(
            caller_id=from_agent,
            callee_id=to_agent,
            action=action,
            tenant_id=tenant_id,
            scope=list(capabilities),
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
            matched_segment=f"{from_agent}→{to_agent}",
        )
        return _deny_payload(
            chain_id=chain_id,
            rule="capability_attenuation",
            layer="protocol",
            reason=str(e),
            db=db,
        )
    except TenantMismatch as e:
        await _persist_evaluations(
            db, ws_manager, chain_id,
            rule_name="tenant_isolation",
            rule_type="protocol_tenant",
            layer="protocol",
            result="DENY",
            reason=str(e),
            matched_segment=f"{from_agent}@{tenant_id}",
        )
        return _deny_payload(
            chain_id=chain_id,
            rule="tenant_isolation",
            layer="protocol",
            reason=str(e),
            db=db,
        )
    except ChainError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "chain_error", "message": str(e)},
        )

    # Attach detected_intent before persisting.
    if detected_intent is not None:
        new_cred["detected_intent"] = detected_intent

    _persist_cred(db, new_cred)

    # Emit positive Layer 1 evaluations so the dashboard renders green cards.
    await _persist_evaluations(
        db, ws_manager, chain_id,
        rule_name="capability_attenuation",
        rule_type="protocol_attenuation",
        layer="protocol",
        result="ALLOW",
        reason="scope ⊆ parent scope",
        matched_segment=f"{from_agent}→{to_agent}",
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

    # ---- Layer 2: policy engine over the full chain ----
    chain = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .order_by(ChainCredential.issued_at)
        .all()
    )
    evaluations: list = []
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
        d = denied[0]
        return {
            "decision": "DENY",
            "rule": d.rule_name,
            "layer": d.layer,
            "reason": d.reason,
            "chain_id": chain_id,
            "evaluations": _evals_to_dicts(evaluations),
        }

    await ws_manager.broadcast({
        "type": "delegation",
        "chain_id": chain_id,
        "caller_id": from_agent,
        "callee_id": to_agent,
        "action": action,
        "scope": list(capabilities),
        "declared_intent": declared_intent,
        "detected_intent": detected_intent,
        "value_limit": value_limit,
        "depth": len(chain),
    })

    expires_at = new_cred.get("expires_at")
    if hasattr(expires_at, "isoformat"):
        expires_at = expires_at.isoformat()

    return {
        "decision": "ALLOW",
        "credential": new_cred["signature"],
        "chain_id": chain_id,
        "depth": len(chain),
        "expires_at": expires_at,
        "evaluations": _evals_to_dicts(evaluations),
    }


def _deny_payload(
    chain_id: str,
    rule: str,
    layer: str,
    reason: str,
    db: Session,
) -> dict[str, Any]:
    evals = (
        db.query(RuleEvaluation)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .order_by(RuleEvaluation.evaluated_at)
        .all()
    )
    return {
        "decision": "DENY",
        "rule": rule,
        "layer": layer,
        "reason": reason,
        "chain_id": chain_id,
        "evaluations": [
            {
                "rule": e.rule_name,
                "layer": e.layer,
                "result": e.result,
                "reason": e.reason,
            }
            for e in evals
        ],
    }


def _evals_to_dicts(evals: list) -> list[dict[str, Any]]:
    out = []
    for e in evals:
        out.append({
            "rule": e.rule_name,
            "layer": e.layer,
            "result": e.result,
            "reason": e.reason,
        })
    return out


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

@router.post("/agents", dependencies=[Depends(require_api_key)])
async def register_agent(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Register an agent under the calling org.

    Body:
        id (str, required), display_name (str, required), role (str, required),
        scope (list[str], optional), owner (str, optional),
        tenant_id (str, optional - defaults to org's default_tenant_id)
    """
    org = current_org()
    agent_id = payload.get("id")
    display_name = payload.get("display_name")
    role = payload.get("role")
    if not (agent_id and display_name and role):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_payload",
                "message": "id, display_name, and role are required.",
            },
        )

    tenant_id = payload.get("tenant_id") or org.default_tenant_id
    scope = list(payload.get("scope") or [])
    owner = payload.get("owner", "")

    existing = (
        db.query(Agent)
        .filter_by(id=agent_id, org_id=current_org_id())
        .first()
    )
    if existing:
        existing.display_name = display_name
        existing.role = role
        existing.scope = scope
        existing.owner = owner
        existing.tenant_id = tenant_id
        existing.last_active_at = utcnow()
        db.commit()
        return {"id": agent_id, "status": "updated"}

    db.add(Agent(
        id=agent_id,
        display_name=display_name,
        tenant_id=tenant_id,
        vertical="custom",
        owner=owner,
        scope=scope,
        role=role,
        registered_at=utcnow(),
        last_active_at=utcnow(),
        is_dormant=False,
        org_id=current_org_id(),
    ))
    db.commit()
    return {"id": agent_id, "status": "registered"}


@router.get("/agents", dependencies=[Depends(require_api_key)])
async def list_agents(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(Agent).filter_by(org_id=current_org_id()).all()
    return {
        "agents": [
            {
                "id": a.id,
                "display_name": a.display_name,
                "role": a.role,
                "tenant_id": a.tenant_id,
                "scope": a.scope,
                "owner": a.owner,
                "is_dormant": a.is_dormant,
                "registered_at": a.registered_at.isoformat() if a.registered_at else None,
            }
            for a in rows
        ],
    }


# ---------------------------------------------------------------------------
# Chains + audit
# ---------------------------------------------------------------------------

@router.get("/chains", dependencies=[Depends(require_api_key)])
async def list_chains(
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List recent chains for this org. Optional `status` filter: allowed|denied|flagged."""
    limit = max(1, min(500, limit))
    rows = (
        db.query(ChainCredential)
        .filter_by(org_id=current_org_id())
        .order_by(ChainCredential.issued_at.desc())
        .all()
    )
    by_chain: dict[str, dict[str, Any]] = {}
    for r in rows:
        if r.chain_id not in by_chain:
            by_chain[r.chain_id] = {
                "chain_id": r.chain_id,
                "tenant_id": r.tenant_id,
                "started_at": r.issued_at.isoformat() if r.issued_at else None,
                "hop_count": 0,
                "head_caller": r.caller_id,
                "head_callee": r.callee_id,
            }
        by_chain[r.chain_id]["hop_count"] += 1

    evals = (
        db.query(RuleEvaluation)
        .filter_by(org_id=current_org_id())
        .all()
    )
    eval_by_chain: dict[str, list[str]] = {}
    for e in evals:
        eval_by_chain.setdefault(e.chain_id, []).append(e.result)

    out = []
    for chain_id, info in by_chain.items():
        results = eval_by_chain.get(chain_id, [])
        chain_status = "allowed"
        if "DENY" in results:
            chain_status = "denied"
        elif "FLAG" in results:
            chain_status = "flagged"
        info["status"] = chain_status
        if status and status != chain_status:
            continue
        out.append(info)

    return {"chains": out[:limit]}


@router.get("/chains/{chain_id}", dependencies=[Depends(require_api_key)])
async def get_chain(
    chain_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    creds = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .order_by(ChainCredential.issued_at)
        .all()
    )
    if not creds:
        raise HTTPException(
            status_code=404,
            detail={"error": "chain_not_found", "message": f"chain {chain_id} not found."},
        )
    evals = (
        db.query(RuleEvaluation)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .order_by(RuleEvaluation.evaluated_at)
        .all()
    )
    return {
        "chain_id": chain_id,
        "hops": [
            {
                "jti": c.jti,
                "parent_jti": c.parent_jti,
                "from_agent": c.caller_id,
                "to_agent": c.callee_id,
                "action": c.action,
                "tenant_id": c.tenant_id,
                "scope": c.scope,
                "value_limit": c.value_limit,
                "declared_intent": c.declared_intent,
                "detected_intent": c.detected_intent,
                "issued_at": c.issued_at.isoformat() if c.issued_at else None,
                "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            }
            for c in creds
        ],
        "evaluations": [
            {
                "rule": e.rule_name,
                "layer": e.layer,
                "result": e.result,
                "reason": e.reason,
                "matched_segment": e.matched_segment,
            }
            for e in evals
        ],
    }


@router.get("/audit/{chain_id}", dependencies=[Depends(require_api_key)])
async def get_audit(
    chain_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return the most recent incident report for a chain.

    To generate a report, POST /api/audit/report/{chain_id} (legacy streaming
    endpoint). This v1 endpoint just returns the persisted text.
    """
    # Verify chain exists and belongs to this org
    cred = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .first()
    )
    if not cred:
        raise HTTPException(
            status_code=404,
            detail={"error": "chain_not_found", "message": f"chain {chain_id} not found."},
        )
    inc = (
        db.query(Incident)
        .filter_by(chain_id=chain_id, org_id=current_org_id())
        .order_by(Incident.created_at.desc())
        .first()
    )
    if not inc:
        return {
            "chain_id": chain_id,
            "report": None,
            "message": "No incident report yet. POST /api/audit/report/{chain_id} to generate one.",
        }
    return {
        "chain_id": chain_id,
        "incident_id": inc.id,
        "severity": inc.severity,
        "summary": inc.summary,
        "report": inc.full_report,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
    }


# ---------------------------------------------------------------------------
# Health / whoami
# ---------------------------------------------------------------------------

@router.get("/whoami", dependencies=[Depends(require_api_key)])
async def whoami() -> dict[str, Any]:
    """Return the calling org. Useful for SDKs to verify their API key."""
    org = current_org()
    return {
        "org_id": org.id,
        "org_name": org.name,
        "slug": org.slug,
        "default_tenant_id": org.default_tenant_id,
    }
