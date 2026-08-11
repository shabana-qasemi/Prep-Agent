from typing import Optional
from pydantic import BaseModel


class MealPrepState(BaseModel):
    goal: str
    plan: Optional[list[str]] = None
    macro_targets: Optional[dict] = None
    meal_plan: Optional[dict] = None
    budget_notes: Optional[str] = None
    grocery_list: Optional[list[str]] = None
    final_summary: Optional[str] = None
