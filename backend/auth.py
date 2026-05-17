"""API key authentication and org-scoping ContextVar.

Heimdall's v1 endpoints expect `Authorization: Bearer hd_xxx`. The middleware
hashes the supplied key, looks up the owning organization, and binds an
`org_id` ContextVar so downstream code can call `current_org_id()` without
threading the id through every function signature.

Backwards compat — the legacy `/api/*` endpoints (used by the dashboard) do
NOT require an API key. When no Authorization header is present, the request
is treated as the Demo org. v1 routes additionally call `require_api_key`
as a dependency, which 401s if the request was just the demo fallback.

Sessions and orgs are orthogonal: an org is "who's calling Heimdall"
(API key), a session is "which dashboard tab is this" (UUID header).
Both ContextVars can be set on the same request.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from contextvars import ContextVar
from typing import Awaitable, Callable

from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from backend.config import settings
from backend.db import ApiKey, Organization, SessionLocal, utcnow

DEMO_ORG_ID = "demo"
DEMO_ORG_SLUG = "demo"
DEMO_ORG_NAME = "Demo"
DEMO_TENANT_ID = "acme_capital"

_org_id: ContextVar[str] = ContextVar("heimdall_org_id", default=DEMO_ORG_ID)
_authenticated: ContextVar[bool] = ContextVar("heimdall_authenticated", default=False)


def current_org_id() -> str:
    return _org_id.get()


def is_authenticated() -> bool:
    return _authenticated.get()


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_api_key(env: str = "live") -> str:
    """Generate a fresh API key. env is 'live' or 'test'."""
    body = secrets.token_hex(16)  # 32 hex chars → 128 bits
    return f"hd_{env}_{body}"


def display_prefix(raw: str) -> str:
    """First 16 chars for human-readable display (safe to log)."""
    return raw[:16]


class AuthMiddleware(BaseHTTPMiddleware):
    """Resolve an API key to an org and bind it to a ContextVar.

    No header → demo org (legacy endpoints keep working).
    Bad header → 401.
    Good header → org_id set, authenticated=True.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        org_id = DEMO_ORG_ID
        authenticated = False

        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            raw = auth_header[7:].strip()
            if raw:
                db = SessionLocal()
                try:
                    row = (
                        db.query(ApiKey)
                        .filter_by(key_hash=hash_api_key(raw), revoked_at=None)
                        .first()
                    )
                    if not row:
                        return JSONResponse(
                            status_code=401,
                            content={
                                "error": "invalid_api_key",
                                "message": "API key not recognised. Generate one with `heimdall keys create`.",
                            },
                        )
                    org_id = row.org_id
                    authenticated = True
                    # Throttle last_used_at writes to once a minute per key.
                    # SQLite returns naive datetimes; normalize both sides.
                    now = utcnow().replace(tzinfo=None)
                    last_used = row.last_used_at
                    if last_used is None or (now - last_used).total_seconds() > 60:
                        row.last_used_at = now
                        db.commit()
                finally:
                    db.close()

        org_token = _org_id.set(org_id)
        auth_token = _authenticated.set(authenticated)
        try:
            return await call_next(request)
        finally:
            _org_id.reset(org_token)
            _authenticated.reset(auth_token)


def require_api_key() -> None:
    """FastAPI dependency that rejects the demo fallback path.

    Use on /api/v1/* routes that must be hit with a real API key.
    """
    if not is_authenticated():
        raise HTTPException(
            status_code=401,
            detail={
                "error": "authentication_required",
                "message": "Provide an API key via `Authorization: Bearer hd_...`.",
            },
        )


def get_org(org_id: str) -> Organization | None:
    db = SessionLocal()
    try:
        return db.query(Organization).filter_by(id=org_id).first()
    finally:
        db.close()


def current_org() -> Organization:
    """Return the org row for the active request. Raises if missing."""
    org = get_org(current_org_id())
    if not org:
        raise HTTPException(
            status_code=500,
            detail={"error": "org_not_found", "message": f"Org {current_org_id()} is not provisioned."},
        )
    return org


def create_api_key(org_id: str, name: str, env: str = "live") -> tuple[str, ApiKey]:
    """Mint a new API key for the given org. Returns (raw_key, row).

    The raw key is shown ONCE; only its hash is stored.
    """
    raw = generate_api_key(env)
    db = SessionLocal()
    try:
        row = ApiKey(
            id=f"key_{uuid.uuid4().hex[:10]}",
            org_id=org_id,
            name=name,
            key_prefix=display_prefix(raw),
            key_hash=hash_api_key(raw),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    finally:
        db.close()
    return raw, row


def ensure_demo_org() -> tuple[str, str | None]:
    """Idempotently provision the Demo org and its first API key.

    Returns (org_id, freshly_minted_raw_key_or_None). When a key is freshly
    minted, the caller should log it prominently — it's the only time the raw
    value is visible.
    """
    db = SessionLocal()
    try:
        org = db.query(Organization).filter_by(id=DEMO_ORG_ID).first()
        if not org:
            org = Organization(
                id=DEMO_ORG_ID,
                name=DEMO_ORG_NAME,
                slug=DEMO_ORG_SLUG,
                default_tenant_id=DEMO_TENANT_ID,
            )
            db.add(org)
            db.commit()

        any_key = (
            db.query(ApiKey)
            .filter_by(org_id=DEMO_ORG_ID, revoked_at=None)
            .first()
        )
        if any_key:
            return (DEMO_ORG_ID, None)
    finally:
        db.close()

    preset = settings.HEIMDALL_DEMO_API_KEY
    if preset:
        if not preset.startswith(("hd_test_", "hd_live_")):
            preset = f"hd_test_{preset}"
        db = SessionLocal()
        try:
            row = ApiKey(
                id=f"key_{uuid.uuid4().hex[:10]}",
                org_id=DEMO_ORG_ID,
                name="env-preset demo key",
                key_prefix=display_prefix(preset),
                key_hash=hash_api_key(preset),
            )
            db.add(row)
            db.commit()
        finally:
            db.close()
        return (DEMO_ORG_ID, preset)

    raw, _ = create_api_key(DEMO_ORG_ID, "auto-generated demo key", env="test")
    return (DEMO_ORG_ID, raw)
