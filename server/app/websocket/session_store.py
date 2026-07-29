"""
Redis-backed session state for the WebSocket interview flow. Replaces the
Node version's in-memory `sessions` Map + `userSessionMap`, which lost all
state on restart and couldn't scale past one instance.

TTL of 2 hours on every key -- generous enough for a full interview session,
short enough that abandoned sessions (user closes tab mid-setup) don't
linger in Redis forever.
"""
import json 
from app.core.redis import redis_client
SEESION_TTL_SECONDS = 7200 # 2 hours

def _setup_key(user_id: str)->str:
    return f"session:{user_id}:setup"

def _interview_key(user_id: str)->str:
    return f"session:{user_id}:interview"

async def get_setup_session(user_id: str)->None:
    raw = await redis_client.get(_setup_key(user_id))
    return json.loads(raw) if raw else None

async def set_setup_session(user_id: str, data: dict)->None:
    await redis_client.set(_setup_key(user_id), json.dumps(data), ex=SEESION_TTL_SECONDS)

async def clear_setup_session(user_id: str)->None:
    await redis_client.delete(_setup_key(user_id))

async def get_interview_session(user_id: str)->None:
    raw = await redis_client.get(_interview_key(user_id))
    return json.loads(raw) if raw else None

async def set_interview_session(user_id: str, data: dict)->None:
    await redis_client.set(_interview_key(user_id), json.dumps(data), ex=SEESION_TTL_SECONDS)

async def clear_interview_session(user_id: str)->None:
    await redis_client.delete(_interview_key(user_id))
