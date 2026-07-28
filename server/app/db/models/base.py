"""
Shared Base class + helpers used by every model file in this package.
"""

import uuid

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def gen_uuid() -> str:
    return str(uuid.uuid4())