"""
Handles the live interview phase. Sends questions as text, receives
CONFIRMED audio (already reviewed by the user client-side) exactly once
per question, transcribes via Groq Whisper, persists the Answer, advances
to the next question or completes the interview.

Audio is NEVER persisted -- decoded from base64, sent to Whisper, discarded
immediately after transcription.
"""

import base64
import binascii

from app.core.exceptions import AIServiceError
from app.core.logging import get_logger
from app.modules.ai.chains.question_gen import generate_next_question
from app.modules.ai.stt import transcribe_audio
from app.websocket.connection_manager import manager
from app.websocket.session_store import (
    clear_interview_session,
    get_interview_session,
    set_interview_session,
)

logger = get_logger(__name__)


async def handle_start_interview(user_id: str, interview_id: str) -> None:
    from app.db.base import AsyncSessionLocal
    from app.modules.interview.service import InterviewError, get_interview_detail, update_interview_status

    logger.info("interview_started", user_id=user_id, interview_id=interview_id)

    async with AsyncSessionLocal() as db:
        interview = await get_interview_detail(db, user_id, interview_id)
        if interview is None:
            logger.warning(
                "interview_start_failed",
                user_id=user_id,
                interview_id=interview_id,
                error="not_found",
            )
            await manager.send_json(
                user_id,
                {
                    "type": "error",
                    "code": "not_found",
                    "message": "Interview not found",
                    "retryable": False,
                },
            )
            return

        try:
            await update_interview_status(db, user_id, interview_id, "in_progress")
        except InterviewError as e:
            await manager.send_json(
                user_id,
                {
                    "type": "error",
                    "code": e.reason,
                    "message": e.message,
                    "retryable": False,
                },
            )
            return

        role = interview.role
        interview_type = interview.interview_type
        tech_stack = interview.tech_stack or []
        experience_level = interview.experience_level
        total_questions = interview.number_of_questions

    session = {
        "interview_id": interview_id,
        "current_question_index": 0,
        "total_questions": total_questions,
        "previous_qa": [],
        "current_question_id": None,
        "current_question_text": None,
        "role": role,
        "interview_type": interview_type,
        "tech_stack": tech_stack,
        "experience_level": experience_level,
        "difficulty": getattr(interview, "difficulty", "Medium"),
    }
    await set_interview_session(user_id, session)
    await _send_next_question(user_id, session)


async def _send_next_question(user_id: str, session: dict) -> None:
    from app.db.base import AsyncSessionLocal
    from app.db.models import Question

    try:
        question_text = await generate_next_question(
            role=session["role"],
            interview_type=session["interview_type"],
            tech_stack=session["tech_stack"],
            experience_level=session["experience_level"],
            difficulty=session.get("difficulty", "Medium"),
            previous_qa=session["previous_qa"],
            question_number=session["current_question_index"] + 1,
            total_questions=session["total_questions"],
        )
    except AIServiceError as e:
        logger.exception(
            "question_generation_failed",
            user_id=user_id,
            interview_id=session["interview_id"],
            question_index=session["current_question_index"],
            error=str(e),
            retryable=e.retryable,
        )
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "question_generation_failed",
                "message": e.message,
                "retryable": e.retryable,
            },
        )
        return

    async with AsyncSessionLocal() as db:
        question = Question(
            interview_id=session["interview_id"],
            question_text=question_text,
            order_index=session["current_question_index"],
        )
        db.add(question)
        await db.commit()
        await db.refresh(question)

    session["current_question_id"] = question.id
    session["current_question_text"] = question_text
    await set_interview_session(user_id, session)

    logger.info(
        "question_generation_succeeded",
        user_id=user_id,
        interview_id=session["interview_id"],
        question_index=session["current_question_index"],
        question_id=question.id,
    )
    await manager.send_json(
        user_id,
        {
            "type": "question",
            "question_id": question.id,
            "question_text": question_text,
            "order_index": session["current_question_index"],
            "total_questions": session["total_questions"],
        },
    )


async def handle_submit_answer(user_id: str, question_id: str, audio_base64: str) -> None:
    session = await get_interview_session(user_id)
    if session is None:
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "no_active_interview",
                "message": "No active interview session",
                "retryable": False,
            },
        )
        return

    if session["current_question_id"] != question_id:
        logger.warning(
            "Question mismatch: user_id=%s expected=%s got=%s",
            user_id,
            session["current_question_id"],
            question_id,
        )
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "question_mismatch",
                "message": "Submitted answer doesn't match current question",
                "retryable": False,
            },
        )
        return

    logger.info(
        "Submit answer: user_id=%s question_id=%s audio_bytes_b64=%d",
        user_id,
        question_id,
        len(audio_base64),
    )

    try:
        audio_bytes = base64.b64decode(audio_base64)
        transcript = await transcribe_audio(audio_bytes, filename="answer.webm")
    except (binascii.Error, ValueError) as e:
        logger.error("Invalid audio payload: user_id=%s error=%s", user_id, e)
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "invalid_audio",
                "message": "Received audio data was invalid or empty",
            },
        )
        return
    except AIServiceError as e:
        logger.error("Transcription failed: user_id=%s error=%s", user_id, e)
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "transcription_failed",
                "message": e.message,
                "retryable": e.retryable,
            },
        )
        return
    # audio_bytes goes out of scope here -- never written to disk, never stored

    if not transcript.strip():
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "empty_transcript",
                "message": "No speech detected. Please try recording again.",
                "retryable": True,
            },
        )
        return

    from app.db.base import AsyncSessionLocal
    from app.db.models import Answer

    async with AsyncSessionLocal() as db:
        answer = Answer(
            interview_id=session["interview_id"],
            question_id=question_id,
            transcript=transcript,
        )
        db.add(answer)
        await db.commit()

    logger.info(
        "answer_saved",
        user_id=user_id,
        interview_id=session["interview_id"],
        question_id=question_id,
        transcript_length=len(transcript),
    )
    await manager.send_json(
        user_id,
        {
            "type": "transcript_ready",
            "question_id": question_id,
            "transcript": transcript,
        },
    )

    session["previous_qa"].append(
        {
            "question": session["current_question_text"],
            "answer": transcript,
        }
    )
    session["current_question_index"] += 1
    await set_interview_session(user_id, session)

    if session["current_question_index"] >= session["total_questions"]:
        await _complete_interview(user_id, session)
    else:
        await _send_next_question(user_id, session)


async def _complete_interview(user_id: str, session: dict) -> None:
    from app.db.base import AsyncSessionLocal
    from app.modules.interview.service import update_interview_status
    from app.tasks.interview_tasks import generate_feedback_task

    interview_id = session["interview_id"]
    logger.info("Completing interview: user_id=%s interview_id=%s", user_id, interview_id)

    async with AsyncSessionLocal() as db:
        await update_interview_status(db, user_id, interview_id, "completed")

    generate_feedback_task.delay(interview_id)

    await clear_interview_session(user_id)
    await manager.send_json(
        user_id,
        {
            "type": "interview_complete",
            "interview_id": interview_id,
        },
    )
    logger.info("Interview complete: user_id=%s interview_id=%s", user_id, interview_id)
