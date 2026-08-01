"""
POST /api/interviews, GET /api/interviews, GET /api/interviews/{id},
PATCH /api/interviews/{id}/status
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import User
from app.modules.interview.service import (
    InterviewError,
    create_interview,
    get_interview_detail,
    list_interviews,
    update_interview_status,
)
from app.schemas.interview import (
    CreateInterviewRequest,
    InterviewDetailResponse,
    InterviewResponse,
    InterviewStatusUpdate,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/api/interviews", tags=["interview"])


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview_endpoint(
    data: CreateInterviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info(
        "Create interview: user_id=%s, role=%s, type=%s",
        current_user.id,
        data.role,
        data.interview_type,
    )
    interview = await create_interview(db, current_user.id, data)
    logger.info("Interview created: interview_id=%s, user_id=%s", interview.id, current_user.id)
    return InterviewResponse.model_validate(interview)


@router.get("", response_model=list[InterviewResponse])
async def list_interviews_endpoint(
    status_filter: Literal["pending", "in_progress", "completed"] | None = Query(
        None, alias="status"
    ),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.debug(
        "List interviews: user_id=%s, status=%s, limit=%d, offset=%d",
        current_user.id,
        status_filter,
        limit,
        offset,
    )
    interviews = await list_interviews(db, current_user.id, status_filter, limit, offset)
    return [InterviewResponse.model_validate(i) for i in interviews]


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
async def get_interview_endpoint(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.debug("Get interview: interview_id=%s, user_id=%s", interview_id, current_user.id)
    interview = await get_interview_detail(db, current_user.id, interview_id)
    if interview is None:
        logger.warning("Interview not found: interview_id=%s, user_id=%s", interview_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return InterviewDetailResponse.model_validate(interview)


@router.post("/{interview_id}/model-answers", response_model=list[str])
async def generate_model_answers_endpoint(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates (and persists) model answers for an interview on demand.

    Used by the results page to recover sessions whose feedback was generated
    before model answers were reliably produced (empty model_answers). Generates
    ALL questions in a single LLM call and writes the result back to the
    interview's feedback row so it only needs to run once.
    """
    from app.modules.ai.chains.feedback_gen import _generate_model_answers

    interview = await get_interview_detail(db, current_user.id, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    qa_pairs = [
        {
            "question": q.question_text,
            "answer": q.answer.transcript if q.answer else "",
        }
        for q in sorted(interview.questions, key=lambda q: q.order_index)
    ]
    if not qa_pairs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This interview has no questions to generate model answers for.",
        )

    answers = await _generate_model_answers(
        role=interview.role,
        tech_stack=interview.tech_stack,
        experience_level=interview.experience_level,
        qa_pairs=qa_pairs,
    )

    # Persist back into the feedback row so a refresh doesn't re-generate
    if interview.feedback is not None:
        interview.feedback.model_answers = answers
        await db.commit()
        logger.info(
            "Model answers persisted: interview_id=%s count=%d",
            interview_id,
            len(answers),
        )
    else:
        logger.warning(
            "No feedback row to persist model answers into: interview_id=%s",
            interview_id,
        )

    return answers


@router.patch("/{interview_id}/status", response_model=InterviewResponse)
async def update_interview_status_endpoint(
    interview_id: str,
    data: InterviewStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info(
        "Update interview status: interview_id=%s, user_id=%s, new_status=%s",
        interview_id,
        current_user.id,
        data.status,
    )
    try:
        interview = await update_interview_status(
            db, current_user.id, interview_id, data.status
        )
    except InterviewError as e:
        if e.reason == "not_found":
            logger.warning("Interview not found: interview_id=%s, user_id=%s", interview_id, current_user.id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
        if e.reason == "invalid_transition":
            logger.warning(
                "Invalid status transition: interview_id=%s, detail=%s",
                interview_id,
                e.message,
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    logger.info("Interview status updated: interview_id=%s, status=%s", interview.id, interview.status)
    return InterviewResponse.model_validate(interview)
