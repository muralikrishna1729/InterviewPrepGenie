from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, gen_uuid


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    interviews: Mapped[list["Interview"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    resume_analyses: Mapped[list["ResumeAnalysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    mcq_sessions: Mapped[list["McqSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")