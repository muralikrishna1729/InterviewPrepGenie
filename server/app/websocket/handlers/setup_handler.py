"""
Handles the voice-driven setup phase (role -> type -> tech_stack -> experience
-> question count -> complete).
Candidate for LangGraph state graph rather than hand-rolled phase field.
"""
from app.modules.ai.chains.question_gen import setup_graph
from app.websocket.connection_manager import connection_manager
from app.websocket.session_store import (
    clear_setup_session,
    get_setup_session,
    set_setup_session)

VALID_FIELDS_ORDER = ["role", "interview_type", "tech_stack", "experience_level", "number_of_questions"]
async def handle_start_setup(user_id:str)->None:
    inital_state = {
         "phase": "start",
        "collected": {},
        "next_question_text": None,
    }
     # Run the graph's entry node only -- ask_role
    state = setup_graph.invoke(initial_state, config={"recursion_limit": 1})
    await set_setup_session(user_id, state)

    await manager.send_json(user_id, {
        "type": "setup_question",
        "field": "role",
        "question_text": state["next_question_text"],
    })

async def handle_setup_answer(user_id: str, field: str, value: str) -> None:
    state = await get_setup_session(user_id)
    if state is None:
        await manager.send_json(user_id, {
            "type": "error", "code": "no_active_setup",
            "message": "No setup session found. Send start_setup first.",
            "retryable": True,
        })
        return

    # Record the answer for the field just asked
    state["collected"][field] = value
    # Advance the graph by one step from current phase
    # (LangGraph invoked incrementally -- see note on step-wise execution)
    state = setup_graph.invoke(state, config={"recursion_limit": 1})
    await set_setup_session(user_id, state)

    if state["phase"] == "complete":
        # Create the actual Interview DB row now that all fields are collected
        from app.modules.interview.service import create_interview
        from app.schemas.interview import CreateInterviewRequest
        from app.db.base import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            interview = await create_interview(
                db, user_id,
                CreateInterviewRequest(
                    role=state["collected"]["role"],
                    interview_type=state["collected"]["interview_type"],
                    tech_stack=[t.strip() for t in state["collected"].get("tech_stack", "").split(",") if t.strip()],
                    experience_level=state["collected"]["experience_level"],
                    number_of_questions=int(state["collected"]["number_of_questions"]),
                ),
            )
        await clear_setup_session(user_id)
        await manager.send_json(user_id, {
            "type": "setup_complete",
            "interview_id": interview.id,
            "summary": state["collected"],
        })

    else:
        await manager.send_json(user_id, {
            "type": "setup_question",
            "field": state["phase"],
            "question_text": state["next_question_text"],
        })
    