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
    "difficulty": "What difficulty level would you like? Easy, Medium, or Hard?",
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
        return "difficulty"
    if current_phase == "difficulty":
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
    difficulty: str,
    previous_qa: list[dict],
    question_number: int,
    total_questions: int,
) -> str:
    """
    Generates the next interview question, conditioned on prior Q&A for
    progressive difficulty. Uses MODEL_FAST since this is on the live
    conversational path.
    """
    # ── Difficulty scope guidance scoped to experience level ──────────────────
    # This table ensures difficulty scales WITHIN what is appropriate for the
    # stated experience level. A Fresher's "Hard" is not a Senior's "Hard".
    difficulty_guidance = {
        ("Entry", "Easy"): (
            "Definitional/conceptual questions only. Ask what something IS and when you'd use it. "
            "Examples: 'What is a Python decorator and when would you use one?', "
            "'Can you explain what a foreign key is in a database?'. "
            "No code implementation, no design problems."
        ),
        ("Entry", "Medium"): (
            "Applied/practical questions that test whether the candidate can USE the concept, "
            "not just define it. Examples: 'How would you use Git branches to manage a feature "
            "you're building with a teammate?', 'Walk me through how you'd debug a function "
            "that returns unexpected results.'. Keep scope to individual functions or small modules."
        ),
        ("Entry", "Hard"): (
            "Synthesis questions requiring the candidate to combine multiple concepts, "
            "reason through trade-offs, or explain how they'd approach a small end-to-end problem. "
            "Examples: 'How would you design a simple REST API endpoint to let users upload a profile photo?'. "
            "NEVER ask full system-design-interview-scale questions (distributed systems, "
            "large-scale architecture, capacity planning). Keep it to what a junior developer "
            "might build in their first year."
        ),
        ("Mid", "Easy"): (
            "Foundational questions appropriate for warm-up. Conceptual but with some practical context."
        ),
        ("Mid", "Medium"): (
            "Applied questions involving trade-offs, practical patterns, debugging real issues, "
            "or multi-component interactions."
        ),
        ("Mid", "Hard"): (
            "System-level questions: caching, concurrency, API design, scaling a moderate-sized feature. "
            "Appropriate for a candidate with 2-4 years of experience."
        ),
        ("Senior", "Easy"): (
            "Warm-up questions on architecture philosophy, code quality, or team practices."
        ),
        ("Senior", "Medium"): (
            "System design questions at moderate scale, trade-off analysis, mentoring/leadership scenarios."
        ),
        ("Senior", "Hard"): (
            "Large-scale distributed system design, deep performance optimization, architectural decisions "
            "with business trade-offs. Appropriate for a senior/staff engineer."
        ),
    }

    scope = difficulty_guidance.get(
        (experience_level, difficulty),
        f"Ask a {difficulty.lower()}-difficulty question appropriate for a {experience_level}-level candidate."
    )

    system_prompt = f"""You are a friendly, experienced interviewer conducting a live {interview_type} interview \
for a {experience_level}-level {role} position. Tech stack focus: {', '.join(tech_stack) or 'general'}.

You are asking question {question_number} of {total_questions}. Difficulty: {difficulty}.

━━ COMPLEXITY SCOPE FOR THIS QUESTION ━━
{scope}

Strictly respect this scope. Do not ask questions beyond what is described above regardless of previous answers.

━━ STYLE RULES ━━
- Phrase the question exactly as you would say it out loud in a live conversation.
- Use natural, conversational starters: "Can you walk me through...", "How would you approach...", \
"Tell me about a time when...", "What's your take on...", "Could you explain...".
- NEVER use exam or textbook style: no "Design X and explain Y", no "Implement Z", \
no "List the differences between A and B". Reword those as natural spoken questions.
- One clear, concise question per turn. Not a multi-part essay prompt.

━━ FOLLOW-UP QUALITY RULES ━━
If there are previous answers, read them carefully and generate a genuine follow-up:
- If the candidate answered WELL and showed depth: build on what they said — probe a related \
edge case, ask how they'd handle a concern, or explore a technique they mentioned.
- If the candidate answered VAGUELY or INCOMPLETELY: gently probe the same underlying concept \
from a different angle. Help them think deeper, not punish with a harder unrelated topic.
- If the candidate mentioned a specific tool/pattern: follow up on that — "You mentioned X, how does that behave when...?"
- If it's the first question: start with a warm, foundational question appropriate for their level.

━━ TRANSCRIPTION CHARITY RULES ━━
The candidate's answers come from speech-to-text and may contain minor artifacts. Apply:
- NEVER comment on or correct apparent transcription errors.
- ALWAYS interpret charitably — infer the most sensible technical intent from context.
- Focus on substance and depth, not surface wording.

Return ONLY the question text — no labels, no numbering, no preamble."""

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for qa in previous_qa:
        messages.append({"role": "assistant", "content": qa["question"]})
        messages.append({"role": "user", "content": qa["answer"]})

    logger.info(
        "Generating question %d/%d role=%s type=%s difficulty=%s prior_qa=%d",
        question_number,
        total_questions,
        role,
        interview_type,
        difficulty,
        len(previous_qa),
    )
    return await generate_completion(messages, model=MODEL_FAST, max_tokens=150)
