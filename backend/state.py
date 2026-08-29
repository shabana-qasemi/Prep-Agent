from typing import Optional
from pydantic import BaseModel


class MealPrepState(BaseModel):
    goal: str
    is_meal_plan_request: Optional[bool] = None
    plan: Optional[list[str]] = None
    days: Optional[int] = None
    macro_targets: Optional[dict] = None
    meal_plan: Optional[dict] = None
    budget_notes: Optional[str] = None
    grocery_list: Optional[list[str]] = None
    grocery_categories: Optional[dict] = None
    final_summary: Optional[str] = None
    direct_answer: Optional[str] = None
