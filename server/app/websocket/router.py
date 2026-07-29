"""
/ws endpoint. Authenticates via token query param, dispatches incoming
messages to the appropriate handler based on `type`.
"""

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.core.security import decode_token_payload
from app.websocket.connection_manager import manager
from app.websocket.handlers.interview_handler import (
    handle_start_interview,
    handle_submit_answer,
)
from app.websocket.handlers.setup_handler import handle_setup_answer, handle_start_setup

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    payload = decode_token_payload(token)
    if payload is None:
        logger.warning("WebSocket auth failed: invalid or expired token")
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("WebSocket auth failed: missing sub claim")
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    await manager.connect(user_id, websocket)
    logger.info("WebSocket session open: user_id=%s", user_id)

    try:
        while True:
            raw = await websocket.receive_json()
            msg_type = raw.get("type")
            logger.debug("WS message: user_id=%s type=%s", user_id, msg_type)

            try:
                if msg_type == "start_setup":
                    await handle_start_setup(user_id)
                elif msg_type == "setup_answer":
                    await handle_setup_answer(user_id, raw["field"], raw["value"])
                elif msg_type == "start_interview":
                    await handle_start_interview(user_id, raw["interview_id"])
                elif msg_type == "submit_answer":
                    await handle_submit_answer(
                        user_id, raw["question_id"], raw["audio_base64"]
                    )
                else:
                    await manager.send_json(
                        user_id,
                        {
                            "type": "error",
                            "code": "unknown_message_type",
                            "message": f"Unrecognized type: {msg_type}",
                            "retryable": False,
                        },
                    )
            except KeyError as e:
                logger.warning("Malformed WS message: user_id=%s missing=%s", user_id, e)
                await manager.send_json(
                    user_id,
                    {
                        "type": "error",
                        "code": "malformed_message",
                        "message": f"Missing required field: {e}",
                        "retryable": False,
                    },
                )
            except Exception:
                logger.exception("Unhandled WS handler error: user_id=%s type=%s", user_id, msg_type)
                await manager.send_json(
                    user_id,
                    {
                        "type": "error",
                        "code": "internal_error",
                        "message": "An unexpected error occurred",
                        "retryable": True,
                    },
                )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected: user_id=%s", user_id)
        manager.disconnect(user_id)
    except Exception:
        logger.exception("WebSocket connection error: user_id=%s", user_id)
        manager.disconnect(user_id)
