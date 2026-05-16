"""JWT chain credentials with Layer 1 protocol-level enforcement.

Layer 1 invariants (enforced at construction):

1. Scope attenuation:  `new.scope ⊆ parent.scope`        (capability attenuation)
2. Tenant isolation:   `new.tenant_id == parent.tenant_id`
3. Signature integrity (HS256)
4. Parent linkage:     `new.parent_jti == prev.jti`
5. Expiration:         `now <= expires_at`

The functions raise typed exceptions so callers can map them to specific
"protocol layer" rule cards in the dashboard.

`sign_credential_unsafe` exists only for the demo's "Heimdall OFF" mode
(Scene 6) — it deliberately skips invariants 1 and 2 so we can demonstrate
what the world looks like *without* protocol-level enforcement.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from backend.config import settings


class ChainError(Exception):
    """Base error for any chain-level problem."""


class AttenuationViolation(ChainError):
    """A delegation tried to widen scope. Capability attenuation forbids this."""


class TenantMismatch(ChainError):
    """A delegation tried to cross tenant boundaries."""


class SignatureInvalid(ChainError):
    """JWT signature didn't verify or the credential expired."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def sign_credential(
    *,
    caller_id: str,
    callee_id: str,
    action: str,
    tenant_id: str,
    scope: list[str],
    parent_jti: str | None = None,
    parent_scope: list[str] | None = None,
    parent_tenant_id: str | None = None,
    value_limit: int | None = None,
    declared_intent: str | None = None,
    chain_id: str | None = None,
    ttl_seconds: int = 300,
) -> dict[str, Any]:
    """Sign a delegation credential enforcing Layer 1 at construction.

    Returns a dict including the encoded JWT under `signature`.
    """
    if parent_scope is not None and not set(scope).issubset(set(parent_scope)):
        extra = sorted(set(scope) - set(parent_scope))
        raise AttenuationViolation(
            f"scope {extra} not in parent scope {sorted(parent_scope)}"
        )

    if parent_tenant_id is not None and parent_tenant_id != tenant_id:
        raise TenantMismatch(
            f"tenant_id {tenant_id} does not match parent tenant {parent_tenant_id}"
        )

    now = _now()
    expires_at = now + timedelta(seconds=ttl_seconds)
    payload: dict[str, Any] = {
        "jti": str(uuid.uuid4()),
        "chain_id": chain_id or str(uuid.uuid4()),
        "caller_id": caller_id,
        "callee_id": callee_id,
        "action": action,
        "tenant_id": tenant_id,
        "scope": sorted(set(scope)),
        "parent_jti": parent_jti,
        "value_limit": value_limit,
        "declared_intent": declared_intent,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    token = jwt.encode(payload, settings.HEIMDALL_SECRET, algorithm="HS256")
    payload["signature"] = token
    return payload


def sign_credential_unsafe(**kwargs: Any) -> dict[str, Any]:
    """Sign a credential WITHOUT attenuation or tenant checks.

    Used exclusively when Heimdall is toggled OFF for the contrast scene.
    The signature is still valid HS256 (so downstream verification works)
    but the protocol invariants are bypassed.
    """
    kwargs.pop("parent_scope", None)
    kwargs.pop("parent_tenant_id", None)
    return sign_credential(**kwargs)


def verify_credential(token: str) -> dict[str, Any]:
    """Decode + verify a single credential signature + expiration."""
    try:
        payload = jwt.decode(token, settings.HEIMDALL_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError as e:
        raise SignatureInvalid(str(e)) from e

    try:
        exp_dt = datetime.fromisoformat(payload["expires_at"])
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    except (KeyError, ValueError) as e:
        raise SignatureInvalid(f"bad expires_at: {e}") from e

    if _now() > exp_dt:
        raise SignatureInvalid("credential expired")

    return payload


def verify_chain(credentials: list[dict[str, Any]]) -> None:
    """Walk the chain in order. Raises on any Layer 1 violation."""
    if not credentials:
        raise ChainError("empty chain")

    chain_id = credentials[0]["chain_id"]
    expected_parent_jti: str | None = None
    expected_tenant_id = credentials[0]["tenant_id"]
    parent_scope: list[str] | None = None

    for i, cred in enumerate(credentials):
        verify_credential(cred["signature"])

        if cred["chain_id"] != chain_id:
            raise ChainError(f"chain_id mismatch at hop {i}")

        if cred.get("parent_jti") != expected_parent_jti:
            raise ChainError(
                f"parent_jti at hop {i} is {cred.get('parent_jti')}, "
                f"expected {expected_parent_jti}"
            )

        if cred["tenant_id"] != expected_tenant_id:
            raise TenantMismatch(
                f"tenant_id at hop {i} is {cred['tenant_id']}, "
                f"expected {expected_tenant_id}"
            )

        if parent_scope is not None and not set(cred["scope"]).issubset(set(parent_scope)):
            extra = sorted(set(cred["scope"]) - set(parent_scope))
            raise AttenuationViolation(
                f"hop {i} scope {extra} not in parent scope {sorted(parent_scope)}"
            )

        expected_parent_jti = cred["jti"]
        parent_scope = cred["scope"]
