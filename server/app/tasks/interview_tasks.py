"""
Celery task: generate_feedback_task(interview_id)
Runs after interview end -- full transcript -> feedback_gen chain -> persist Feedback row.
Not on the WebSocket's hot path.
"""

import asyncio

from app.celery_app import celery_app
from app.core.exceptions import AIServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="generate_feedback_task")
def generate_feedback_task(interview_id: str) -> None:
    """Run the feedback generation task asynchronously."""
    asyncio.run(_generate_feedback_async(interview_id))


async def _generate_feedback_async(interview_id: str) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.db.base import celery_session
    from app.db.models import Interview, Feedback, Question
    from app.modules.ai.chains.feedback_gen import generate_interview_feedback

    logger.info("Feedback task started: interview_id=%s", interview_id)

    async with celery_session() as db:
        # Load interview, its questions, and their answers
        stmt = (
            select(Interview)
            .where(Interview.id == interview_id)
            .options(
                selectinload(Interview.questions).selectinload(Question.answer)
            )
        )
        result = await db.execute(stmt)
        interview = result.scalar_one_or_none()

        if interview is None:
            logger.error("Interview %s not found, aborting task", interview_id)
            return

        # Prepare question-answer pairs
        qa_pairs = []
        # Sort questions by their order index
        sorted_questions = sorted(interview.questions, key=lambda q: q.order_index)
        for q in sorted_questions:
            # We only generate feedback if there's an answer transcript
            if q.answer and q.answer.transcript.strip():
                qa_pairs.append({
                    "question": q.question_text,
                    "answer": q.answer.transcript
                })

        if not qa_pairs:
            logger.warning("No answers found for interview %s, creating empty feedback", interview_id)
            feedback = Feedback(
                interview_id=interview_id,
                strengths=["No responses provided."],
                weaknesses=["Candidate did not answer the questions."],
                improvements=["Ensure you participate in the interview next time."],
                summary="The interview was completed with no transcripts recorded.",
                score=0
            )
            db.add(feedback)
            await db.commit()
            return

        try:
            feedback_result = await generate_interview_feedback(
                role=interview.role,
                tech_stack=interview.tech_stack,
                experience_level=interview.experience_level,
                qa_pairs=qa_pairs
            )

            feedback = Feedback(
                interview_id=interview_id,
                strengths=feedback_result.strengths,
                weaknesses=feedback_result.weaknesses,
                improvements=feedback_result.improvements,
                summary=feedback_result.summary,
                score=feedback_result.score
            )
            db.add(feedback)
            logger.info("Feedback generated and saved successfully for interview %s", interview_id)
        except AIServiceError as e:
            logger.error("AI feedback generation failed for %s: %s", interview_id, e)
            # Create a placeholder / failed feedback entry so worker does not loop/crash
            feedback = Feedback(
                interview_id=interview_id,
                strengths=[],
                weaknesses=[],
                improvements=[],
                summary="AI feedback generation failed due to a service error.",
                score=0
            )
            db.add(feedback)
        except Exception:
            logger.exception("Unexpected error generating feedback for %s", interview_id)
            feedback = Feedback(
                interview_id=interview_id,
                strengths=[],
                weaknesses=[],
                improvements=[],
                summary="AI feedback generation failed due to an unexpected error.",
                score=0
            )
            db.add(feedback)

        await db.commit()
