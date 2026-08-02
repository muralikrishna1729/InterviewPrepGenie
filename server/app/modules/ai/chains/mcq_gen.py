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
    system_prompt = f"""Generate exactly 20 high-quality, distinct multiple-choice questions
for a candidate applying to: {job_title or 'a technical role'}.

MIXED QUESTION TYPES — make sure you cover a variety (all 20 must be different questions, never repeat the same question or ask the same concept twice):
1. **Aptitude / reasoning** (category="aptitude") — 5 questions: logic, pattern, data interpretation, or quantitative reasoning.
2. **Job-specific conceptual** (category="job_specific") — 5 questions: directly from this job description, testing real understanding of the role's tools and concepts.
3. **Situational / behavioral** (category="situational") — 4 questions: "What would you do if...", prioritizing, handling conflict, or a realistic workplace scenario for this role. Each option must be a plausible action; only one is the best choice.
4. **Code output prediction** (category="code_output") — 4 questions: a short code snippet (Python/JS/TS as relevant to the role) and 4 possible outputs/behaviors. Only ONE is correct.
5. **Debugging / "find the bug"** (category="code_output") — 2 questions: a short buggy snippet and options describing the issue or correct fix.

Job description to ground the job-specific questions on:
{job_description or '(general technical role)'}

QUALITY RULES:
- Questions must test real UNDERSTANDING, not trivia recall. Favor "why", "what happens", "what would you do", "which is correct and why".
- Options must be plausible and distinct — no obviously-wrong fillers, no "all of the above", no trick wording.
- The correct answer must be unambiguous.
- Do not repeat a question or an option set.

Each question object MUST use these exact keys:
- "question_text": string (the question; include the code snippet inline if a code question)
- "options": array of exactly 4 strings
- "correct_index": integer 0-3
- "category": "aptitude" | "job_specific" | "situational" | "code_output"

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
