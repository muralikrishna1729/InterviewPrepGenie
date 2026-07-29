"""
LangGraph state machine for the interview setup phase.
Explicit graph nodes/edges replace the Node version's switch-based
setup.handler.ts, making branching logic (e.g. skip tech_stack for
Non-Technical interviews) a first-class, testable graph edge instead of
a nested if-statement.
"""
from typing import TypedDict
from langgraph.graph import StateGraph,END

class SetupState(TypedDict):
    phase:str
    collected: dict
    next_question: str | None

def _ask_role(state: SetupState)->SetupState:
    state["next_question_text"] = "What role are you interviewing for ? (e.g. Backend Developer)"
    state["phase"] = "role"
    return state

def _ask_interview_type(state: SetupState)->SetupState:
    state["next_question_text"] = "What type of interview are you preparing for ? (e.g. Technical, Non-Technical)"
    state["phase"] = "interview_type"
    return state

def _ask_tech_stack(state: SetupState)->SetupState:
    state["next_question_text"] = "What technologies are you interviewing for ? (e.g. Python, JavaScript, React)"
    state["phase"] = "tech_stack"
    return state

def _ask_experience_level(state: SetupState)->SetupState:
    state["next_question_text"] = "What's your experience level? Entry, Mid, or Senior?"
    state["phase"] = "experience_level"
    return state

def _ask_question_count(state: SetupState)->SetupState:
    state["next_question_text"] = "How many questions would you like? (1-20)"
    state["phase"] = "number_of_questions"
    return state

def _setup_complete(state: SetupState) -> SetupState:
    state["phase"] = "complete"
    state["next_question_text"] = None
    return state

def _route_after_interview_type(state: SetupState) -> str:
    """Conditional edge: skip tech_stack question for Non-Technical interviews."""
    if state["collected"].get("interview_type") == "Non-Technical":
        return "ask_experience_level"
    return "ask_tech_stack"

graph = StateGraph(SetupState)
graph.add_node("ask_role", _ask_role) 
graph.add_node("ask_interview_type", _ask_interview_type)
graph.add_node("ask_tech_stack", _ask_tech_stack)
graph.add_node("ask_experience_level", _ask_experience_level)
graph.add_node("ask_question_count", _ask_question_count)
graph.add_node("setup_complete", _setup_complete)

graph.set_entry_point("ask_role")
graph.add_edge('ask_role', "ask_interview_type")
graph.conditional_edge("ask_interview_type", _route_after_interview_type)
graph.add_edge("ask_tech_stack", "ask_experience_level")
graph.add_edge("ask_experience_level", "ask_question_count")
graph.add_edge("ask_question_count", "setup_complete")
graph.add_edge("setup_complete", END)

setup_graph() = graph.compile()
