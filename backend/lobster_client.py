"""Lobster Trap client.

When LOBSTER_TRAP_URL is set, requests go through the real Veea Go binary
running on :8080 (or wherever Render hosts the second service). The proxy
performs DPI on every prompt and embeds an `_lobstertrap` block in the
response containing:

    {
      "request_id": "...",
      "verdict": "ALLOW|DENY|HUMAN_REVIEW",
      "ingress": {
        "declared": { "declared_intent": "...", "agent_id": "..." },
        "detected": { "intent_category": "...", "risk_score": 0.83,
                      "contains_injection_patterns": true, ... },
        "mismatches": [
          { "field": "intent", "declared": "...", "detected": "...",
            "severity": "critical" | "warning" | "info" }
        ],
        "action": "ALLOW|DENY|LOG|...",
        "rule_name": "..."
      },
      "egress": { ... same shape ... }
    }

Heimdall reads `ingress.mismatches` to fire the intent_mismatch rule
(critical → DENY, warning → FLAG, otherwise ALLOW).

When LOBSTER_TRAP_URL is unset, this module simulates the same response
shape locally so the dashboard and policy engine behave identically in
dev. The simulation uses the per-vertical lobster_trap.yaml regex rules
to populate the metadata + mismatches.
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
    except Exception:  # noqa: BLE001
        _GEMINI_MODEL = None
    return _GEMINI_MODEL


# ─────────────────────────── Simulation ────────────────────────────


_HIGH_RISK_INTENTS = {"credential_access", "system", "network"}

# Map the per-vertical YAML's rule names to a Lobster-Trap-shape
# intent_category so the simulation emits metadata that matches the real
# proxy's vocabulary.
_RULE_TO_CATEGORY = {
    "detect_external_injection": "credential_access",
    "detect_self_promote": "credential_access",
    "detect_phi_export": "data_access",
    "detect_diagnostic_injection": "system",
}


def _simulate_dpi(prompt: str, declared_intent: str | None) -> dict[str, Any]:
    """Run the active vertical's lobster_trap.yaml regex rules and emit
    the same metadata shape the real Lobster Trap returns."""
    detected_category = "general"
    flags: list[str] = []
    contains_injection = False

    for rule in get_active_lobster_trap_rules():
        pat = rule.get("pattern")
        if not pat:
            continue
        try:
            if re.search(pat, prompt, re.IGNORECASE):
                action = (rule.get("action") or "LOG").upper()
                if action in ("FLAG", "BLOCK"):
                    flags.append(rule["name"])
                name = rule.get("name", "")
                cat = _RULE_TO_CATEGORY.get(name)
                if cat:
                    detected_category = cat
                if "injection" in name or "promote" in name:
                    contains_injection = True
        except re.error:
            continue

    detected_metadata = {
        "intent_category": detected_category,
        "intent_confidence": 0.85 if detected_category != "general" else 0.5,
        "risk_score": 0.85 if contains_injection else 0.15,
        "contains_injection_patterns": contains_injection,
        "contains_credentials": False,
        "contains_pii": False,
        "contains_system_commands": False,
        "target_paths": [],
        "target_domains": [],
        "target_commands": [],
        "token_count": len(prompt) // 4,
    }

    mismatches: list[dict[str, Any]] = []
    if declared_intent and detected_category != "general":
        severity = "critical" if detected_category in _HIGH_RISK_INTENTS else "warning"
        mismatches.append({
            "field": "intent",
            "declared": declared_intent,
            "detected": detected_category,
            "severity": severity,
        })

    return {
        "request_id": f"sim-{datetime.now(timezone.utc).timestamp():.6f}",
        "verdict": "ALLOW",
        "ingress": {
            "declared": {"declared_intent": declared_intent},
            "detected": detected_metadata,
            "mismatches": mismatches,
            "action": "LOG",
            "rule_name": flags[0] if flags else "",
        },
    }


# ─────────────────────────── Real proxy ────────────────────────────


async def _call_real_proxy(
    messages: list[dict[str, str]],
    request_meta: dict[str, Any],
) -> dict[str, Any]:
    """Call the deployed Lobster Trap Go binary."""
    url = settings.LOBSTER_TRAP_URL.rstrip("/")
    if not url.endswith("/v1/chat/completions"):
        url = url + "/v1/chat/completions"
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.GEMINI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gemini-flash-latest",
                "messages": messages,
                "_lobstertrap": request_meta,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    choices = data.get("choices") or [{}]
    text = choices[0].get("message", {}).get("content", "")
    lt_block = data.get("_lobstertrap") or {}
    return {
        "text": text,
        "lt": lt_block,
    }


# ─────────────────────────── Direct Gemini fallback ────────────────


async def _call_gemini_direct(messages: list[dict[str, str]]) -> str:
    model = _get_gemini_model()
    if model is None:
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


# ─────────────────────────── Public entry ──────────────────────────


def _audit(entry: dict[str, Any]) -> None:
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    with open(_AUDIT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, default=str) + "\n")


async def call(
    messages: list[dict[str, str]],
    declared_intent: str,
    agent_id: str,
    tenant_id: str,
) -> dict[str, Any]:
    """Returns the model's text plus the full Lobster Trap inspection report.

    Shape:
      {
        "text": str,
        "detected_intent": str | None,   # intent_category for back-compat
        "flags": list[str],              # rule names that fired
        "mismatches": list[dict],        # declared-vs-detected discrepancies
        "verdict": str,                  # ALLOW / DENY / HUMAN_REVIEW
        "lt": dict,                      # full _lobstertrap block, for storage
      }
    """
    request_meta = {
        "agent_id": agent_id,
        "declared_intent": declared_intent,
        "tenant_id": tenant_id,
    }

    # 1. Try the real Veea proxy if configured.
    if not settings.lobster_trap_mocked:
        try:
            real = await _call_real_proxy(messages, request_meta)
            result = _shape(real["text"], real["lt"])
            _audit({"mode": "real", "metadata": request_meta, "result": result})
            return result
        except Exception as e:  # noqa: BLE001
            _audit({"mode": "real_failed", "error": str(e), "metadata": request_meta})

    # 2. Simulation path — local DPI on the prompt + direct Gemini call.
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"),
        "",
    )
    lt_block = _simulate_dpi(last_user, declared_intent)
    text = await _call_gemini_direct(messages)
    result = _shape(text, lt_block)
    _audit({"mode": "sim", "metadata": request_meta, "result": result})
    return result


def _shape(text: str, lt: dict[str, Any]) -> dict[str, Any]:
    """Project a Lobster Trap response into the dict Heimdall consumes."""
    ingress = (lt or {}).get("ingress") or {}
    detected = ingress.get("detected") or {}
    mismatches = ingress.get("mismatches") or []
    flags: list[str] = []
    if ingress.get("rule_name"):
        flags.append(ingress["rule_name"])
    return {
        "text": text,
        "detected_intent": detected.get("intent_category"),
        "flags": flags,
        "mismatches": mismatches,
        "verdict": (lt or {}).get("verdict", "ALLOW"),
        "lt": lt or {},
    }
