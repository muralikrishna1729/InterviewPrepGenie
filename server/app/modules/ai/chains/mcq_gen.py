"""
Generates 20 MCQ questions: 10 general aptitude + 10 job-specific
(based on job_title/job_description). Uses structured output to
guarantee exactly 4 options + a valid correct_index per question.
"""

from pydantic import BaseModel

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_STANDARD, generate_structured
from app.schemas.mcq import McqQuestion

logger = get_logger(__name__)


class McqQuestionList(BaseModel):
    questions: list[McqQuestion]


async def generate_mcq_questions(
    job_title: str | None, job_description: str
) -> list[McqQuestion]:
    system_prompt = f"""Generate exactly 20 multiple-choice questions for a candidate
applying to: {job_title or 'a technical role'}.

- 10 questions must be general aptitude/reasoning (category="aptitude")
- 10 questions must be specific to this job description (category="job_specific"):
{job_description or '(general technical role)'}

Each question object MUST use these exact keys:
- "question_text": string (the question)
- "options": array of exactly 4 strings
- "correct_index": integer 0-3
- "category": "aptitude" or "job_specific"

Return JSON like:
{{"questions": [{{"question_text": "...", "options": ["A","B","C","D"], "correct_index": 0, "category": "aptitude"}}]}}"""

    messages = [{"role": "system", "content": system_prompt}]
    logger.info("Generating MCQs: job_title=%s", job_title)
    result = await generate_structured(
        messages,
        response_model=McqQuestionList,
        model=MODEL_STANDARD,
        max_tokens=8192,
    )
    if len(result.questions) < 20:
        logger.warning(
            "MCQ generation returned %d questions (expected 20)", len(result.questions)
        )
    logger.info("MCQ generation done: count=%d", len(result.questions))
    return result.questions
