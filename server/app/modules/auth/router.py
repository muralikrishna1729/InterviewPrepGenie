"""
POST /api/auth/signup, POST /api/auth/login, POST /api/auth/logout,
GET /api/auth/profile
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.security import decode_token_payload
from app.db.base import get_db
from app.db.models import User
from app.modules.auth.service import AuthError, authenticate_user, create_user
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, token = await create_user(db, data)
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, token = await authenticate_user(db, data)
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    redis = Depends(get_redis),
):
    payload = decode_token_payload(credentials.credentials)
    if payload is None:
        return  # already invalid/expired, nothing to blacklist

    jti = payload.get("jti")
    exp = payload.get("exp")
    if jti and exp:
        ttl_seconds = max(int(exp - datetime.now(timezone.utc).timestamp()), 0)
        if ttl_seconds > 0:
            await redis.set(f"blacklist:{jti}", "1", ex=ttl_seconds)


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)