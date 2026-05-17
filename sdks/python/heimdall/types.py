"""Typed response objects for the Heimdall SDK."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Evaluation:
    """One rule that fired against a chain."""

    rule: str
    layer: str  # "protocol" | "policy"
    result: str  # "ALLOW" | "FLAG" | "DENY"
    reason: str | None = None


@dataclass
class DelegationResult:
    """The outcome of a `Heimdall.delegate(...)` call."""

    decision: str  # "ALLOW" | "DENY"
    chain_id: str
    evaluations: list[Evaluation] = field(default_factory=list)

    # Present when decision == "ALLOW"
    credential: str | None = None
    depth: int | None = None
    expires_at: str | None = None

    # Present when decision == "DENY"
    rule: str | None = None
    layer: str | None = None
    reason: str | None = None

    @property
    def allowed(self) -> bool:
        return self.decision == "ALLOW"

    @property
    def denied(self) -> bool:
        return self.decision == "DENY"

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DelegationResult":
        evals = [
            Evaluation(
                rule=e.get("rule", ""),
                layer=e.get("layer", ""),
                result=e.get("result", ""),
                reason=e.get("reason"),
            )
            for e in d.get("evaluations", [])
        ]
        return cls(
            decision=d.get("decision", ""),
            chain_id=d.get("chain_id", ""),
            evaluations=evals,
            credential=d.get("credential"),
            depth=d.get("depth"),
            expires_at=d.get("expires_at"),
            rule=d.get("rule"),
            layer=d.get("layer"),
            reason=d.get("reason"),
        )


@dataclass
class Agent:
    id: str
    display_name: str
    role: str
    tenant_id: str
    scope: list[str] = field(default_factory=list)
    owner: str | None = None
    is_dormant: bool = False
    registered_at: str | None = None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Agent":
        return cls(
            id=d["id"],
            display_name=d["display_name"],
            role=d["role"],
            tenant_id=d["tenant_id"],
            scope=list(d.get("scope") or []),
            owner=d.get("owner"),
            is_dormant=bool(d.get("is_dormant", False)),
            registered_at=d.get("registered_at"),
        )


@dataclass
class ChainSummary:
    chain_id: str
    tenant_id: str
    hop_count: int
    started_at: str | None
    head_caller: str
    head_callee: str
    status: str  # "allowed" | "denied" | "flagged"

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ChainSummary":
        return cls(
            chain_id=d["chain_id"],
            tenant_id=d.get("tenant_id", ""),
            hop_count=int(d.get("hop_count", 0)),
            started_at=d.get("started_at"),
            head_caller=d.get("head_caller", ""),
            head_callee=d.get("head_callee", ""),
            status=d.get("status", "allowed"),
        )


@dataclass
class Hop:
    jti: str
    parent_jti: str | None
    from_agent: str
    to_agent: str
    action: str
    tenant_id: str
    scope: list[str]
    value_limit: int | None
    declared_intent: str | None
    detected_intent: str | None
    issued_at: str | None
    expires_at: str | None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Hop":
        return cls(
            jti=d["jti"],
            parent_jti=d.get("parent_jti"),
            from_agent=d.get("from_agent", ""),
            to_agent=d.get("to_agent", ""),
            action=d.get("action", ""),
            tenant_id=d.get("tenant_id", ""),
            scope=list(d.get("scope") or []),
            value_limit=d.get("value_limit"),
            declared_intent=d.get("declared_intent"),
            detected_intent=d.get("detected_intent"),
            issued_at=d.get("issued_at"),
            expires_at=d.get("expires_at"),
        )


@dataclass
class IncidentReport:
    chain_id: str
    incident_id: str | None
    severity: str | None
    summary: str | None
    report: str | None
    created_at: str | None

    @property
    def exists(self) -> bool:
        return self.report is not None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "IncidentReport":
        return cls(
            chain_id=d.get("chain_id", ""),
            incident_id=d.get("incident_id"),
            severity=d.get("severity"),
            summary=d.get("summary"),
            report=d.get("report"),
            created_at=d.get("created_at"),
        )
