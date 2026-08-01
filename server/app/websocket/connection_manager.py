"""
Tracks active WebSocket connections keyed by user_id.

One connection per user: a new connect closes the previous socket so two
tabs cannot own the same interview session.
"""

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self._connections:
            old_ws = self._connections[user_id]
            try:
                await old_ws.close(code=4000, reason="Reconnected from another session")
            except Exception:
                logger.debug("ws_replacing_failed", user_id=user_id)
            logger.info("ws_replacing", user_id=user_id, reason="new_connection")

        await websocket.accept()
        self._connections[user_id] = websocket
        logger.info("ws_connected", user_id=user_id, active=len(self._connections))

    def disconnect(self, user_id: str) -> None:
        removed = self._connections.pop(user_id, None)
        if removed is not None:
            logger.info(
                "ws_disconnected",
                user_id=user_id,
                active=len(self._connections),
            )

    async def send_json(self, user_id: str, data: dict) -> None:
        ws = self._connections.get(user_id)
        if ws is None:
            logger.warning("WS send skipped — no connection for user_id=%s type=%s", user_id, data.get("type"))
            return
        await ws.send_json(data)
        logger.debug("WS send user_id=%s type=%s", user_id, data.get("type"))

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections


manager = ConnectionManager()
