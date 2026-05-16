"""Per-session state via Python ContextVars.

Heimdall was originally built as a single-tenant demo (per plan.md's
NOT-BUILDING list). Once deployed publicly, every visitor connecting
to the same backend was seeing every other visitor's scenarios because
WebSocket broadcasts and process-level globals were not session-scoped.

This module fixes that. A FastAPI middleware reads the `X-Heimdall-Session`
header on every HTTP request and sets a ContextVar so any downstream code
can call `current_session_id()` without threading the id through every
function signature. WebSocket routes set the same ContextVar from a
`session_id` query parameter on connect.

Sessions are ephemeral, server-side. They survive process restarts only
in the sense that the client keeps the same id in sessionStorage and
re-establishes its session on reconnect; the backend rebuilds state
lazily on first reference.
"""
from __future__ import annotations

from contextvars import ContextVar
from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

DEFAULT_SESSION_ID = "default"
SESSION_HEADER = "x-heimdall-session"

_session_id: ContextVar[str] = ContextVar("heimdall_session_id", default=DEFAULT_SESSION_ID)


def current_session_id() -> str:
    """Return the session id for the active request / WS connection."""
    return _session_id.get()


def set_current_session_id(session_id: str) -> object:
    """Set the session for the current async task. Returns a token to reset."""
    return _session_id.set(session_id or DEFAULT_SESSION_ID)


def reset_session_id(token: object) -> None:
    """Restore a previous ContextVar binding."""
    _session_id.reset(token)  # type: ignore[arg-type]


class SessionMiddleware(BaseHTTPMiddleware):
    """Reads `X-Heimdall-Session` on every HTTP request and binds it to
    the ContextVar for the duration of the request."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        sid = request.headers.get(SESSION_HEADER) or request.query_params.get("session_id") or DEFAULT_SESSION_ID
        token = _session_id.set(sid)
        try:
            return await call_next(request)
        finally:
            _session_id.reset(token)
