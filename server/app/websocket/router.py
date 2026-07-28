"""
/ws endpoint. Auth via token query param (JWT). Delegates to connection_manager
+ handlers based on session phase (setup vs interview).
Mirrors websocket.server.ts + interview.handler.ts's message-type switch.
"""
