"""
Celery task: generate_feedback_task(interview_id)
Runs after interview end -- full transcript -> feedback_gen chain -> persist Feedback row.
Not on the WebSocket's hot path.
"""

from app.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="generate_feedback_task")
def generate_feedback_task(interview_id: str) -> None:
    """Placeholder until feedback_gen chain is wired (step 6)."""
    logger.info("Feedback task queued/started: interview_id=%s", interview_id)
    # TODO: load Q&A, run feedback_gen chain, persist Feedback row
    logger.info("Feedback task stub complete: interview_id=%s", interview_id)
