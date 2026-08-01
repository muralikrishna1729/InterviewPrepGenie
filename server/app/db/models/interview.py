from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, gen_uuid


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)
    interview_type: Mapped[str] = mapped_column(String, nullable=False)
    tech_stack: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    experience_level: Mapped[str] = mapped_column(String, nullable=False)
    number_of_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    difficulty: Mapped[str] = mapped_column(String, default="Medium")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="interviews")
    questions: Mapped[list["Question"]] = relationship(back_populates="interview", cascade="all, delete-orphan")
    feedback: Mapped["Feedback"] = relationship(
        back_populates="interview", uselist=False, cascade="all, delete-orphan"
    )
    transcript_chunks: Mapped[list["TranscriptChunk"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )