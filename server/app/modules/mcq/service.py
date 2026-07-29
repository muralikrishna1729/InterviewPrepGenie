"""
Persist/retrieve McqSession rows, grade submitted answers (pure logic,
no AI). Question generation + feedback generation delegated to Celery.
"""

from app.schemas.mcq import McqQuestionForClient


def strip_answer_key(questions: list[dict]) -> list[McqQuestionForClient]:
    """Converts internal McqQuestion dicts (with correct_index) into the
    client-safe shape (without it). This is the one function that MUST
    be called before any question data reaches an HTTP response."""
    return [
        McqQuestionForClient(
            question_index=i,
            question_text=q["question_text"],
            options=q["options"],
            category=q["category"],
        )
        for i, q in enumerate(questions)
    ]


def grade_answers(
    questions: list[dict], submitted_answers: dict[int, int]
) -> tuple[int, int, int]:
    """Returns (score_percent, correct_count, total)."""
    total = len(questions)
    correct_count = sum(
        1
        for i, q in enumerate(questions)
        if submitted_answers.get(i) == q["correct_index"]
    )
    score = round((correct_count / total) * 100) if total > 0 else 0
    return score, correct_count, total
