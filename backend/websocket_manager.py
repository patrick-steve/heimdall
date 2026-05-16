"""Broadcasts every domain event to the connected dashboard client(s)
that match the originating session id.

Originally a single global broadcaster. Refactored to track session_id
per connection and route broadcasts only to matching clients. Falls back
to broadcast-to-all when no session is in the ContextVar (e.g. startup).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

from backend.session import DEFAULT_SESSION_ID, current_session_id


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: dict[WebSocket, str] = {}

    async def connect(self, ws: WebSocket, session_id: str | None = None) -> None:
        await ws.accept()
        self.connections[ws] = session_id or DEFAULT_SESSION_ID

    def disconnect(self, ws: WebSocket) -> None:
        self.connections.pop(ws, None)

    async def broadcast(self, payload: dict[str, Any], session_id: str | None = None) -> None:
        """Broadcast `payload` only to clients whose session matches.

        Resolution order for the target session:
          1. Explicit `session_id` kwarg if provided.
          2. The ContextVar (set by HTTP middleware or WS handler).
          3. None → fall back to broadcast-to-all.

        The DEFAULT_SESSION_ID sentinel is treated as "no specific session";
        events emitted before any client connects (e.g. lifespan startup
        signals) reach every client.
        """
        if session_id is None:
            session_id = current_session_id()
        targeted = session_id and session_id != DEFAULT_SESSION_ID

        payload.setdefault("ts", datetime.now(timezone.utc).isoformat())
        if targeted:
            payload.setdefault("session_id", session_id)
        message = json.dumps(payload, default=str)

        dead: list[WebSocket] = []
        for ws, sid in list(self.connections.items()):
            if targeted and sid != session_id:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
