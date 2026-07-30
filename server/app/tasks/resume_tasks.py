"""
Celery task: analyze_resume_task. Runs the resume_analysis chain,
persists the result. Handles both success and failure paths explicitly --
a failed analysis should update status="failed", not leave the row
stuck at "pending" forever.
"""

import asyncio

from app.celery_app import celery_app
from app.core.exceptions import AIServiceError
from app.core.logging import get_logger
from app.modules.ai.chains.resume_analysis import analyze_resume_text

logger = get_logger(__name__)


@celery_app.task(name="analyze_resume_task")
def analyze_resume_task(resume_analysis_id: str, resume_text: str) -> None:
    asyncio.run(_analyze_resume_async(resume_analysis_id, resume_text))


async def _analyze_resume_async(resume_analysis_id: str, resume_text: str) -> None:
    from app.db.base import celery_session
    from app.db.models import ResumeAnalysis

    logger.info("Resume task started: id=%s", resume_analysis_id)

    async with celery_session() as db:
        resume_analysis = await db.get(ResumeAnalysis, resume_analysis_id)
        if resume_analysis is None:
            logger.error("ResumeAnalysis %s not found, aborting task", resume_analysis_id)
            return

        try:
            result = await analyze_resume_text(resume_text)
            resume_analysis.score = result.score
            resume_analysis.strengths = result.strengths
            resume_analysis.weaknesses = result.weaknesses
            resume_analysis.grammar_suggestions = result.grammar_suggestions
            resume_analysis.ats_tips = result.ats_tips
            resume_analysis.improvements = result.improvements
            resume_analysis.status = "completed"
            logger.info(
                "Resume analysis completed: id=%s score=%d",
                resume_analysis_id,
                result.score,
            )
        except AIServiceError as e:
            logger.error("Resume analysis failed for %s: %s", resume_analysis_id, e)
            resume_analysis.status = "failed"
        except Exception:
            logger.exception("Resume analysis unexpected error for %s", resume_analysis_id)
            resume_analysis.status = "failed"

        await db.commit()
