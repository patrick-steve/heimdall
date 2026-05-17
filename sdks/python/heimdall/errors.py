"""Heimdall SDK exception hierarchy."""
from __future__ import annotations

from typing import Any


class HeimdallError(Exception):
    """Base class for every Heimdall SDK error."""

    def __init__(self, message: str, *, status_code: int | None = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class AuthenticationError(HeimdallError):
    """Raised on 401 — missing or invalid API key."""


class InvalidPayloadError(HeimdallError):
    """Raised on 400 — the SDK constructed a malformed request."""


class NotFoundError(HeimdallError):
    """Raised on 404 — chain / agent / resource doesn't exist for this org."""


class NetworkError(HeimdallError):
    """Raised when the underlying HTTP transport failed before a response arrived."""
