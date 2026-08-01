"""
create_user, authenticate_user, get_user_by_email -- business logic, DB calls.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.schemas.auth import LoginRequest, SignupRequest

logger = get_logger(__name__)


class AuthError(Exception):
    """Raised for auth-specific failures (duplicate email, bad credentials)."""


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: SignupRequest) -> tuple[User, str]:
    existing = await get_user_by_email(db, data.email)
    if existing is not None:
        logger.warning("Signup rejected: email already registered (%s)", data.email)
        raise AuthError("Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("user_created", user_id=user.id, email=user.email)

    token = create_access_token(user.id)
    return user, token


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> tuple[User, str]:
    user = await get_user_by_email(db, data.email)

    if user is None or user.password_hash is None or not verify_password(data.password, user.password_hash):
        logger.warning("authentication_failed", email=data.email)
        raise AuthError("Invalid email or password")

    token = create_access_token(user.id)
    return user, token
