from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator
from app.schemas.resume import _coerce_str_list

class FeedbackResult(BaseModel):
    """
    Structured feedback shape returned by the LLM.
    """
    score: int = Field(..., ge=0, le=100, description="Overall performance score from 0 to 100")
    summary: str = Field(..., description="A 2-3 sentence overview of the interview performance")
    strengths: list[str] = Field(..., description="Key technical/communication strengths observed")
    weaknesses: list[str] = Field(..., description="Areas where the candidate showed knowledge gaps or struggled")
    improvements: list[str] = Field(..., description="Actionable suggestions for how to improve")
    model_answers: list[str] = Field(default_factory=list, description="One ideal model answer per question, in order")

    @field_validator("strengths", "weaknesses", "improvements", "model_answers", mode="before")
    @classmethod
    def coerce_string_lists(cls, value: Any) -> list[str]:
        return _coerce_str_list(value)
