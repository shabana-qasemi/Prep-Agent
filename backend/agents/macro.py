from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState
from llm_utils import retry_on_groq_error

llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)


class MacroTargets(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    notes: str


# json_mode, not the default tool-calling method — see orchestrator.py for why.
structured_llm = llm.with_structured_output(MacroTargets, method="json_mode")


@retry_on_groq_error
def _estimate(prompt: str) -> MacroTargets:
    return structured_llm.invoke(prompt)


def macro_agent(state: MealPrepState) -> dict:
    targets: MacroTargets = _estimate(
        "Based on this person's goal, estimate reasonable daily macro and "
        "calorie targets. Make sensible assumptions if details are missing, "
        "and note any assumptions in the 'notes' field.\n\n"
        f'Goal: "{state.goal}"\n\n'
        "Respond with JSON matching this shape: "
        '{"calories": int, "protein_g": int, "carbs_g": int, "fat_g": int, "notes": string}'
    )

    return {"macro_targets": targets.model_dump()}
