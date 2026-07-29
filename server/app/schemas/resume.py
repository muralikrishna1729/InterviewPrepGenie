"""
Pydantic schemas for resume analysis. ResumeAnalysisResult doubles as the
target schema for the LLM's structured output (generate_structured call).
"""

from datetime import datetime

from pydantic import BaseModel, Field


class ResumeAnalysisResult(BaseModel):
    """This exact shape is what Groq's structured output must produce."""

    score: int = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    grammar_suggestions: list[str]
    ats_tips: list[str]
    improvements: list[str]


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
