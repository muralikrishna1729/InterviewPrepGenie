"""
POST /api/interviews, GET /api/interviews, GET /api/interviews/{id},
PATCH /api/interviews/{id}/status
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
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

router = APIRouter(prefix="/api/interviews", tags=["interview"])


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview_endpoint(
    data: CreateInterviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = await create_interview(db, current_user.id, data)
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
    interviews = await list_interviews(db, current_user.id, status_filter, limit, offset)
    return [InterviewResponse.model_validate(i) for i in interviews]


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
async def get_interview_endpoint(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = await get_interview_detail(db, current_user.id, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return InterviewDetailResponse.model_validate(interview)


@router.patch("/{interview_id}/status", response_model=InterviewResponse)
async def update_interview_status_endpoint(
    interview_id: str,
    data: InterviewStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        interview = await update_interview_status(
            db, current_user.id, interview_id, data.status
        )
    except InterviewError as e:
        if e.reason == "not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
        if e.reason == "invalid_transition":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    return InterviewResponse.model_validate(interview)
