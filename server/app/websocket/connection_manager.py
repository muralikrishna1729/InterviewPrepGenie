"""
Tracks active WebSocket connections keyed by user_id.
Replaces the Node version's implicit single-ws-per-connection model with
an explicit manager (needed for reconnect/duplicate-connection handling).
"""
