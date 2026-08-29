from typing import Literal
from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState

VALID_STEPS = Literal["macro", "mealplan", "budget", "grocery"]

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)


class OrchestratorDecision(BaseModel):
    is_meal_plan_request: bool
    plan: list[VALID_STEPS]
    days: int


structured_llm = llm.with_structured_output(OrchestratorDecision)


def orchestrator_agent(state: MealPrepState) -> dict:
    decision: OrchestratorDecision = structured_llm.invoke(
        "A user sent this message to a meal-prep planning assistant:\n"
        f'"{state.goal}"\n\n'
        "First decide: is this actually a request to build/generate a meal "
        "plan (including just a grocery list, a budget check, or macro "
        "targets on their own)? Or is it a general question, casual message, "
        "or something else that doesn't need a plan generated at all — "
        "e.g. nutrition advice, a factual question, small talk, asking how "
        "this works?\n\n"
        "If it IS a meal-plan request, decide which of these steps are needed, in order:\n"
        "- macro: calculate daily macro/calorie targets (needed if they mention protein, calories, bulking, cutting, or macros)\n"
        "- mealplan: build a meal plan matching macro targets (almost always needed)\n"
        "- budget: adjust for cost constraints (only if they mention a budget or price limit)\n"
        "- grocery: consolidate a grocery list (needed if they want to actually shop/cook)\n\n"
        "Also figure out how many days of meals they want. If they don't say, default to 7.\n\n"
        "If it is NOT a meal-plan request, set plan to an empty array and "
        "days to 7 — those fields are ignored in that case."
    )

    return {
        "is_meal_plan_request": decision.is_meal_plan_request,
        "plan": decision.plan,
        "days": max(1, min(7, decision.days)),
    }
