# Integrating Heimdall

> Three recipes — pick the one closest to your runtime.

Every recipe assumes:

- A running Heimdall (`docker compose up`) at `http://localhost:8000`.
- An API key in `HEIMDALL_API_KEY`. Mint with `heimdall keys create --name my-app`.
- Both agents involved are registered. Either pre-register them via
  `POST /api/v1/agents`, or rely on the dashboard's preset agents.

The pattern is the same in every recipe: **before any agent delegates to
another agent, call `delegate()`. If the response is ALLOW, pass the
returned `credential` as `parent_credential` on the next hop. If DENY,
refuse to proceed.**

---

## Recipe 1 — Raw Python loop

The minimum viable integration. Works in any orchestrator that exposes the
sequence of agent-to-agent calls as a normal Python flow.

```python
import os
from heimdall import Heimdall, HeimdallError

hd = Heimdall(api_key=os.environ["HEIMDALL_API_KEY"])

def run_agent_step(*, from_agent, to_agent, action, capabilities, parent=None, declared_intent=None):
    try:
        result = hd.delegate(
            from_agent=from_agent,
            to_agent=to_agent,
            action=action,
            capabilities=capabilities,
            parent_credential=parent,
            declared_intent=declared_intent,
        )
    except HeimdallError as e:
        raise RuntimeError(f"Heimdall unavailable: {e}") from e

    if result.denied:
        raise PermissionError(
            f"{from_agent} → {to_agent}/{action} blocked at {result.layer} layer"
            f" by {result.rule}: {result.reason}"
        )
    return result.credential   # pass to the next hop

# Two-hop example
hop1 = run_agent_step(
    from_agent="user", to_agent="research_agent",
    action="read:data", capabilities=["read:data", "read:market"],
    declared_intent="What's Tesla's Q4 outlook?",
)
hop2 = run_agent_step(
    parent=hop1,
    from_agent="research_agent", to_agent="search_agent",
    action="read:market", capabilities=["read:market"],
)
```

That's the entire integration. The control flow is yours; Heimdall just
gates each transition.

---

## Recipe 2 — FastAPI middleware

For services where every inbound request is one agent invoking another. The
middleware sits in front of the existing routes and short-circuits the
request if Heimdall denies it.

```python
# heimdall_middleware.py
import os
from heimdall import Heimdall, AuthenticationError, HeimdallError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

hd = Heimdall(api_key=os.environ["HEIMDALL_API_KEY"])


class HeimdallMiddleware(BaseHTTPMiddleware):
    """Authorise every agent call through Heimdall before it reaches the route.

    Expects each request to carry:
      X-Agent-From, X-Agent-To, X-Agent-Action,
      X-Agent-Capabilities (comma-separated),
      X-Agent-Parent-Credential (optional; omitted on the first hop).
    """

    async def dispatch(self, request, call_next):
        from_agent = request.headers.get("x-agent-from")
        to_agent = request.headers.get("x-agent-to")
        action = request.headers.get("x-agent-action")
        if not (from_agent and to_agent and action):
            return await call_next(request)   # not an agent call; let it through

        capabilities = [c.strip() for c in (request.headers.get("x-agent-capabilities") or "").split(",") if c.strip()]
        parent = request.headers.get("x-agent-parent-credential") or None

        try:
            r = hd.delegate(
                from_agent=from_agent,
                to_agent=to_agent,
                action=action,
                capabilities=capabilities,
                parent_credential=parent,
            )
        except (HeimdallError, AuthenticationError) as e:
            return JSONResponse({"error": "heimdall_unavailable", "message": str(e)}, status_code=502)

        if r.denied:
            return JSONResponse(
                {
                    "error": "delegation_denied",
                    "rule": r.rule,
                    "layer": r.layer,
                    "reason": r.reason,
                    "chain_id": r.chain_id,
                },
                status_code=403,
            )

        response = await call_next(request)
        # Surface the credential so the downstream callee can pass it forward.
        response.headers["X-Agent-Credential"] = r.credential or ""
        response.headers["X-Heimdall-Chain"] = r.chain_id
        return response


# main.py
from fastapi import FastAPI
from heimdall_middleware import HeimdallMiddleware

app = FastAPI()
app.add_middleware(HeimdallMiddleware)
```

Now every existing route is governance-aware without changing route code.

---

## Recipe 3 — LangChain `Runnable` adapter

Wrap an existing LCEL chain so every step hits Heimdall first. Works for
any `Runnable`.

```python
import os
from typing import Any
from heimdall import Heimdall
from langchain_core.runnables import Runnable, RunnableLambda, RunnableConfig

hd = Heimdall(api_key=os.environ["HEIMDALL_API_KEY"])


def heimdall_guard(
    inner: Runnable,
    *,
    from_agent: str,
    to_agent: str,
    action: str,
    capabilities: list[str],
) -> Runnable:
    """Wrap any Runnable so it is gated by a Heimdall delegation."""

    def _gated(input_: Any, config: RunnableConfig | None = None) -> Any:
        # Carry the parent credential through LCEL's config metadata.
        meta = (config or {}).get("metadata") or {}
        parent = meta.get("heimdall_credential")

        r = hd.delegate(
            from_agent=from_agent,
            to_agent=to_agent,
            action=action,
            capabilities=capabilities,
            parent_credential=parent,
            declared_intent=meta.get("heimdall_intent"),
        )
        if r.denied:
            raise PermissionError(
                f"{from_agent} → {to_agent}/{action} blocked: {r.rule} ({r.reason})"
            )

        # Forward the new credential so downstream steps can chain.
        new_config: RunnableConfig = {
            **(config or {}),
            "metadata": {**meta, "heimdall_credential": r.credential, "heimdall_chain": r.chain_id},
        }
        return inner.invoke(input_, new_config)

    return RunnableLambda(_gated)


# Usage — wrap an LCEL step:
#
#   chain = (
#       heimdall_guard(researcher, from_agent="user", to_agent="researcher",
#                      action="read:data", capabilities=["read:data","read:market"])
#       | heimdall_guard(summariser, from_agent="researcher", to_agent="summariser",
#                        action="read:market", capabilities=["read:market"])
#   )
#
#   chain.invoke({"question": "Tesla Q4?"})
```

The wrapper passes the credential through `RunnableConfig.metadata`, so
each gated step picks up its parent automatically.

---

## Picking a recipe

| If your runtime is…                            | Use                         |
|-----------------------------------------------|-----------------------------|
| Bespoke Python orchestration                  | Recipe 1                    |
| A FastAPI service per agent (microservices)   | Recipe 2                    |
| LangChain / LCEL                              | Recipe 3                    |
| Node / Bun / browser                          | Translate any of the above using the [TypeScript SDK](../sdks/typescript/README.md) |

In every case the contract with Heimdall is the same: call `delegate()`
before the next hop, branch on `decision`, forward `credential`.
