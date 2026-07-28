"""
JWT encode/decode (python-jose) + password hashing (bcrypt with SHA-256 pre-hash).
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt

from app.config import settings

ALGORITHM = "HS256"


def _password_digest(password: str) -> bytes:
    """SHA-256 digest so bcrypt never sees passwords longer than 72 bytes."""
    return hashlib.sha256(password.encode("utf-8")).digest()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(_password_digest(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        _password_digest(plain_password),
        hashed_password.encode("utf-8"),
    )


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "jti": str(uuid.uuid4())}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token_payload(token: str) -> dict | None:
    """Returns the full payload (sub, exp, jti) if valid, None if invalid/expired."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
