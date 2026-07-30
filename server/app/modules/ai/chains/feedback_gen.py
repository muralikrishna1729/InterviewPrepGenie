"""
LangChain chain w/ Pydantic structured output: generate Feedback
(strengths, weaknesses, improvements, summary, score) from full transcript.
"""

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_STANDARD, generate_structured
from app.schemas.feedback import FeedbackResult

logger = get_logger(__name__)


async def generate_interview_feedback(
    role: str,
    tech_stack: list[str],
    experience_level: str,
    qa_pairs: list[dict[str, str]],
) -> FeedbackResult:
    """
    Analyzes the interview Q&A transcript and generates structured feedback.
    """
    logger.info("Generating interview feedback for role: %s, level: %s", role, experience_level)

    stack_str = ", ".join(tech_stack) if tech_stack else "General"
    
    # Format the transcript into a readable string
    transcript_lines = []
    for idx, qa in enumerate(qa_pairs, 1):
        question = qa.get("question", "")
        answer = qa.get("answer", "")
        transcript_lines.append(f"Q{idx}: {question}\nA{idx}: {answer}\n")
    transcript_str = "\n".join(transcript_lines)

    system_prompt = f"""You are an expert technical interviewer assessing a candidate for a {experience_level}-level {role} position.
Their key focus area/tech stack includes: {stack_str}.

Analyze their responses to the questions asked. Look for technical correctness, depth of knowledge, and communication style.

Produce a structured JSON feedback:
- score: Integer from 0 to 100 representing their overall performance. Be realistic and objective.
- summary: A 2-3 sentence high-level overview of their performance.
- strengths: A list of 2-4 points highlighting what they did well.
- weaknesses: A list of 2-4 points pointing out technical gaps, incorrect answers, or areas where they lacked detail.
- improvements: A list of 2-4 concrete, actionable tips on how they can improve for future interviews.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Here is the interview transcript:\n\n{transcript_str}"},
    ]

    return await generate_structured(
        messages, response_model=FeedbackResult, model=MODEL_STANDARD
    )
