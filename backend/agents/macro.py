from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)


class MacroTargets(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    notes: str


structured_llm = llm.with_structured_output(MacroTargets)


def macro_agent(state: MealPrepState) -> dict:
    targets: MacroTargets = structured_llm.invoke(
        "Based on this person's goal, estimate reasonable daily macro and "
        "calorie targets. Make sensible assumptions if details are missing, "
        "and note any assumptions in the 'notes' field.\n\n"
        f'Goal: "{state.goal}"'
    )

    return {"macro_targets": targets.model_dump()}
