"""Heimdall — agent governance SDK.

A Heimdall server enforces who an AI agent is allowed to delegate to, what
authority it can pass on, and what each chain of delegations actually does.

Quick start:

    from heimdall import Heimdall

    hd = Heimdall(api_key="hd_live_xxx", base_url="https://heimdall.example.com")

    result = hd.delegate(
        from_agent="research_agent",
        to_agent="payment_agent",
        action="payment:send",
        capabilities=["payment:send"],
        declared_intent="wire $5,000 to vendor for invoice #4421",
    )

    if result.allowed:
        proceed_with(credential=result.credential)
    else:
        log.warn("Heimdall blocked", rule=result.rule, reason=result.reason)
"""
from heimdall.client import Heimdall
from heimdall.errors import (
    AuthenticationError,
    HeimdallError,
    InvalidPayloadError,
    NetworkError,
    NotFoundError,
)
from heimdall.types import (
    Agent,
    ChainSummary,
    DelegationResult,
    Evaluation,
    Hop,
    IncidentReport,
)

__version__ = "0.1.0"
__all__ = [
    "Heimdall",
    "DelegationResult",
    "Evaluation",
    "Agent",
    "ChainSummary",
    "Hop",
    "IncidentReport",
    "HeimdallError",
    "AuthenticationError",
    "InvalidPayloadError",
    "NotFoundError",
    "NetworkError",
]
