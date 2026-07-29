from pydantic import BaseModel
from typing import Literal

class StartSetupMessage(BaseModel):
    type: Literal["start_setup"]
    # No payload needed -- just signals "begin the setup conversation"

class SetupAnswerMessage(BaseModel):
    type: Literal["setup_answer"]
    field: Literal["role", "interview_type", "tech_stack", "experience_level", "number_of_questions"]
    value: str  # raw text answer to whichever setup question was just asked

class StartInterviewMessage(BaseModel):
    type: Literal["start_interview"]
    interview_id: str  # the Interview row created via POST /api/interviews earlier

class SubmitAnswerMessage(BaseModel):
    type: Literal["submit_answer"]
    question_id: str
    audio_base64: str  # base64-encoded audio blob, sent ONLY after user confirms locally

class SetupQuestionMessage(BaseModel):
    type: Literal["setup_question"]
    field: str          # which field this question is collecting
    question_text: str  # streamed/displayed text, e.g. "What role are you interviewing for?"

class SetupCompleteMessage(BaseModel):
    type: Literal["setup_complete"]
    interview_id: str
    summary: dict        # echoes back role/type/tech_stack/experience_level/question_count for confirmation

class QuestionMessage(BaseModel):
    type: Literal["question"]
    question_id: str
    question_text: str
    order_index: int
    total_questions: int

class TranscriptReadyMessage(BaseModel):
    type: Literal["transcript_ready"]
    question_id: str
    transcript: str       # sent back so frontend can show the user their own transcribed answer for review

class InterviewCompleteMessage(BaseModel):
    type: Literal["interview_complete"]
    interview_id: str
    # feedback generation is dispatched to Celery here, NOT included in this message --
    # frontend polls or fetches GET /api/interviews/{id} once feedback status flips

class ErrorMessage(BaseModel):
    type: Literal["error"]
    code: str            # e.g. "invalid_audio", "transcription_failed", "not_authorized"
    message: str
    retryable: bool       # mirrors AIServiceError.retryable -- tells frontend whether to let user retry   

