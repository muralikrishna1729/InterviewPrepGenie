"""
Pydantic schemas for interview REST endpoints.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

InterviewType = Literal["Technical", "Non-Technical", "Mixed", "Behavioral","Project-Based","Hr"]
ExperienceLevel = Literal["Entry", "Mid", "Senior"]
InterviewStatus = Literal["pending", "in_progress", "completed"]
Difficulty = Literal["Easy", "Medium", "Hard"]


class CreateInterviewRequest(BaseModel):
    role: str = Field(min_length=1, max_length=100)
    interview_type: InterviewType
    tech_stack: list[str] = Field(default_factory=list)
    experience_level: ExperienceLevel
    number_of_questions: int = Field(ge=1, le=30)
    difficulty: Difficulty = "Medium"

    @model_validator(mode="after")
    def validate_tech_stack(self) -> "CreateInterviewRequest":
        if self.interview_type in ("Technical", "Mixed") and not self.tech_stack:
            raise ValueError("tech_stack is required for Technical and Mixed interview types")
        return self


class InterviewStatusUpdate(BaseModel):
    status: InterviewStatus


class InterviewResponse(BaseModel):
    id: str
    role: str
    interview_type: str
    tech_stack: list[str]
    experience_level: str
    difficulty: str
    number_of_questions: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnswerResponse(BaseModel):
    id: str
    transcript: str
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    order_index: int
    answer: AnswerResponse | None = None

    model_config = {"from_attributes": True}


class FeedbackResponse(BaseModel):
    id: str
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    model_answers: list[str] = []
    summary: str
    score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TranscriptChunkResponse(BaseModel):
    id: str
    speaker: str
    text: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class InterviewDetailResponse(InterviewResponse):
    questions: list[QuestionResponse]
    feedback: FeedbackResponse | None = None
    transcript_chunks: list[TranscriptChunkResponse]
