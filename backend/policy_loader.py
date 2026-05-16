"""Loads vertical-specific YAML at runtime and tracks active vertical state.

State is process-global by design — Heimdall is single-org, single-process,
localhost-only (per the explicit NOT-BUILDING list).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from backend.config import settings

VERTICALS_DIR: Path = settings.REPO_ROOT / "verticals"
AVAILABLE_VERTICALS: list[str] = ["defi", "healthcare", "customer_service"]

_active_vertical: str = "defi"
_heimdall_enabled: bool = True


def set_active_vertical(name: str) -> None:
    global _active_vertical
    if name not in AVAILABLE_VERTICALS:
        raise ValueError(f"Unknown vertical: {name}")
    _active_vertical = name


def get_active_vertical() -> str:
    return _active_vertical


def get_heimdall_enabled() -> bool:
    return _heimdall_enabled


def set_heimdall_enabled(enabled: bool) -> None:
    global _heimdall_enabled
    _heimdall_enabled = bool(enabled)


def _load_yaml(relative_path: str) -> dict[str, Any]:
    path = VERTICALS_DIR / _active_vertical / relative_path
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
