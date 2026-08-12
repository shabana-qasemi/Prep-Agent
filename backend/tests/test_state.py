import pytest
from pydantic import ValidationError
from state import MealPrepState


def test_state_requires_goal():
    with pytest.raises(ValidationError):
        MealPrepState()


def test_state_defaults_are_none():
    state = MealPrepState(goal="bulk on a budget")
    assert state.plan is None
    assert state.macro_targets is None
    assert state.meal_plan is None
    assert state.budget_notes is None
    assert state.grocery_list is None


def test_state_accepts_partial_progress():
    state = MealPrepState(
        goal="bulk on a budget",
        plan=["macro", "mealplan"],
        macro_targets={"calories": 3000, "protein_g": 180},
    )
    assert state.plan == ["macro", "mealplan"]
    assert state.macro_targets["calories"] == 3000
    assert state.meal_plan is None
