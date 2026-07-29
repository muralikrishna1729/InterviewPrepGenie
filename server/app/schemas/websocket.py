"""
WebSocket message envelope contracts.

Inbound (client → server) and outbound (server → client) shapes for the
setup + live interview flow. Handlers may still accept raw dicts; these
models document the contract and can validate when useful.
"""

from typing import Literal

from pydantic import BaseModel, Field


# --- Inbound: client → server ---


class StartSetupMessage(BaseModel):
    type: Literal["start_setup"]


class SetupAnswerMessage(BaseModel):
    type: Literal["setup_answer"]
    field: Literal[
        "role",
        "interview_type",
        "tech_stack",
        "experience_level",
        "number_of_questions",
    ]
    value: str


class StartInterviewMessage(BaseModel):
    type: Literal["start_interview"]
    interview_id: str


class SubmitAnswerMessage(BaseModel):
    type: Literal["submit_answer"]
    question_id: str
    audio_base64: str = Field(
        description="Base64 audio blob, sent ONLY after the user confirms locally"
    )


# --- Outbound: server → client ---


class SetupQuestionMessage(BaseModel):
    type: Literal["setup_question"]
    field: str
    question_text: str


class SetupCompleteMessage(BaseModel):
    type: Literal["setup_complete"]
    interview_id: str
    summary: dict


class QuestionMessage(BaseModel):
    type: Literal["question"]
    question_id: str
    question_text: str
    order_index: int
    total_questions: int


class TranscriptReadyMessage(BaseModel):
    type: Literal["transcript_ready"]
    question_id: str
    transcript: str


class InterviewCompleteMessage(BaseModel):
    type: Literal["interview_complete"]
    interview_id: str
    # Feedback is generated async via Celery — client fetches GET /api/interviews/{id}


class ErrorMessage(BaseModel):
    type: Literal["error"]
    code: str
    message: str
    retryable: bool
