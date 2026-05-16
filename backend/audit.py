"""Gemini-Pro powered incident report streamer with deterministic fallback.

`generate_incident_report_md` is an async generator that yields Markdown
chunks. The endpoint layer streams these to HTTP + the WebSocket so the
dashboard's IncidentReport panel can show the report typing out live.

Vertical-aware prompt templates select tone and regulatory references.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import AsyncIterator

from backend.config import settings

AUDIT_PROMPTS: dict[str, str] = {
    "defi": """You are writing an incident report for a financial institution's
compliance team. The following AI agent delegation chain was blocked by Heimdall.

Write a one-page report citing:
- What happened (chronological)
- Which policy clause(s) were violated and at which architectural layer
- Relevant regulatory frameworks (SEC, CFTC, MiCA)
- What evidence the audit trail provides

Format as a formal compliance memo in Markdown with these sections:
# Incident Summary
## Timeline
## Policy Violations
## Regulatory Context
## Evidence
## Recommendation

Chain log:
{chain_log}

Policy violations:
{violations}
""",
    "healthcare": """You are writing an incident report for a hospital compliance
officer. The following AI agent delegation chain was blocked by Heimdall.

Write a one-page HIPAA incident report citing:
- What happened
- Which policy clause was violated
- HIPAA Privacy Rule §164.502 and Security Rule §164.312 references
- Audit trail evidence

Format in Markdown with sections:
# HIPAA Incident Report
## Timeline
## Policy Violations
## HIPAA References
## Evidence
## Recommendation

Chain log:
{chain_log}

Policy violations:
{violations}
""",
    "customer_service": """You are writing an incident report for a customer
service operations lead. Heimdall blocked the following delegation chain.

Write a brief incident memo in Markdown with sections:
# Incident Summary
## Timeline
## Policy Violations
## Customer Impact
## Recommendation

Chain log:
{chain_log}

Policy violations:
{violations}
""",
}


def _build_prompt(chain_log: str, violations: str, vertical: str) -> str:
    template = AUDIT_PROMPTS.get(vertical, AUDIT_PROMPTS["defi"])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return (
        f"Today's date is {today}. Use this date in any timestamps. "
        "Do not invent dates from training data.\n\n"
        + template.format(chain_log=chain_log, violations=violations)
    )


def _mock_report(chain_log: str, violations: str, vertical: str) -> str:
    return f"""# Heimdall Incident Report — {vertical.upper()}

## Summary
A delegation chain was intercepted by Heimdall. This report is deterministically
generated (Gemini key not configured; live mode would stream a richer narrative).

## Timeline
```
{chain_log}
```

## Policy Violations
{violations}

## Evidence
Every hop above is cryptographically signed (HS256 JWT). Replay is available
from the dashboard.

## Recommendation
- Review the dormant agents identified above.
- Audit the scope inheritance graph for over-permissioned agents.
- Re-run with Heimdall enabled to confirm enforcement coverage.
"""


async def generate_incident_report_md(
    chain_log: str,
    violations: str,
    vertical: str,
) -> AsyncIterator[str]:
    """Stream Markdown chunks. Falls back to a deterministic template if
    no Gemini key is available or the streaming call fails."""
    if not settings.gemini_available:
        # Pretend-stream the mock report so the dashboard behaviour is identical.
        text = _mock_report(chain_log, violations, vertical)
        for chunk in _chunk(text, 80):
            await asyncio.sleep(0.04)
            yield chunk
        return

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # `gemini-pro-latest` aliases to gemini-3.1-pro which has zero
        # free-tier quota; `gemini-flash-latest` is fast, smart enough for
        # a one-page incident memo, and stays well inside the free tier.
        model = genai.GenerativeModel("gemini-flash-latest")
        prompt = _build_prompt(chain_log, violations, vertical)
        stream = model.generate_content(prompt, stream=True)
        # google-generativeai's stream is a synchronous iterator; offload it.
        loop = asyncio.get_event_loop()

        def _next(it):
            try:
                return next(it)
            except StopIteration:
                return None

        it = iter(stream)
        while True:
            chunk = await loop.run_in_executor(None, _next, it)
            if chunk is None:
                break
            text = getattr(chunk, "text", None)
            if text:
                yield text
    except Exception as e:  # noqa: BLE001 — fall back, never break the demo
        text = _mock_report(chain_log, violations, vertical)
        yield f"<!-- Gemini live mode failed: {e}; falling back to template. -->\n\n"
        for chunk in _chunk(text, 80):
            await asyncio.sleep(0.02)
            yield chunk


def _chunk(text: str, size: int):
    for i in range(0, len(text), size):
        yield text[i : i + size]
