"""Loads vertical-specific YAML at runtime and tracks per-session state.

Originally single-tenant; refactored to be session-keyed via ContextVar
so two visitors hitting the same backend cannot observe each other's
toggles, vertical, or in-flight scenarios. See backend/session.py for
how the active session id is plumbed through.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import yaml

from backend.config import settings
from backend.session import current_session_id

VERTICALS_DIR: Path = settings.REPO_ROOT / "verticals"
AVAILABLE_VERTICALS: list[str] = ["defi", "healthcare", "customer_service"]


@dataclass
class SessionPolicyState:
    """Mutable, per-session policy state. One instance per session id."""
    active_vertical: str = "defi"
    heimdall_enabled: bool = True


_sessions: dict[str, SessionPolicyState] = {}
_sessions_lock = Lock()


def _state() -> SessionPolicyState:
    sid = current_session_id()
    with _sessions_lock:
        if sid not in _sessions:
            _sessions[sid] = SessionPolicyState()
        return _sessions[sid]


def set_active_vertical(name: str) -> None:
    if name not in AVAILABLE_VERTICALS:
        raise ValueError(f"Unknown vertical: {name}")
    _state().active_vertical = name


def get_active_vertical() -> str:
    return _state().active_vertical


def get_heimdall_enabled() -> bool:
    return _state().heimdall_enabled


def set_heimdall_enabled(enabled: bool) -> None:
    _state().heimdall_enabled = bool(enabled)


def _load_yaml(relative_path: str) -> dict[str, Any]:
    path = VERTICALS_DIR / get_active_vertical() / relative_path
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_active_policies() -> list[dict[str, Any]]:
    return list(_load_yaml("policy.yaml").get("policies", []))


def get_active_agents() -> list[dict[str, Any]]:
    return list(_load_yaml("agents.yaml").get("agents", []))


def get_active_prompts() -> dict[str, str]:
    return dict(_load_yaml("prompts.yaml").get("prompts", {}))


def get_active_lobster_trap_rules() -> list[dict[str, Any]]:
    return list(_load_yaml("lobster_trap.yaml").get("rules", []))


def session_count() -> int:
    with _sessions_lock:
        return len(_sessions)
