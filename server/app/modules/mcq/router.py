"""
POST /api/mcq/generate, GET /api/mcq/{id}, POST /api/mcq/{id}/submit
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import McqSession, User
from app.modules.mcq.service import grade_answers, strip_answer_key
from app.schemas.mcq import (
    McqGenerateRequest,
    McqSessionResponse,
    McqSubmitRequest,
    McqSubmitResult,
)
from app.tasks.mcq_tasks import generate_mcq_task, grade_and_feedback_task

logger = get_logger(__name__)
router = APIRouter(prefix="/api/mcq", tags=["mcq"])


@router.post(
    "/generate",
    response_model=McqSessionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_mcq(
    data: McqGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info(
        "MCQ generate: user_id=%s job_title=%s",
        current_user.id,
        data.job_title,
    )
    mcq_session = McqSession(
        user_id=current_user.id,
        job_title=data.job_title,
        job_description=data.job_description,
        questions=[],
        status="pending",
    )
    db.add(mcq_session)
    await db.commit()
    await db.refresh(mcq_session)

    generate_mcq_task.delay(mcq_session.id, data.job_title, data.job_description)
    logger.info("MCQ generation queued: id=%s user_id=%s", mcq_session.id, current_user.id)

    return _to_response(mcq_session)


@router.get("/{mcq_id}", response_model=McqSessionResponse)
async def get_mcq_session(
    mcq_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(McqSession).where(
            McqSession.id == mcq_id, McqSession.user_id == current_user.id
        )
    )
    mcq_session = result.scalar_one_or_none()
    if mcq_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="MCQ session not found"
        )

    return _to_response(mcq_session)


@router.post("/{mcq_id}/submit", response_model=McqSubmitResult)
async def submit_mcq(
    mcq_id: str,
    data: McqSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(McqSession).where(
            McqSession.id == mcq_id, McqSession.user_id == current_user.id
        )
    )
    mcq_session = result.scalar_one_or_none()
    if mcq_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="MCQ session not found"
        )

    if mcq_session.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit -- session status is '{mcq_session.status}'",
        )

    score, correct_count, total = grade_answers(mcq_session.questions, data.answers)

    mcq_session.score = score
    mcq_session.correct_count = correct_count
    mcq_session.total = total
    mcq_session.status = "submitted"
    await db.commit()

    logger.info(
        "MCQ submitted: id=%s user_id=%s score=%d/%d",
        mcq_id,
        current_user.id,
        correct_count,
        total,
    )
    grade_and_feedback_task.delay(mcq_id)

    return McqSubmitResult(
        score=score, correct_count=correct_count, total=total, feedback=None
    )


def _to_response(mcq_session: McqSession) -> McqSessionResponse:
    """Only conversion path to API response — always strips correct_index."""
    questions_for_client = (
        strip_answer_key(mcq_session.questions)
        if mcq_session.status != "pending"
        else None
    )
    return McqSessionResponse(
        id=mcq_session.id,
        job_title=mcq_session.job_title,
        status=mcq_session.status,
        questions=questions_for_client,
        score=mcq_session.score,
        correct_count=mcq_session.correct_count,
        total=mcq_session.total,
        feedback=mcq_session.feedback,
        created_at=mcq_session.created_at,
    )
