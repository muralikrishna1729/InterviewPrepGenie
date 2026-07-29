"""
Tracks active WebSocket connections keyed by user_id.
Replaces the Node version's implicit single-ws-per-connection model with
an explicit manager (needed for reconnect/duplicate-connection handling).
"""
from fastapi import WebSocket
class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        # If user already has a connection open, close the OLD one first --
        # prevents two tabs both believing they own the same interview session.
        if user_id in self.active_connections:
            old_ws = self._connections[user_id]
            await old_ws.close(code= 4000, reason="Reconnected from another session")
        await websocket.accept()
        self._connections[user_id] = websocket

    def disconnect(self, user_id: str)->None:
        self._connections.pop(user_id, None)
    
    async def send_message(self, user_id: str, data: str)->None:
        ws = self._connections.get(user_id)
        if ws is not None:
            await ws.send_json(data)
    
manager = ConnectionManager()
