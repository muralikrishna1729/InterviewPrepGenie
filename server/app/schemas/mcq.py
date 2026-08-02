"""
McqQuestion has correct_index (server-side only, in DB JSON).
McqQuestionForClient strips correct_index before sending to the frontend --
critical, since this is exactly the exposure this design must prevent.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class McqGenerateRequest(BaseModel):
    job_title: str | None = None
    job_description: str = ""


class McqQuestion(BaseModel):
    """Internal shape, stored in DB JSON column. Includes the answer key."""

    question_text: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    category: str  # "aptitude" | "job_specific"

    @model_validator(mode="before")
    @classmethod
    def normalize_question_keys(cls, data: Any) -> Any:
        """LLMs often emit 'question' / 'text' instead of 'question_text'."""
        if not isinstance(data, dict):
            return data
        if "question_text" not in data:
            for key in ("question", "text", "prompt", "q"):
                if key in data:
                    data = {**data, "question_text": data[key]}
                    break
        return data


class McqQuestionForClient(BaseModel):
    """What actually gets sent to the frontend before submission."""

    question_index: int
    question_text: str
    options: list[str]
    category: str


class McqSessionResponse(BaseModel):
    id: str
    job_title: str | None
    status: str  # "pending" | "ready" | "submitted" | "failed"
    questions: list[McqQuestionForClient] | None  # None while status="pending"
    score: int | None
    correct_count: int | None
    total: int | None
    feedback: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class McqSubmitRequest(BaseModel):
    answers: dict[int, int]  # {question_index: selected_option_index}


class McqSubmitResult(BaseModel):
    score: int
    correct_count: int
    total: int
    feedback: str | None  # None immediately after submit; populated once Celery finishes
