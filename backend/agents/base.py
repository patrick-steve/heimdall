"""Generic agent class shared across roles and verticals.

The 4 role subclasses (coordinator, data_fetcher, executor, shadow) live
in separate files but inherit everything here. Differences between them
are encoded in the vertical's prompts.yaml + tools.py rather than in
Python subclasses, which keeps the LOC budget honest.
"""
from __future__ import annotations

from typing import Any, Awaitable, Callable

from backend import lobster_client

ToolFn = Callable[..., Awaitable[Any]]


class Agent:
    def __init__(
        self,
        agent_id: str,
        role: str,
        display_name: str,
        tenant_id: str,
        scope: list[str],
        system_prompt: str,
        tools: dict[str, ToolFn],
    ) -> None:
        self.agent_id = agent_id
        self.role = role
        self.display_name = display_name
        self.tenant_id = tenant_id
        self.scope = scope
        self.system_prompt = system_prompt
        self.tools = tools

    async def think(self, task: str) -> dict[str, Any]:
        """Call the LLM through Lobster Trap (or its mock).

        Returns:
            {"text": str, "detected_intent": str | None, "flags": list[str]}
        """
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": task},
        ]
        return await lobster_client.call(
            messages=messages,
            declared_intent=task[:200],
            agent_id=self.agent_id,
            tenant_id=self.tenant_id,
        )

    async def execute_tool(self, action: str, **params: Any) -> Any:
        if action not in self.tools:
            raise ValueError(
                f"agent {self.agent_id} has no tool '{action}' "
                f"(available: {list(self.tools)})"
            )
        return await self.tools[action](**params)
