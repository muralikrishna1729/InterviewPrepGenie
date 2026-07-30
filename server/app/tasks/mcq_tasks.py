"""
Celery tasks: generate_mcq_task (creates 20 questions),
grade_and_feedback_task (generates AI commentary on submitted results --
grading itself already happened synchronously in the router).
"""

import asyncio

from app.celery_app import celery_app
from app.core.exceptions import AIServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="generate_mcq_task")
def generate_mcq_task(
    mcq_session_id: str, job_title: str | None, job_description: str
) -> None:
    asyncio.run(_generate_mcq_async(mcq_session_id, job_title, job_description))


async def _generate_mcq_async(
    mcq_session_id: str, job_title: str | None, job_description: str
) -> None:
    from app.db.base import celery_session
    from app.db.models import McqSession
    from app.modules.ai.chains.mcq_gen import generate_mcq_questions

    logger.info("MCQ generate task started: id=%s", mcq_session_id)

    async with celery_session() as db:
        mcq_session = await db.get(McqSession, mcq_session_id)
        if mcq_session is None:
            logger.error("McqSession %s not found", mcq_session_id)
            return

        try:
            questions = await generate_mcq_questions(job_title, job_description)
            mcq_session.questions = [q.model_dump() for q in questions]
            mcq_session.status = "ready"
            logger.info(
                "MCQ generate task completed: id=%s count=%d",
                mcq_session_id,
                len(questions),
            )
        except AIServiceError as e:
            logger.error("MCQ generation failed for %s: %s", mcq_session_id, e)
            mcq_session.status = "failed"
        except Exception:
            logger.exception("MCQ generation unexpected error for %s", mcq_session_id)
            mcq_session.status = "failed"

        await db.commit()


@celery_app.task(name="grade_and_feedback_task")
def grade_and_feedback_task(mcq_session_id: str) -> None:
    asyncio.run(_feedback_async(mcq_session_id))


async def _feedback_async(mcq_session_id: str) -> None:
    from app.db.base import celery_session
    from app.db.models import McqSession
    from app.modules.ai.llm import MODEL_FAST, generate_completion

    logger.info("MCQ feedback task started: id=%s", mcq_session_id)

    async with celery_session() as db:
        mcq_session = await db.get(McqSession, mcq_session_id)
        if mcq_session is None:
            logger.error("McqSession %s not found for feedback", mcq_session_id)
            return

        try:
            prompt = (
                f"A candidate scored {mcq_session.score}% ({mcq_session.correct_count}/"
                f"{mcq_session.total}) on an MCQ test for {mcq_session.job_title or 'a role'}. "
                "Write 2-3 sentences of constructive feedback on their performance."
            )
            feedback = await generate_completion(
                [{"role": "user", "content": prompt}],
                model=MODEL_FAST,
                max_tokens=150,
            )
            mcq_session.feedback = feedback
            logger.info("MCQ feedback task completed: id=%s", mcq_session_id)
        except AIServiceError as e:
            logger.error("MCQ feedback generation failed for %s: %s", mcq_session_id, e)
            mcq_session.feedback = (
                "Feedback generation failed. Your score has still been recorded."
            )
        except Exception:
            logger.exception("MCQ feedback unexpected error for %s", mcq_session_id)
            mcq_session.feedback = (
                "Feedback generation failed. Your score has still been recorded."
            )

        await db.commit()
