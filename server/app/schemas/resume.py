"""
Pydantic schemas for resume analysis. ResumeAnalysisResult doubles as the
target schema for the LLM's structured output (generate_structured call).
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


def _coerce_str_list(value: Any) -> list[str]:
    """LLMs sometimes return objects like {priority, action} instead of plain strings."""
    if not isinstance(value, list):
        return value
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict):
            text = (
                item.get("action")
                or item.get("text")
                or item.get("suggestion")
                or item.get("improvement")
                or item.get("tip")
            )
            out.append(str(text) if text is not None else str(item))
        else:
            out.append(str(item))
    return out


class ResumeAnalysisResult(BaseModel):
    """This exact shape is what Groq's structured output must produce."""

    score: int = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    grammar_suggestions: list[str]
    ats_tips: list[str]
    improvements: list[str]

    @field_validator(
        "strengths",
        "weaknesses",
        "grammar_suggestions",
        "ats_tips",
        "improvements",
        mode="before",
    )
    @classmethod
    def coerce_string_lists(cls, value: Any) -> list[str]:
        return _coerce_str_list(value)


class ResumeAnalysisResponse(BaseModel):
    id: str
    filename: str
    status: str  # "pending" | "completed" | "failed"
    score: int | None
    strengths: list[str]
    weaknesses: list[str]
    grammar_suggestions: list[str]
    ats_tips: list[str]
    improvements: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
