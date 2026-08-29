from typing import Literal
from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState
from llm_utils import retry_on_bad_structured_output

VALID_STEPS = Literal["macro", "mealplan", "budget", "grocery"]

llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)


class OrchestratorDecision(BaseModel):
    is_meal_plan_request: bool
    plan: list[VALID_STEPS]
    days: int


# method="json_mode" instead of the default tool-calling: on Groq's
# openai/gpt-oss-120b, tool-calling structured output intermittently fails
# with "Tool choice is required, but model did not call a tool" (a real
# failure hit during live testing, not a hypothetical). json_mode has been
# reliable in testing for every schema in this app so far.
structured_llm = llm.with_structured_output(OrchestratorDecision, method="json_mode")


@retry_on_bad_structured_output
def _decide(prompt: str) -> OrchestratorDecision:
    return structured_llm.invoke(prompt)


def orchestrator_agent(state: MealPrepState) -> dict:
    decision: OrchestratorDecision = _decide(
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
        "days to 7 — those fields are ignored in that case.\n\n"
        "Respond with JSON matching this shape: "
        '{"is_meal_plan_request": bool, "plan": [string], "days": int}'
    )

    return {
        "is_meal_plan_request": decision.is_meal_plan_request,
        "plan": decision.plan,
        "days": max(1, min(7, decision.days)),
    }
