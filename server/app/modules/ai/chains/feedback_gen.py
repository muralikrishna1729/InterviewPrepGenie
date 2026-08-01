"""
LangChain chain w/ Pydantic structured output: generate Feedback
(strengths, weaknesses, improvements, summary, score, model_answers) from full transcript.

model_answers are generated in a SEPARATE dedicated LLM call from the core
feedback. In practice the combined single call intermittently drops
model_answers (leaving them []), which showed up as "No model answer
available" on the results page. A focused call with exactly the questions
produces them reliably.
"""

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_FAST, MODEL_STANDARD, generate_completion, generate_structured
from app.schemas.feedback import FeedbackResult

logger = get_logger(__name__)


def _format_transcript(qa_pairs: list[dict[str, str]]) -> str:
    """Turn the Q&A list into a readable transcript string."""
    lines = []
    for idx, qa in enumerate(qa_pairs, 1):
        question = qa.get("question", "")
        answer = qa.get("answer", "")
        lines.append(f"Q{idx}: {question}\nA{idx}: {answer}\n")
    return "\n".join(lines)


async def _generate_core_feedback(
    role: str,
    tech_stack: list[str],
    experience_level: str,
    qa_pairs: list[dict[str, str]],
) -> FeedbackResult:
    """Generate score/summary/strengths/weaknesses/improvements (no model answers)."""
    stack_str = ", ".join(tech_stack) if tech_stack else "General"
    transcript_str = _format_transcript(qa_pairs)

    system_prompt = f"""You are an expert technical interviewer assessing a candidate for a {experience_level}-level {role} position.
Their key focus area/tech stack includes: {stack_str}.

Analyze their responses to the questions asked. Look for technical correctness, depth of knowledge, and communication style.

Produce a structured JSON feedback with exactly these fields:
- score: Integer from 0 to 100 representing their overall performance. Be realistic and objective.
- summary: A 2-3 sentence high-level overview of their performance.
- strengths: A list of 2-4 points highlighting what they did well.
- weaknesses: A list of 2-4 points pointing out technical gaps, incorrect answers, or areas where they lacked detail.
- improvements: A list of 2-4 concrete, actionable tips on how they can improve for future interviews.
- model_answers: An empty array [] — this field is filled by a separate call."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Here is the interview transcript:\n\n{transcript_str}"},
    ]

    return await generate_structured(
        messages, response_model=FeedbackResult, model=MODEL_STANDARD
    )


async def _generate_model_answers(
    role: str,
    tech_stack: list[str],
    experience_level: str,
    qa_pairs: list[dict[str, str]],
) -> list[str]:
    """Generate exactly one model answer per question, in order. Dedicated call."""
    stack_str = ", ".join(tech_stack) if tech_stack else "General"
    num_questions = len(qa_pairs)

    question_lines = []
    for idx, qa in enumerate(qa_pairs, 1):
        question_lines.append(f"Q{idx}: {qa.get('question', '')}")
    questions_str = "\n".join(question_lines)

    system_prompt = f"""You are an expert technical interviewer for a {experience_level}-level {role} position.
Their key focus area/tech stack includes: {stack_str}.

You will be given {num_questions} interview questions that were asked in a real interview.
For EACH question, produce ONE combined text block (a single string) that contains two labeled parts:

1. "Suggestion:" — 1-2 sentences on how the candidate could have improved this specific answer.
   Be concrete: point out missing depth, structure, or a stronger framing they skipped.
2. "Model answer:" — the full 3-6 sentence ideal answer, how a well-prepared {experience_level}-level
   candidate would respond. Frame it as a learning aid, not a rigid "only correct" answer.
   Use natural, second-person language (e.g. "A strong answer here might start by explaining... then mention...").

Return ONLY a valid JSON array of exactly {num_questions} strings — one combined block per question,
in the same order. Format each block like:

"Suggestion: <short improvement>. Model answer: <full ideal answer>."
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Here are the interview questions:\n\n{questions_str}"},
    ]

    # JSON array output — parse manually since the response model is a bare list
    raw = await generate_completion(
        messages, model=MODEL_STANDARD, max_tokens=2048,
        response_format={"type": "json_object"},
    )
    return _parse_json_list(raw, num_questions)


def _parse_json_list(raw: str, expected: int) -> list[str]:
    """Best-effort parse of the LLM's JSON array reply; pads/truncates to expected."""
    import json

    content = raw.strip()
    # LLMs sometimes wrap the array in an object like {"model_answers": [...]}
    if not content.startswith("["):
        try:
            obj = json.loads(content)
            if isinstance(obj, dict):
                for key in ("model_answers", "answers", "model_answer", "items"):
                    if key in obj and isinstance(obj[key], list):
                        content = json.dumps(obj[key])
                        break
        except json.JSONDecodeError:
            pass

    try:
        parsed = json.loads(content)
        if not isinstance(parsed, list):
            return []
        items: list[str] = []
        for item in parsed:
            if isinstance(item, str):
                items.append(item)
            elif isinstance(item, dict):
                text = (
                    item.get("model_answer")
                    or item.get("answer")
                    or item.get("text")
                    or item.get("suggestion")
                )
                items.append(str(text) if text is not None else "")
            else:
                items.append(str(item))
        # Pad/truncate to exactly the expected count
        return (items + [""] * expected)[:expected]
    except json.JSONDecodeError:
        logger.warning(
            "Model answers: LLM returned non-JSON, expected=%d raw_preview=%s",
            expected,
            raw[:200],
        )
        return []


async def generate_interview_feedback(
    role: str,
    tech_stack: list[str],
    experience_level: str,
    qa_pairs: list[dict[str, str]],
) -> FeedbackResult:
    """
    Analyzes the interview Q&A transcript and generates structured feedback
    including per-question model answers.

    Core feedback and model answers are generated in two separate LLM calls so
    that model answers are produced reliably (the combined call intermittently
    drops them). If the model-answers call fails, the core feedback still
    stands and model_answers falls back to an empty list rather than failing
    the whole feedback.
    """
    logger.info("Generating interview feedback for role: %s, level: %s", role, experience_level)

    result = await _generate_core_feedback(role, tech_stack, experience_level, qa_pairs)

    try:
        result.model_answers = await _generate_model_answers(
            role, tech_stack, experience_level, qa_pairs
        )
        logger.info(
            "Model answers generated: interview=%d questions, got=%d",
            len(qa_pairs),
            len(result.model_answers),
        )
    except Exception:
        logger.exception("Model answers generation failed — falling back to empty list")

    return result
