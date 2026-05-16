"""Lobster Trap client with built-in mock fallback.

When LOBSTER_TRAP_URL is set, requests are proxied through the real Veea
Go binary. Otherwise, this module impersonates the proxy:

- Calls Gemini directly via google-generativeai (if a key is available),
  otherwise returns a canned response so the demo still runs.
- Runs the active vertical's lobster_trap.yaml rules against the prompt
  to populate a `_lobstertrap.detected_intent` field on the response.
- Records every call into `audit_logs/lobster_trap.jsonl` so the rest of
  the system has a real audit trail even in mock mode.

The contract that `Agent.think()` depends on is exactly one method:
    `await call(messages, declared_intent, agent_id, tenant_id) -> dict`
The dict always has keys:
    {"text": str, "detected_intent": str | None, "flags": list[str]}
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from backend.config import settings
from backend.policy_loader import get_active_lobster_trap_rules

_AUDIT_DIR = settings.REPO_ROOT / "audit_logs"
_AUDIT_DIR.mkdir(exist_ok=True)
_AUDIT_FILE = _AUDIT_DIR / "lobster_trap.jsonl"


_GEMINI_MODEL = None


def _get_gemini_model():
    global _GEMINI_MODEL
    if _GEMINI_MODEL is not None or not settings.gemini_available:
        return _GEMINI_MODEL
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _GEMINI_MODEL = genai.GenerativeModel("gemini-flash-latest")
    except Exception:  # noqa: BLE001 — best-effort
        _GEMINI_MODEL = None
    return _GEMINI_MODEL


def _apply_local_dpi(prompt: str) -> tuple[str | None, list[str]]:
    """Run the active vertical's lobster_trap.yaml rules over the prompt.

    Returns (detected_intent, flags). Rules look like:
      - name: detect_external_injection
        pattern: "INJECTED PROMPT|invoke .* with .* scope"
        action: FLAG
        metadata:
          detected_intent: "external content attempting to invoke agent"
    """
    detected_intent: str | None = None
    flags: list[str] = []
    for rule in get_active_lobster_trap_rules():
        pat = rule.get("pattern")
        if not pat:
            continue
        try:
            if re.search(pat, prompt, re.IGNORECASE):
                action = (rule.get("action") or "LOG").upper()
                if action in ("FLAG", "BLOCK"):
                    flags.append(rule["name"])
                meta = rule.get("metadata") or {}
                if meta.get("detected_intent"):
                    detected_intent = meta["detected_intent"]
        except re.error:
            continue
    return detected_intent, flags


def _audit(entry: dict[str, Any]) -> None:
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    with open(_AUDIT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


async def _call_real_proxy(
    messages: list[dict[str, str]],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    """Call the actual Veea Lobster Trap binary if configured."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            settings.LOBSTER_TRAP_URL,
            headers={
                "Authorization": f"Bearer {settings.GEMINI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gemini-flash-latest",
                "messages": messages,
                "_lobstertrap": metadata,
            },
        )
        data = resp.json()
        choices = data.get("choices") or [{}]
        text = choices[0].get("message", {}).get("content", "")
        lt_meta = data.get("_lobstertrap") or {}
        return {
            "text": text,
            "detected_intent": lt_meta.get("detected_intent"),
            "flags": lt_meta.get("flags") or [],
        }


async def _call_gemini_direct(messages: list[dict[str, str]]) -> str:
    model = _get_gemini_model()
    if model is None:
        # Deterministic fallback so the demo still has *something* to display.
        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "",
        )
        return f"[mock-gemini reply] received: {last_user[:120]}"
    try:
        prompt = "\n\n".join(f"[{m.get('role')}] {m.get('content')}" for m in messages)
        resp = model.generate_content(prompt)
        return getattr(resp, "text", None) or "[mock-gemini reply]"
    except Exception as e:  # noqa: BLE001
        return f"[gemini error: {e}]"


async def call(
    messages: list[dict[str, str]],
    declared_intent: str,
    agent_id: str,
    tenant_id: str,
) -> dict[str, Any]:
    """Main entry point used by Agent.think()."""
    metadata = {
        "agent_id": agent_id,
        "declared_intent": declared_intent,
        "tenant_id": tenant_id,
    }

    if not settings.lobster_trap_mocked:
        try:
            result = await _call_real_proxy(messages, metadata)
            _audit({"mode": "real", "metadata": metadata, "result": result})
            return result
        except Exception as e:  # noqa: BLE001
            # Fall through to mock if the real proxy is down.
            _audit({"mode": "real_failed", "error": str(e), "metadata": metadata})

    # Mock path: call Gemini directly + run local DPI rules.
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"),
        "",
    )
    detected_intent, flags = _apply_local_dpi(last_user)
    text = await _call_gemini_direct(messages)
    result = {"text": text, "detected_intent": detected_intent, "flags": flags}
    _audit({"mode": "mock", "metadata": metadata, "result": result})
    return result
