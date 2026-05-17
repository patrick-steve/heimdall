# Heimdall Python SDK

Runtime governance for AI agent delegation chains.

```bash
pip install heimdall-sdk
```

## Quick start

```python
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
    # proceed; pass result.credential to payment_agent on its next delegation
    print(f"Approved. Chain {result.chain_id}, hop depth {result.depth}.")
else:
    print(f"Blocked at {result.layer} layer by rule {result.rule}: {result.reason}")
```

## Multi-hop chains

Pass the previous hop's `credential` as `parent_credential`:

```python
first = hd.delegate(
    from_agent="user",
    to_agent="research_agent",
    action="read:data",
    capabilities=["read:data", "read:market"],
)
# Research agent now tries to escalate to a payment scope it doesn't have:
second = hd.delegate(
    parent_credential=first.credential,
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
)
assert second.denied  # capability_attenuation fires at Layer 1
```

## Errors

| Status | Exception                  | When                                |
|--------|----------------------------|-------------------------------------|
| 401    | `AuthenticationError`      | missing or invalid API key          |
| 400    | `InvalidPayloadError`      | malformed request body              |
| 404    | `NotFoundError`            | chain / agent not in this org       |
| 5xx    | `HeimdallError`            | server error                        |
| —      | `NetworkError`             | transport failure before response   |

All inherit from `HeimdallError`.

## Other operations

```python
hd.register_agent(id="my_agent", display_name="My Agent", role="executor", scope=["payment:send"])
hd.list_agents()
hd.list_chains(status="denied", limit=20)
hd.get_chain(chain_id="...")
hd.get_audit(chain_id="...")        # latest incident report (Markdown)
hd.whoami()                         # diagnostic: which org owns this key
```

Resource management:

```python
with Heimdall(api_key=...) as hd:
    ...
```

## License

MIT. See [github.com/patrick-steve/heimdall](https://github.com/patrick-steve/heimdall).
