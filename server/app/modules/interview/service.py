"""
CRUD service functions for Interview sessions.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Interview, Question
from app.schemas.interview import CreateInterviewRequest

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"pending", "in_progress"},
    "in_progress": {"in_progress", "completed"},
    "completed": {"completed"},
}


class InterviewError(Exception):
    """Raised for interview-specific failures (not found, invalid status transition)."""

    def __init__(self, reason: str, message: str | None = None):
        self.reason = reason
        self.message = message or reason
        super().__init__(self.message)


async def create_interview(
    db: AsyncSession, user_id: str, data: CreateInterviewRequest
) -> Interview:
    interview = Interview(
        user_id=user_id,
        role=data.role,
        interview_type=data.interview_type,
        tech_stack=data.tech_stack,
        experience_level=data.experience_level,
        number_of_questions=data.number_of_questions,
        status="pending",
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


async def list_interviews(
    db: AsyncSession,
    user_id: str,
    status: str | None,
    limit: int,
    offset: int,
) -> list[Interview]:
    stmt = (
        select(Interview)
        .where(Interview.user_id == user_id)
        .order_by(Interview.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status is not None:
        stmt = stmt.where(Interview.status == status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_interview_detail(
    db: AsyncSession, user_id: str, interview_id: str
) -> Interview | None:
    stmt = (
        select(Interview)
        .where(Interview.id == interview_id, Interview.user_id == user_id)
        .options(
            selectinload(Interview.questions).selectinload(Question.answer),
            selectinload(Interview.feedback),
            selectinload(Interview.transcript_chunks),
        )
    )
    result = await db.execute(stmt)
    interview = result.scalar_one_or_none()
    if interview is None:
        return None

    interview.questions.sort(key=lambda q: q.order_index)
    interview.transcript_chunks.sort(key=lambda c: c.timestamp)
    return interview


async def update_interview_status(
    db: AsyncSession, user_id: str, interview_id: str, new_status: str
) -> Interview:
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = result.scalar_one_or_none()
    if interview is None:
        raise InterviewError("not_found", "Interview not found")

    allowed = ALLOWED_TRANSITIONS.get(interview.status, set())
    if new_status not in allowed:
        raise InterviewError(
            "invalid_transition",
            f"Cannot transition from '{interview.status}' to '{new_status}'",
        )

    interview.status = new_status
    await db.commit()
    await db.refresh(interview)
    return interview
