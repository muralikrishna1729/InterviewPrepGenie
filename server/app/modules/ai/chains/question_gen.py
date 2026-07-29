"""
LangGraph setup flow + live interview question generation.

Setup uses an explicit StateGraph (role → type → tech_stack? → experience →
count → complete). Live interview questions use generate_next_question —
a single LLM call, not a graph.
"""

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_FAST, generate_completion

logger = get_logger(__name__)


class SetupState(TypedDict):
    phase: str
    collected: dict
    next_question_text: str | None


SETUP_QUESTIONS: dict[str, str] = {
    "role": "What role are you interviewing for? (e.g. Backend Developer)",
    "interview_type": "What type of interview? Technical, Non-Technical, or Mixed?",
    "tech_stack": (
        "What technologies should we focus on? "
        "(comma-separated, e.g. Python, FastAPI, PostgreSQL)"
    ),
    "experience_level": "What's your experience level? Entry, Mid, or Senior?",
    "number_of_questions": "How many questions would you like? (1-20)",
}


def next_setup_phase(current_phase: str, collected: dict) -> str | None:
    """Return the next setup field, or None when setup is complete."""
    if current_phase == "start":
        return "role"
    if current_phase == "role":
        return "interview_type"
    if current_phase == "interview_type":
        if collected.get("interview_type") == "Non-Technical":
            return "experience_level"
        return "tech_stack"
    if current_phase == "tech_stack":
        return "experience_level"
    if current_phase == "experience_level":
        return "number_of_questions"
    if current_phase == "number_of_questions":
        return None
    return "role"


def _ask_role(state: SetupState) -> SetupState:
    state["next_question_text"] = SETUP_QUESTIONS["role"]
    state["phase"] = "role"
    return state


def _ask_interview_type(state: SetupState) -> SetupState:
    state["next_question_text"] = SETUP_QUESTIONS["interview_type"]
    state["phase"] = "interview_type"
    return state


def _ask_tech_stack(state: SetupState) -> SetupState:
    state["next_question_text"] = SETUP_QUESTIONS["tech_stack"]
    state["phase"] = "tech_stack"
    return state


def _ask_experience_level(state: SetupState) -> SetupState:
    state["next_question_text"] = SETUP_QUESTIONS["experience_level"]
    state["phase"] = "experience_level"
    return state


def _ask_question_count(state: SetupState) -> SetupState:
    state["next_question_text"] = SETUP_QUESTIONS["number_of_questions"]
    state["phase"] = "number_of_questions"
    return state


def _setup_complete(state: SetupState) -> SetupState:
    state["phase"] = "complete"
    state["next_question_text"] = None
    return state


def _route_after_interview_type(state: SetupState) -> str:
    """Conditional edge: skip tech_stack for Non-Technical interviews."""
    if state["collected"].get("interview_type") == "Non-Technical":
        return "ask_experience_level"
    return "ask_tech_stack"


def _build_setup_graph():
    graph = StateGraph(SetupState)
    graph.add_node("ask_role", _ask_role)
    graph.add_node("ask_interview_type", _ask_interview_type)
    graph.add_node("ask_tech_stack", _ask_tech_stack)
    graph.add_node("ask_experience_level", _ask_experience_level)
    graph.add_node("ask_question_count", _ask_question_count)
    graph.add_node("setup_complete", _setup_complete)

    graph.set_entry_point("ask_role")
    graph.add_edge("ask_role", "ask_interview_type")
    graph.add_conditional_edges(
        "ask_interview_type",
        _route_after_interview_type,
        {
            "ask_tech_stack": "ask_tech_stack",
            "ask_experience_level": "ask_experience_level",
        },
    )
    graph.add_edge("ask_tech_stack", "ask_experience_level")
    graph.add_edge("ask_experience_level", "ask_question_count")
    graph.add_edge("ask_question_count", "setup_complete")
    graph.add_edge("setup_complete", END)
    return graph.compile()


setup_graph = _build_setup_graph()


async def generate_next_question(
    role: str,
    interview_type: str,
    tech_stack: list[str],
    experience_level: str,
    previous_qa: list[dict],
    question_number: int,
    total_questions: int,
) -> str:
    """
    Generates the next interview question, conditioned on prior Q&A for
    progressive difficulty (e.g. if the last answer was strong, go deeper;
    if weak, stay foundational). Uses MODEL_FAST since this is on the
    live conversational path.
    """
    system_prompt = f"""You are conducting a {interview_type} interview for a
{experience_level}-level {role} position. Tech stack focus: {', '.join(tech_stack) or 'general'}.
Ask question {question_number} of {total_questions}. Consider the candidate's
previous answers to calibrate difficulty -- go deeper if they're doing well,
stay foundational if they're struggling. Return ONLY the question text, nothing else."""

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for qa in previous_qa:
        messages.append({"role": "assistant", "content": qa["question"]})
        messages.append({"role": "user", "content": qa["answer"]})

    logger.info(
        "Generating question %d/%d role=%s type=%s prior_qa=%d",
        question_number,
        total_questions,
        role,
        interview_type,
        len(previous_qa),
    )
    return await generate_completion(messages, model=MODEL_FAST, max_tokens=150)
