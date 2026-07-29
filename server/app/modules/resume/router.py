"""
POST /api/resume/analyze, GET /api/resume/{id}
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import ResumeAnalysis, User
from app.modules.resume.service import extract_resume_text
from app.schemas.resume import ResumeAnalysisResponse
from app.tasks.resume_tasks import analyze_resume_task

logger = get_logger(__name__)
router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post(
    "/analyze",
    response_model=ResumeAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_resume(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filename = file.filename or "upload"
    file_bytes = await file.read()
    logger.info(
        "Resume upload: user_id=%s filename=%s size=%d",
        current_user.id,
        filename,
        len(file_bytes),
    )

    try:
        extracted_text = extract_resume_text(filename, file_bytes)
    except ValueError as e:
        logger.warning("Resume extract failed: user_id=%s detail=%s", current_user.id, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    resume_analysis = ResumeAnalysis(
        user_id=current_user.id,
        filename=filename,
        status="pending",
        score=0,
        strengths=[],
        weaknesses=[],
        grammar_suggestions=[],
        ats_tips=[],
        improvements=[],
    )
    db.add(resume_analysis)
    await db.commit()
    await db.refresh(resume_analysis)

    analyze_resume_task.delay(resume_analysis.id, extracted_text)
    logger.info(
        "Resume analysis queued: id=%s user_id=%s",
        resume_analysis.id,
        current_user.id,
    )

    return ResumeAnalysisResponse.model_validate(resume_analysis)


@router.get("/{resume_id}", response_model=ResumeAnalysisResponse)
async def get_resume_analysis(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == resume_id,
            ResumeAnalysis.user_id == current_user.id,
        )
    )
    resume_analysis = result.scalar_one_or_none()
    if resume_analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume analysis not found",
        )

    return ResumeAnalysisResponse.model_validate(resume_analysis)
