"""
Handles the voice-driven setup phase
(role → type → tech_stack → experience → question count → complete).

Phase transitions mirror the LangGraph setup_graph in question_gen
(including skipping tech_stack for Non-Technical). Stepping is done via
next_setup_phase so each WebSocket turn advances exactly one field.
"""

from app.core.logging import get_logger
from app.modules.ai.chains.question_gen import SETUP_QUESTIONS, next_setup_phase
from app.websocket.connection_manager import manager
from app.websocket.session_store import (
    clear_setup_session,
    get_setup_session,
    set_setup_session,
)

logger = get_logger(__name__)


async def handle_start_setup(user_id: str) -> None:
    logger.info("Setup started: user_id=%s", user_id)
    phase = "role"
    state = {
        "phase": phase,
        "collected": {},
        "next_question_text": SETUP_QUESTIONS[phase],
    }
    await set_setup_session(user_id, state)
    logger.debug("Setup first question sent: user_id=%s field=%s", user_id, phase)
    await manager.send_json(
        user_id,
        {
            "type": "setup_question",
            "field": phase,
            "question_text": state["next_question_text"],
        },
    )


async def handle_setup_answer(user_id: str, field: str, value: str) -> None:
    state = await get_setup_session(user_id)
    if state is None:
        logger.warning("Setup answer with no session: user_id=%s field=%s", user_id, field)
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "no_active_setup",
                "message": "No setup session found. Send start_setup first.",
                "retryable": True,
            },
        )
        return

    if field != state["phase"]:
        logger.warning(
            "Setup field mismatch: user_id=%s expected=%s got=%s",
            user_id,
            state["phase"],
            field,
        )
        await manager.send_json(
            user_id,
            {
                "type": "error",
                "code": "field_mismatch",
                "message": f"Expected answer for '{state['phase']}', got '{field}'",
                "retryable": False,
            },
        )
        return

    # Log field name only — never log free-text value (may contain PII)
    logger.info("Setup answer: user_id=%s field=%s", user_id, field)
    state["collected"][field] = value
    next_phase = next_setup_phase(field, state["collected"])

    if next_phase is None:
        from app.db.base import AsyncSessionLocal
        from app.modules.interview.service import create_interview
        from app.schemas.interview import CreateInterviewRequest

        try:
            async with AsyncSessionLocal() as db:
                interview = await create_interview(
                    db,
                    user_id,
                    CreateInterviewRequest(
                        role=state["collected"]["role"],
                        interview_type=state["collected"]["interview_type"],
                        tech_stack=[
                            t.strip()
                            for t in state["collected"].get("tech_stack", "").split(",")
                            if t.strip()
                        ],
                        experience_level=state["collected"]["experience_level"],
                        number_of_questions=int(state["collected"]["number_of_questions"]),
                    ),
                )
        except Exception:
            logger.exception("Failed creating interview from setup: user_id=%s", user_id)
            await manager.send_json(
                user_id,
                {
                    "type": "error",
                    "code": "setup_persist_failed",
                    "message": "Could not create interview. Please try again.",
                    "retryable": True,
                },
            )
            return

        await clear_setup_session(user_id)
        logger.info(
            "Setup complete: user_id=%s interview_id=%s role=%s type=%s",
            user_id,
            interview.id,
            interview.role,
            interview.interview_type,
        )
        await manager.send_json(
            user_id,
            {
                "type": "setup_complete",
                "interview_id": interview.id,
                "summary": state["collected"],
            },
        )
        return

    state["phase"] = next_phase
    state["next_question_text"] = SETUP_QUESTIONS[next_phase]
    await set_setup_session(user_id, state)
    logger.debug("Setup next question: user_id=%s field=%s", user_id, next_phase)
    await manager.send_json(
        user_id,
        {
            "type": "setup_question",
            "field": next_phase,
            "question_text": state["next_question_text"],
        },
    )
