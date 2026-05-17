"""The synchronous Heimdall client."""
from __future__ import annotations

from typing import Any

import httpx

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
    Hop,
    IncidentReport,
)


class Heimdall:
    """Synchronous client for the Heimdall v1 API.

    Args:
        api_key: An `hd_live_*` or `hd_test_*` API key from your Heimdall install.
        base_url: The URL where Heimdall is served. Defaults to localhost:8000.
        timeout: HTTP timeout in seconds. Defaults to 30.

    All methods raise:
        AuthenticationError on 401, NotFoundError on 404, InvalidPayloadError on
        400, HeimdallError on any other non-2xx, NetworkError on transport failure.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:8000",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )

    # ------------------------------------------------------------------ core

    def delegate(
        self,
        *,
        from_agent: str,
        to_agent: str,
        action: str,
        capabilities: list[str],
        declared_intent: str | None = None,
        detected_intent: str | None = None,
        parent_credential: str | None = None,
        value_limit: int | None = None,
        context: dict[str, Any] | None = None,
    ) -> DelegationResult:
        """Authorise one hop of a delegation chain.

        On the first hop, omit `parent_credential`. On subsequent hops, pass the
        credential string returned by the previous `delegate()` call.

        Returns a `DelegationResult`. Check `.allowed` / `.denied` to branch.
        """
        body: dict[str, Any] = {
            "from_agent": from_agent,
            "to_agent": to_agent,
            "action": action,
            "capabilities": list(capabilities),
        }
        if parent_credential is not None:
            body["parent_credential"] = parent_credential
        if declared_intent is not None:
            body["declared_intent"] = declared_intent
        if detected_intent is not None:
            body["detected_intent"] = detected_intent
        if value_limit is not None:
            body["value_limit"] = value_limit
        if context is not None:
            body["context"] = context

        data = self._post("/api/v1/delegate", body)
        return DelegationResult.from_dict(data)

    # -------------------------------------------------------- agent registry

    def register_agent(
        self,
        *,
        id: str,
        display_name: str,
        role: str,
        scope: list[str] | None = None,
        owner: str | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        """Register an agent. Idempotent: re-register updates the row."""
        body: dict[str, Any] = {
            "id": id,
            "display_name": display_name,
            "role": role,
        }
        if scope is not None:
            body["scope"] = list(scope)
        if owner is not None:
            body["owner"] = owner
        if tenant_id is not None:
            body["tenant_id"] = tenant_id
        return self._post("/api/v1/agents", body)

    def list_agents(self) -> list[Agent]:
        data = self._get("/api/v1/agents")
        return [Agent.from_dict(a) for a in data.get("agents", [])]

    # -------------------------------------------------------------- chains

    def list_chains(
        self,
        status: str | None = None,
        limit: int = 50,
    ) -> list[ChainSummary]:
        """List recent chains. status ∈ {None, 'allowed', 'denied', 'flagged'}."""
        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status
        data = self._get("/api/v1/chains", params=params)
        return [ChainSummary.from_dict(c) for c in data.get("chains", [])]

    def get_chain(self, chain_id: str) -> dict[str, Any]:
        """Return a chain's hops + evaluations. The hops are `Hop` objects."""
        data = self._get(f"/api/v1/chains/{chain_id}")
        return {
            "chain_id": data["chain_id"],
            "hops": [Hop.from_dict(h) for h in data.get("hops", [])],
            "evaluations": data.get("evaluations", []),
        }

    def get_audit(self, chain_id: str) -> IncidentReport:
        """Return the latest persisted incident report for a chain."""
        data = self._get(f"/api/v1/audit/{chain_id}")
        return IncidentReport.from_dict(data)

    def whoami(self) -> dict[str, Any]:
        """Return the org the current API key belongs to. Useful for diagnostics."""
        return self._get("/api/v1/whoami")

    # ---------------------------------------------------------- lifecycle

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "Heimdall":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # ------------------------------------------------------------ internals

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        try:
            r = self._client.get(path, params=params)
        except httpx.HTTPError as e:
            raise NetworkError(f"GET {path} failed: {e}") from e
        return self._handle(r)

    def _post(self, path: str, body: dict[str, Any]) -> Any:
        try:
            r = self._client.post(path, json=body)
        except httpx.HTTPError as e:
            raise NetworkError(f"POST {path} failed: {e}") from e
        return self._handle(r)

    @staticmethod
    def _handle(r: "httpx.Response") -> Any:
        try:
            data = r.json()
        except Exception:
            data = r.text

        if r.status_code == 200:
            return data
        if r.status_code == 401:
            raise AuthenticationError(_msg(data), status_code=401, body=data)
        if r.status_code == 400:
            raise InvalidPayloadError(_msg(data), status_code=400, body=data)
        if r.status_code == 404:
            raise NotFoundError(_msg(data), status_code=404, body=data)
        raise HeimdallError(_msg(data), status_code=r.status_code, body=data)


def _msg(body: Any) -> str:
    if isinstance(body, dict):
        detail = body.get("detail")
        if isinstance(detail, dict):
            return detail.get("message") or detail.get("error") or str(detail)
        if detail:
            return str(detail)
        return body.get("message") or body.get("error") or str(body)
    return str(body)
