"""Layer 2 policy engine.

Six rule primitives — each is a pure function from (chain, config[, db])
to an `EvalResult`. Adding a 7th would mean editing exactly one dispatch
table at the bottom of this file.

Primitives:
    chain_pattern        regex over caller→callee serialisation
    agent_state          predicate on agent registry rows
    chain_depth          numeric hop limit
    value_threshold      action value limits, optionally scaled by depth
    intent_mismatch      declared vs detected intent overlap
    behavioral_drift     time-series deviation from agent's prior baseline
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from backend.db import (
    Agent,
    AgentBehaviorBaseline,
    ChainCredential,
    RuleEvaluation,
)

ALLOW, FLAG, DENY = "ALLOW", "FLAG", "DENY"


@dataclass
class EvalResult:
    rule_name: str
    rule_type: str
    layer: str  # "policy" (Layer 1 results are emitted by delegate.py directly)
    result: str  # ALLOW | FLAG | DENY
    reason: str
    matched_segment: Any = None


# ---------------------------------------------------------------------------
# Primitive 1: chain_pattern
# ---------------------------------------------------------------------------

def _serialise(chain: list[ChainCredential]) -> str:
    if not chain:
        return ""
    ids = [c.caller_id for c in chain] + [chain[-1].callee_id]
    return "->".join(ids)


def _serialise_by_role(chain: list[ChainCredential], db: Session) -> str:
    if not chain:
        return ""
    roles: list[str] = []
    cache: dict[str, str] = {}

    def role_for(aid: str) -> str:
        if aid in cache:
            return cache[aid]
        row = db.query(Agent).filter_by(id=aid).first()
        r = (row.role if row else aid) or aid
        cache[aid] = r
        return r

    for c in chain:
        roles.append(role_for(c.caller_id))
    roles.append(role_for(chain[-1].callee_id))
    return "->".join(roles)


def evaluate_chain_pattern(chain: list[ChainCredential], config: dict, db: Session) -> EvalResult:
    pattern = config.get("pattern", "")
    match_by = config.get("match_by", "id")  # "id" or "role"
    serialised = _serialise_by_role(chain, db) if match_by == "role" else _serialise(chain)

    if pattern and re.search(pattern, serialised):
        return EvalResult(
            rule_name="chain_pattern",
            rule_type="chain_pattern",
            layer="policy",
            result=DENY,
            reason=f"chain '{serialised}' matches forbidden pattern '{pattern}'",
            matched_segment=serialised,
        )
    return EvalResult(
        "chain_pattern", "chain_pattern", "policy", ALLOW,
        f"chain '{serialised}' does not match '{pattern}'",
    )


# ---------------------------------------------------------------------------
# Primitive 2: agent_state
# ---------------------------------------------------------------------------

def evaluate_agent_state(chain: list[ChainCredential], config: dict, db: Session) -> EvalResult:
    """Tiny predicate language — supports is_dormant / owner_departed / just_registered."""
    condition = config.get("condition", "")
    if not condition:
        return EvalResult("agent_state", "agent_state", "policy", ALLOW, "no condition")

    for cred in chain:
        for agent_id in (cred.caller_id, cred.callee_id):
            row = db.query(Agent).filter_by(id=agent_id).first()
            if not row:
                continue
            if "is_dormant" in condition and row.is_dormant:
                return EvalResult(
                    rule_name="agent_state",
                    rule_type="agent_state",
                    layer="policy",
                    result=DENY,
                    reason=f"agent {row.id} is dormant",
                    matched_segment=row.id,
                )
            if "owner_departed" in condition and row.owner and "ex-" in (row.owner or "").lower():
                return EvalResult(
                    rule_name="agent_state",
                    rule_type="agent_state",
                    layer="policy",
                    result=DENY,
                    reason=f"agent {row.id} owner has departed ({row.owner})",
                    matched_segment=row.id,
                )
    return EvalResult("agent_state", "agent_state", "policy", ALLOW, "no agents matched condition")


# ---------------------------------------------------------------------------
# Primitive 3: chain_depth
# ---------------------------------------------------------------------------

def evaluate_chain_depth(chain: list[ChainCredential], config: dict) -> EvalResult:
    max_depth = int(config.get("max_depth", 4))
    depth = len(chain)
    if depth > max_depth:
        return EvalResult(
            "chain_depth", "chain_depth", "policy", DENY,
            f"chain depth {depth} exceeds max {max_depth}",
            matched_segment=depth,
        )
    return EvalResult(
        "chain_depth", "chain_depth", "policy", ALLOW,
        f"depth {depth} ≤ {max_depth}",
        matched_segment=depth,
    )


# ---------------------------------------------------------------------------
# Primitive 4: value_threshold
# ---------------------------------------------------------------------------

def evaluate_value_threshold(chain: list[ChainCredential], config: dict) -> EvalResult:
    if not chain:
        return EvalResult("value_threshold", "value_threshold", "policy", ALLOW, "empty chain")
    head = chain[-1]
    if head.value_limit is None:
        return EvalResult(
            "value_threshold", "value_threshold", "policy", ALLOW,
            "no action value declared on this hop",
        )
    depth = len(chain)
    value = head.value_limit
    thresholds = config.get("thresholds") or []
    # Find the strictest threshold whose depth is ≤ current depth.
    applicable = [t for t in thresholds if depth >= int(t.get("depth", 0))]
    if not applicable:
        return EvalResult(
            "value_threshold", "value_threshold", "policy", ALLOW,
            f"no threshold applies at depth {depth}",
        )
    applicable.sort(key=lambda t: int(t.get("depth", 0)))
    strictest = applicable[-1]
    cap = int(strictest["max_value"])
    if value > cap:
        return EvalResult(
            "value_threshold", "value_threshold", "policy", DENY,
            f"value {value} exceeds depth-{strictest['depth']} limit {cap}",
            matched_segment=f"depth={depth} value={value} cap={cap}",
        )
    return EvalResult(
        "value_threshold", "value_threshold", "policy", ALLOW,
        f"value {value} within depth-{strictest['depth']} cap {cap}",
        matched_segment=f"depth={depth} value={value} cap={cap}",
    )


# ---------------------------------------------------------------------------
# Primitive 5: intent_mismatch
# ---------------------------------------------------------------------------

def evaluate_intent_mismatch(chain: list[ChainCredential], config: dict) -> EvalResult:
    if not chain:
        return EvalResult("intent_mismatch", "intent_mismatch", "policy", ALLOW, "empty chain")
    cred = chain[-1]
    declared = (cred.declared_intent or "").strip().lower()
    detected = (cred.detected_intent or "").strip().lower()
    if not declared or not detected:
        return EvalResult(
            "intent_mismatch", "intent_mismatch", "policy", ALLOW,
            "no detected intent recorded for this hop",
        )

    declared_words = set(declared.split())
    detected_words = set(detected.split())
    overlap = (
        len(declared_words & detected_words) / max(len(declared_words | detected_words), 1)
    )
    threshold = float(config.get("threshold_similarity", 0.5))
    on_violation = (config.get("on_violation") or "DENY").upper()

    if overlap < threshold:
        return EvalResult(
            "intent_mismatch", "intent_mismatch", "policy",
            DENY if on_violation == "DENY" else FLAG,
            f"declared '{cred.declared_intent}' diverges from detected '{cred.detected_intent}' "
            f"(jaccard={overlap:.2f} < {threshold:.2f})",
            matched_segment=f"declared={cred.declared_intent}; detected={cred.detected_intent}",
        )
    return EvalResult(
        "intent_mismatch", "intent_mismatch", "policy", ALLOW,
        f"declared/detected overlap {overlap:.2f} ≥ {threshold:.2f}",
    )


# ---------------------------------------------------------------------------
# Primitive 6: behavioral_drift
# ---------------------------------------------------------------------------

def evaluate_behavioral_drift(chain: list[ChainCredential], config: dict, db: Session) -> EvalResult:
    """Flag any hop in the chain where the caller has a long baseline but
    has never delegated to this callee before.

    The original implementation only inspected the latest hop, which meant
    the rule was useless once Layer 1 stopped the chain early. Walking all
    hops matches the demo narrative ("Portfolio Agent has never delegated
    to Yield Optimizer in 100 prior sessions") more naturally.
    """
    if not chain:
        return EvalResult("behavioral_drift", "behavioral_drift", "policy", ALLOW, "empty chain")

    min_hist = int(config.get("min_history", 50))
    action = (config.get("novel_delegation_action") or "FLAG").upper()

    most_history = 0
    # Pass 1: direct-hop drift — did any single caller delegate somewhere new?
    for cred in chain:
        history = db.query(AgentBehaviorBaseline).filter_by(agent_id=cred.caller_id).all()
        most_history = max(most_history, len(history))
        if len(history) < min_hist:
            continue
        seen = {h.delegated_to for h in history}
        if cred.callee_id not in seen:
            return EvalResult(
                "behavioral_drift", "behavioral_drift", "policy", action,
                f"{cred.caller_id} has never delegated to {cred.callee_id} "
                f"in {len(history)} prior sessions",
                matched_segment=f"{cred.caller_id}->{cred.callee_id}",
            )

    # Pass 2: transitive drift — is any agent in this chain one that no
    # well-baselined participant has ever historically touched? This is
    # what catches "Portfolio has never participated in chains containing
    # the Shadow agent in 100 prior sessions".
    participants = {c.caller_id for c in chain} | {c.callee_id for c in chain}
    historians = [
        c for c in chain
        if db.query(AgentBehaviorBaseline).filter_by(agent_id=c.caller_id).count() >= min_hist
    ]
    if historians:
        union_seen: set[str] = set()
        for h in historians:
            for row in db.query(AgentBehaviorBaseline).filter_by(agent_id=h.caller_id).all():
                union_seen.add(row.delegated_to)
        novel = participants - union_seen - {h.caller_id for h in historians}
        # Drop the user-session pseudo-id; it's never in any baseline.
        novel = {a for a in novel if not a.startswith("user-")}
        if novel:
            one = sorted(novel)[0]
            return EvalResult(
                "behavioral_drift", "behavioral_drift", "policy", action,
                f"no well-baselined agent in this chain has ever delegated to {one} "
                f"in prior sessions",
                matched_segment=one,
            )

    if most_history < min_hist:
        return EvalResult(
            "behavioral_drift", "behavioral_drift", "policy", ALLOW,
            f"insufficient baseline (max {most_history} < {min_hist}) — skipping drift check",
        )

    return EvalResult(
        "behavioral_drift", "behavioral_drift", "policy", ALLOW,
        "all observed delegations match prior baselines",
    )


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_NEEDS_DB = {"agent_state", "behavioral_drift", "chain_pattern"}


def evaluate_policies(
    chain: list[ChainCredential],
    policies: list[dict[str, Any]],
    db: Session,
) -> list[EvalResult]:
    results: list[EvalResult] = []
    for policy in policies:
        rule_type = policy.get("type")
        cfg = policy.get("config") or {}
        name = str(policy.get("name") or rule_type or "unknown")

        if rule_type == "chain_pattern":
            r = evaluate_chain_pattern(chain, cfg, db)
        elif rule_type == "agent_state":
            r = evaluate_agent_state(chain, cfg, db)
        elif rule_type == "chain_depth":
            r = evaluate_chain_depth(chain, cfg)
        elif rule_type == "value_threshold":
            r = evaluate_value_threshold(chain, cfg)
        elif rule_type == "intent_mismatch":
            r = evaluate_intent_mismatch(chain, cfg)
        elif rule_type == "behavioral_drift":
            r = evaluate_behavioral_drift(chain, cfg, db)
        else:
            continue

        # Honour the YAML's `on_violation` override (DENY/FLAG) when the
        # rule produced any non-ALLOW result.
        on_violation = (policy.get("on_violation") or "").upper()
        if on_violation in (DENY, FLAG) and r.result not in (ALLOW,):
            r.result = on_violation

        r.rule_name = name
        results.append(r)

        db.add(RuleEvaluation(
            chain_id=chain[0].chain_id if chain else "unknown",
            rule_name=name,
            rule_type=str(rule_type),
            layer="policy",
            result=r.result,
            reason=r.reason,
            matched_segment=str(r.matched_segment) if r.matched_segment is not None else None,
        ))

    db.commit()
    return results


# Keep the imported name from being unused if no DB-using primitive ran.
_ = _NEEDS_DB
