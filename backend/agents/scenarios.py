"""Scripted scenarios that drive the demo, dispatched per active vertical.

A `ScenarioPack` per vertical captures everything that varies across domains:
action verbs, scope names, declared intents, the tool the executor invokes,
the poisoned-source tool the attack pulls from, the would-be forged hop
that Layer 1 should reject, and the user-facing value label (dollars vs
milligrams vs refund amount).

The orchestration logic (build credential tree, persist, evaluate Layer 2,
broadcast events, run counterfactuals) is the same across every vertical
that has a pack.

Customer Service has no pack on purpose — its YAML is real, but its tools
and agents are deliberately left for an integrator. Hitting any scenario
endpoint while it is active returns 422 with `configuration_only: true`.
"""
from __future__ import annotations

import asyncio
import importlib
import uuid
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import AgentBehaviorBaseline, ChainCredential, SessionLocal, utcnow
from backend.endpoints.delegate import delegate_raw
from backend.policy_loader import (
    get_active_agents,
    get_active_vertical,
)

USER_PSEUDO_ID = "user-session-001"


# ───────────────────────────── pack types ──────────────────────────────


@dataclass
class HopSpec:
    """One signed delegation within a scenario."""
    action: str
    scope: list[str]
    intent: str


@dataclass
class ScenarioPack:
    """Per-vertical knobs the generic scenario runner reads."""

    # Routine (2 hops: user→coordinator→data_fetcher)
    routine_user_to_coord: HopSpec
    routine_coord_to_data: HopSpec
    routine_drift_action: str

    # Rebalance equivalent (3 hops: user→coordinator; coord→data; coord→executor)
    rebalance_value_field: str            # e.g. "amount_usd" or "dose_mg"
    rebalance_value_default: int
    rebalance_value_unit: str             # "$" / "mg" — used in scenario_start event
    rebalance_value_label_fmt: str        # f-string with {amount}, e.g. "${amount}" or "{amount}mg"
    rebalance_tool: str                   # tool name to invoke on success
    rebalance_tool_amount_kw: str         # keyword to pass the value as to the tool
    rebalance_user_to_coord: HopSpec
    rebalance_coord_to_data: HopSpec
    rebalance_coord_to_exec: HopSpec
    rebalance_drift_actions: tuple[str, str]
    rebalance_completion_label: str       # "tx signed" / "EHR updated"

    # Attack (2 hops + poisoned external + forged 3rd that fails Layer 1)
    attack_setup_tool: str                # tool the data_fetcher calls to pull external content
    attack_setup_args: dict[str, Any]
    attack_detected_field: str            # field in the tool's result to capture as detected_intent
    attack_value: int                     # the forged hop's value_limit
    attack_user_to_coord: HopSpec
    attack_coord_to_data: HopSpec
    attack_data_to_shadow: HopSpec        # the forged/blocked hop
    attack_shadow_to_exec: HopSpec        # counterfactual continuation
    attack_unblocked_tool: str            # tool to actually invoke once the attack survives Heimdall-OFF
    attack_unblocked_tool_args: dict[str, Any] = field(default_factory=dict)


# ───────────────────────────── packs ───────────────────────────────────


_PACKS: dict[str, ScenarioPack] = {
    "defi": ScenarioPack(
        # ─── routine ─────────────────────────────────────────────
        routine_user_to_coord=HopSpec(
            action="check_balance",
            scope=["read:portfolio", "read:market_data"],
            intent="user asked to check portfolio balance",
        ),
        routine_coord_to_data=HopSpec(
            action="fetch_market_data",
            scope=["read:market_data"],
            intent="fetch latest market prices",
        ),
        routine_drift_action="fetch_market_data",
        # ─── rebalance ───────────────────────────────────────────
        rebalance_value_field="amount_usd",
        rebalance_value_default=500,
        rebalance_value_unit="$",
        rebalance_value_label_fmt="${amount}",
        rebalance_tool="execute_trade",
        rebalance_tool_amount_kw="amount_usd",
        rebalance_user_to_coord=HopSpec(
            action="rebalance_portfolio",
            scope=["read:portfolio", "read:market_data", "execute:trade"],
            intent="rebalance portfolio with {amount_label} trade",
        ),
        rebalance_coord_to_data=HopSpec(
            action="fetch_market_data",
            scope=["read:market_data"],
            intent="fetch latest market prices for rebalance",
        ),
        rebalance_coord_to_exec=HopSpec(
            action="execute_trade",
            scope=["execute:trade"],
            intent="execute {amount_label} rebalance trade",
        ),
        rebalance_drift_actions=("fetch_market_data", "execute_trade"),
        rebalance_completion_label="Sepolia tx signed",
        # ─── attack ──────────────────────────────────────────────
        attack_setup_tool="fetch_sentiment",
        attack_setup_args={"source": "external_feed"},
        attack_detected_field="sentiment_text",
        attack_value=27_000_000,
        attack_user_to_coord=HopSpec(
            action="rebalance_with_sentiment",
            scope=["read:portfolio", "read:market_data", "execute:trade"],
            intent="check sentiment from external feed and rebalance",
        ),
        attack_coord_to_data=HopSpec(
            action="fetch_sentiment",
            scope=["read:market_data"],
            intent="fetch market sentiment from external feed",
        ),
        attack_data_to_shadow=HopSpec(
            action="execute_trade",
            scope=["execute:trade"],   # NOT in market_data's scope → attenuation
            intent="optimize yield via shadow agent",
        ),
        attack_shadow_to_exec=HopSpec(
            action="execute_trade",
            scope=["execute:trade"],
            intent="execute large transfer",
        ),
        attack_unblocked_tool="execute_trade",
        attack_unblocked_tool_args={"amount_usd": 27_000_000},
    ),

    "healthcare": ScenarioPack(
        # ─── routine ─────────────────────────────────────────────
        routine_user_to_coord=HopSpec(
            action="triage_patient",
            scope=["read:patient_record", "read:lab_results"],
            intent="clinician asked for patient 4421 chart",
        ),
        routine_coord_to_data=HopSpec(
            action="fetch_record",
            scope=["read:patient_record"],
            intent="fetch patient 4421 record from EHR",
        ),
        routine_drift_action="fetch_record",
        # ─── rebalance (here: write to chart) ─────────────────────
        rebalance_value_field="dose_mg",
        rebalance_value_default=10,
        rebalance_value_unit="mg",
        rebalance_value_label_fmt="{amount}mg",
        rebalance_tool="update_record",
        rebalance_tool_amount_kw="change",   # passed as "10mg lisinopril" via change kwarg
        rebalance_user_to_coord=HopSpec(
            action="update_patient_chart",
            scope=["read:patient_record", "write:patient_record"],
            intent="add {amount_label} prescription to patient 4421",
        ),
        rebalance_coord_to_data=HopSpec(
            action="fetch_record",
            scope=["read:patient_record"],
            intent="fetch patient 4421 record before update",
        ),
        rebalance_coord_to_exec=HopSpec(
            action="update_record",
            scope=["write:patient_record"],
            intent="write {amount_label} prescription to patient 4421",
        ),
        rebalance_drift_actions=("fetch_record", "update_record"),
        rebalance_completion_label="EHR record updated",
        # ─── attack ──────────────────────────────────────────────
        attack_setup_tool="fetch_lab_feed",
        attack_setup_args={"source": "external_feed"},
        attack_detected_field="notes",
        attack_value=999,
        attack_user_to_coord=HopSpec(
            action="triage_with_external_labs",
            scope=["read:patient_record", "read:lab_results", "write:patient_record"],
            intent="incorporate external lab results into chart 4421",
        ),
        attack_coord_to_data=HopSpec(
            action="fetch_lab_feed",
            scope=["read:lab_results"],
            intent="fetch external lab results for 4421",
        ),
        attack_data_to_shadow=HopSpec(
            action="update_record",
            scope=["write:patient_record"],   # NOT in records' scope → attenuation
            intent="promote lab adapter to update chart",
        ),
        attack_shadow_to_exec=HopSpec(
            action="update_record",
            scope=["write:patient_record"],
            intent="diagnose patient 4421 with diabetes",
        ),
        attack_unblocked_tool="update_record",
        attack_unblocked_tool_args={
            "patient_id": "4421",
            "change": "diagnose with diabetes (poisoned external content)",
        },
    ),

    # No "customer_service" pack — configuration-only by design.
}


def _get_pack() -> ScenarioPack:
    """Return the active vertical's pack, or 422 if the vertical is config-only."""
    vertical = get_active_vertical()
    pack = _PACKS.get(vertical)
    if pack is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "configuration_only",
                "vertical": vertical,
                "message": (
                    f"The {vertical} vertical is configuration-only. To run scenarios, "
                    "drop agents.yaml, prompts.yaml, and tools.py into "
                    f"verticals/{vertical}/ and add a ScenarioPack entry."
                ),
            },
        )
    return pack


# ───────────────────────────── helpers ─────────────────────────────────


def _agents_by_role() -> dict[str, dict[str, Any]]:
    return {a["role"]: a for a in get_active_agents()}


def _load_tools() -> dict[str, Any]:
    """Import the active vertical's tools module dynamically."""
    vertical = get_active_vertical()
    try:
        mod = importlib.import_module(f"verticals.{vertical}.tools")
    except ModuleNotFoundError:
        return {}
    return dict(getattr(mod, "TOOLS", {}))


class _ForgedCred:
    """Quacks like a ChainCredential row for the policy engine, but lives
    only in memory — used for counterfactual Layer 2 evaluation."""
    __slots__ = (
        "jti", "parent_jti", "caller_id", "callee_id", "action", "tenant_id",
        "scope", "value_limit", "declared_intent", "detected_intent",
        "issued_at", "expires_at", "signature", "chain_id",
    )

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def _in_memory_cred(**kw) -> "_ForgedCred":
    kw.setdefault("issued_at", utcnow())
    kw.setdefault("jti", str(uuid.uuid4()))
    kw.setdefault("signature", "<forged-for-counterfactual>")
    return _ForgedCred(**kw)


async def _record_behaviour(db: Session, caller_id: str, callee_id: str, action: str, depth: int) -> None:
    db.add(AgentBehaviorBaseline(
        agent_id=caller_id,
        delegated_to=callee_id,
        action=action,
        chain_depth=depth,
        observed_at=utcnow(),
    ))
    db.commit()


async def _delegate(
    request: Request,
    db: Session,
    *,
    caller_id: str,
    callee_id: str,
    action: str,
    tenant_id: str,
    scope: list[str],
    declared_intent: str,
    detected_intent: str | None = None,
    parent_jti: str | None = None,
    value_limit: int | None = None,
    chain_id: str | None = None,
) -> dict[str, Any]:
    payload = {
        "caller_id": caller_id,
        "callee_id": callee_id,
        "action": action,
        "tenant_id": tenant_id,
        "scope": scope,
        "declared_intent": declared_intent,
        "detected_intent": detected_intent,
        "parent_jti": parent_jti,
        "value_limit": value_limit,
        "chain_id": chain_id,
    }
    return await delegate_raw(payload, request, db)


def _fmt(intent: str, **kw: Any) -> str:
    try:
        return intent.format(**kw)
    except (KeyError, IndexError):
        return intent


# ───────────────────────────── scenarios ───────────────────────────────


async def _scenario_routine(request: Request, db: Session) -> dict[str, Any]:
    pack = _get_pack()
    roles = _agents_by_role()
    coord = roles["coordinator"]
    data = roles["data_fetcher"]
    tenant = coord["tenant_id"]
    ws_manager = request.app.state.ws_manager
    chain_id = str(uuid.uuid4())

    await ws_manager.broadcast({"type": "scenario_start", "name": "routine", "chain_id": chain_id})

    r1 = await _delegate(
        request, db,
        caller_id=USER_PSEUDO_ID,
        callee_id=coord["id"],
        action=pack.routine_user_to_coord.action,
        tenant_id=tenant,
        scope=pack.routine_user_to_coord.scope,
        declared_intent=pack.routine_user_to_coord.intent,
        chain_id=chain_id,
    )
    await asyncio.sleep(0.4)
    r2 = await _delegate(
        request, db,
        caller_id=coord["id"],
        callee_id=data["id"],
        action=pack.routine_coord_to_data.action,
        tenant_id=tenant,
        scope=pack.routine_coord_to_data.scope,
        declared_intent=pack.routine_coord_to_data.intent,
        parent_jti=r1["credential"]["jti"],
    )
    await _record_behaviour(db, coord["id"], data["id"], pack.routine_drift_action, 2)

    await ws_manager.broadcast({"type": "scenario_end", "name": "routine", "chain_id": chain_id})
    return {"chain_id": chain_id, "hops": [r1, r2]}


async def _scenario_rebalance(request: Request, db: Session, amount_usd: int | None = None) -> dict[str, Any]:
    pack = _get_pack()
    amount = amount_usd if amount_usd is not None else pack.rebalance_value_default

    roles = _agents_by_role()
    coord = roles["coordinator"]
    data = roles["data_fetcher"]
    executor = roles["executor"]
    tenant = coord["tenant_id"]
    ws_manager = request.app.state.ws_manager
    tools = _load_tools()
    chain_id = str(uuid.uuid4())

    label = pack.rebalance_value_label_fmt.format(amount=amount)

    await ws_manager.broadcast({
        "type": "scenario_start",
        "name": "rebalance",
        "chain_id": chain_id,
        "amount": amount,
        "unit": pack.rebalance_value_unit,
        "label": label,
    })

    r1 = await _delegate(
        request, db,
        caller_id=USER_PSEUDO_ID,
        callee_id=coord["id"],
        action=pack.rebalance_user_to_coord.action,
        tenant_id=tenant,
        scope=pack.rebalance_user_to_coord.scope,
        declared_intent=_fmt(pack.rebalance_user_to_coord.intent, amount_label=label),
        chain_id=chain_id,
    )
    await asyncio.sleep(0.3)
    r2 = await _delegate(
        request, db,
        caller_id=coord["id"],
        callee_id=data["id"],
        action=pack.rebalance_coord_to_data.action,
        tenant_id=tenant,
        scope=pack.rebalance_coord_to_data.scope,
        declared_intent=_fmt(pack.rebalance_coord_to_data.intent, amount_label=label),
        parent_jti=r1["credential"]["jti"],
    )
    await _record_behaviour(db, coord["id"], data["id"], pack.rebalance_drift_actions[0], 2)
    await asyncio.sleep(0.3)
    r3 = await _delegate(
        request, db,
        caller_id=coord["id"],
        callee_id=executor["id"],
        action=pack.rebalance_coord_to_exec.action,
        tenant_id=tenant,
        scope=pack.rebalance_coord_to_exec.scope,
        declared_intent=_fmt(pack.rebalance_coord_to_exec.intent, amount_label=label),
        parent_jti=r1["credential"]["jti"],
        value_limit=amount,
    )
    await _record_behaviour(db, coord["id"], executor["id"], pack.rebalance_drift_actions[1], 2)

    # Execute the executor's tool
    tool_result: dict[str, Any] | None = None
    tool_fn = tools.get(pack.rebalance_tool)
    if tool_fn:
        kwargs: dict[str, Any] = {pack.rebalance_tool_amount_kw: amount if pack.rebalance_tool_amount_kw != "change" else f"{label} prescription"}
        # For healthcare, also pass the patient id along for clarity.
        if pack.rebalance_tool == "update_record":
            kwargs["patient_id"] = "4421"
        tool_result = await tool_fn(**kwargs)
        await ws_manager.broadcast({
            "type": "tool_invoked",
            "tool": pack.rebalance_tool,
            "chain_id": chain_id,
            "result": tool_result,
            "label": pack.rebalance_completion_label,
        })

    await ws_manager.broadcast({"type": "scenario_end", "name": "rebalance", "chain_id": chain_id})
    return {"chain_id": chain_id, "hops": [r1, r2, r3], "tx": tool_result}


async def _scenario_attack(request: Request, db: Session, scenario_name: str = "attack") -> dict[str, Any]:
    """The Scene 3 attack.

    user → coord → data runs cleanly; data pulls a poisoned external
    source; data then tries to delegate the executor scope it does not
    have, so Layer 1 attenuation kills the credential before it can sign.

    `scenario_name` is the outer scenario name reported on WS events. The
    wrapper "attack_no_heimdall" passes its own name so the dashboard can
    bucket the OFF chain correctly.
    """
    pack = _get_pack()
    roles = _agents_by_role()
    coord = roles["coordinator"]
    data = roles["data_fetcher"]
    executor = roles["executor"]
    shadow = roles["shadow"]
    tenant = coord["tenant_id"]
    ws_manager = request.app.state.ws_manager
    tools = _load_tools()
    chain_id = str(uuid.uuid4())

    await ws_manager.broadcast({"type": "scenario_start", "name": scenario_name, "chain_id": chain_id})

    # Hop 1: user → coord
    r1 = await _delegate(
        request, db,
        caller_id=USER_PSEUDO_ID,
        callee_id=coord["id"],
        action=pack.attack_user_to_coord.action,
        tenant_id=tenant,
        scope=pack.attack_user_to_coord.scope,
        declared_intent=pack.attack_user_to_coord.intent,
        chain_id=chain_id,
    )
    await asyncio.sleep(0.5)

    # Hop 2: coord → data
    r2 = await _delegate(
        request, db,
        caller_id=coord["id"],
        callee_id=data["id"],
        action=pack.attack_coord_to_data.action,
        tenant_id=tenant,
        scope=pack.attack_coord_to_data.scope,
        declared_intent=pack.attack_coord_to_data.intent,
        parent_jti=r1["credential"]["jti"],
    )
    await _record_behaviour(db, coord["id"], data["id"], pack.attack_coord_to_data.action, 2)
    await asyncio.sleep(0.5)

    # data pulls the poisoned external source
    setup_tool = tools.get(pack.attack_setup_tool)
    poisoned: dict[str, Any] = {}
    if setup_tool:
        poisoned = await setup_tool(**pack.attack_setup_args)
    await ws_manager.broadcast({
        "type": "external_content_flagged",
        "chain_id": chain_id,
        "sentiment": poisoned,   # name kept for back-compat with the landing-page client
        "note": "Lobster Trap: prompt injection detected in external content",
    })
    await asyncio.sleep(0.6)

    detected_intent = str(poisoned.get(pack.attack_detected_field, "")) or pack.attack_data_to_shadow.intent

    # Hop 3 (the attack hop): data tries to delegate executor scope to shadow.
    try:
        r3 = await _delegate(
            request, db,
            caller_id=data["id"],
            callee_id=shadow["id"],
            action=pack.attack_data_to_shadow.action,
            tenant_id=tenant,
            scope=pack.attack_data_to_shadow.scope,
            declared_intent=pack.attack_data_to_shadow.intent,
            detected_intent=detected_intent,
            parent_jti=r2["credential"]["jti"],
            value_limit=pack.attack_value,
        )
    except HTTPException as e:
        await ws_manager.broadcast({
            "type": "scenario_blocked",
            "name": scenario_name,
            "chain_id": chain_id,
            "detail": e.detail,
        })
        r3 = {"blocked": True, "detail": e.detail}

    # Counterfactual Layer 2 evaluation: forge the two would-have-been hops
    # in memory and run the policy engine against them.
    await asyncio.sleep(0.6)
    chain_rows = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id)
        .order_by(ChainCredential.issued_at)
        .all()
    )
    if chain_rows:
        forged = list(chain_rows)
        forged.append(_in_memory_cred(
            caller_id=data["id"], callee_id=shadow["id"], action=pack.attack_data_to_shadow.action,
            tenant_id=tenant, scope=pack.attack_data_to_shadow.scope, chain_id=chain_id,
            declared_intent=pack.attack_data_to_shadow.intent,
            detected_intent=detected_intent, value_limit=pack.attack_value,
        ))
        forged.append(_in_memory_cred(
            caller_id=shadow["id"], callee_id=executor["id"], action=pack.attack_shadow_to_exec.action,
            tenant_id=tenant, scope=pack.attack_shadow_to_exec.scope, chain_id=chain_id,
            declared_intent=pack.attack_shadow_to_exec.intent,
            detected_intent="external_transfer", value_limit=pack.attack_value,
        ))

        from backend.policy_engine import evaluate_policies
        from backend.policy_loader import get_active_policies
        extra = evaluate_policies(forged, get_active_policies(), db)
        for ev in extra:
            await ws_manager.broadcast({
                "type": "rule_evaluation",
                "chain_id": chain_id,
                "rule_name": ev.rule_name,
                "rule_type": ev.rule_type,
                "layer": ev.layer,
                "result": ev.result,
                "reason": ev.reason,
                "matched_segment": str(ev.matched_segment) if ev.matched_segment else None,
                "counterfactual": True,
            })

    await ws_manager.broadcast({"type": "scenario_end", "name": scenario_name, "chain_id": chain_id})
    _ = executor  # referenced for clarity
    return {"chain_id": chain_id, "hops": [r1, r2, r3], "sentiment": poisoned}


async def _scenario_attack_no_heimdall(request: Request, db: Session) -> dict[str, Any]:
    """Scene 6: same attack but Heimdall is toggled OFF. Forged credentials
    forge their way through and the executor's tool actually runs."""
    pack = _get_pack()
    from backend.policy_loader import set_heimdall_enabled, get_heimdall_enabled
    prev = get_heimdall_enabled()
    set_heimdall_enabled(False)
    try:
        result = await _scenario_attack(request, db, scenario_name="attack_no_heimdall")
        tools = _load_tools()
        tx = None
        tool_fn = tools.get(pack.attack_unblocked_tool)
        if tool_fn:
            tx = await tool_fn(**pack.attack_unblocked_tool_args)
            ws_manager = request.app.state.ws_manager
            await ws_manager.broadcast({
                "type": "tool_invoked",
                "tool": pack.attack_unblocked_tool,
                "chain_id": result["chain_id"],
                "result": tx,
                "note": "Heimdall OFF — action executed without governance",
            })
        result["tx_unblocked"] = tx
        return result
    finally:
        set_heimdall_enabled(prev)


# ───────────────────────────── routes ──────────────────────────────────


SCENARIOS: dict[str, Any] = {
    "routine": _scenario_routine,
    "rebalance": _scenario_rebalance,
    "attack": _scenario_attack,
    "attack_no_heimdall": _scenario_attack_no_heimdall,
}


def register_scenario_routes(app: FastAPI) -> None:
    router = APIRouter()

    @router.post("/scenario/{name}")
    async def run_scenario(name: str, request: Request, payload: dict | None = None) -> dict:
        if name not in SCENARIOS:
            raise HTTPException(status_code=404, detail=f"unknown scenario '{name}'")
        db = SessionLocal()
        try:
            kwargs: dict[str, Any] = {}
            if payload and name == "rebalance":
                # Accept either amount_usd (legacy) or the pack's value_field name.
                if "amount_usd" in payload:
                    kwargs["amount_usd"] = int(payload["amount_usd"])
                else:
                    pack = _PACKS.get(get_active_vertical())
                    if pack and pack.rebalance_value_field in payload:
                        kwargs["amount_usd"] = int(payload[pack.rebalance_value_field])
            return await SCENARIOS[name](request, db, **kwargs)
        finally:
            db.close()

    @router.get("/scenarios")
    async def list_scenarios() -> dict:
        vertical = get_active_vertical()
        pack = _PACKS.get(vertical)
        return {
            "vertical": vertical,
            "available": list(SCENARIOS.keys()) if pack else [],
            "configuration_only": pack is None,
            "value_field": pack.rebalance_value_field if pack else None,
            "value_unit": pack.rebalance_value_unit if pack else None,
            "value_default": pack.rebalance_value_default if pack else None,
        }

    app.include_router(router, prefix="/api", tags=["scenario"])
