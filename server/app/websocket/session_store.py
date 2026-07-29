"""
Redis-backed session state for the WebSocket interview flow.

Replaces the Node version's in-memory sessions Map, which lost all state
on restart and could not scale past one instance.

TTL of 2 hours on every key — enough for a full interview, short enough
that abandoned sessions do not linger forever.
"""

import json

from app.core.logging import get_logger
from app.core.redis import redis_client

logger = get_logger(__name__)

SESSION_TTL_SECONDS = 7200  # 2 hours


def _setup_key(user_id: str) -> str:
    return f"session:{user_id}:setup"


def _interview_key(user_id: str) -> str:
    return f"session:{user_id}:interview"


async def get_setup_session(user_id: str) -> dict | None:
    raw = await redis_client.get(_setup_key(user_id))
    if raw is None:
        logger.debug("Setup session miss: user_id=%s", user_id)
        return None
    return json.loads(raw)


async def set_setup_session(user_id: str, data: dict) -> None:
    await redis_client.set(_setup_key(user_id), json.dumps(data), ex=SESSION_TTL_SECONDS)
    logger.debug("Setup session saved: user_id=%s phase=%s", user_id, data.get("phase"))


async def clear_setup_session(user_id: str) -> None:
    await redis_client.delete(_setup_key(user_id))
    logger.debug("Setup session cleared: user_id=%s", user_id)


async def get_interview_session(user_id: str) -> dict | None:
    raw = await redis_client.get(_interview_key(user_id))
    if raw is None:
        logger.debug("Interview session miss: user_id=%s", user_id)
        return None
    return json.loads(raw)


async def set_interview_session(user_id: str, data: dict) -> None:
    await redis_client.set(_interview_key(user_id), json.dumps(data), ex=SESSION_TTL_SECONDS)
    logger.debug(
        "Interview session saved: user_id=%s interview_id=%s q_index=%s",
        user_id,
        data.get("interview_id"),
        data.get("current_question_index"),
    )


async def clear_interview_session(user_id: str) -> None:
    await redis_client.delete(_interview_key(user_id))
    logger.debug("Interview session cleared: user_id=%s", user_id)
