from state import MealPrepState
from agents.grocery import grocery_agent


def test_consolidates_ingredients_across_days():
    state = MealPrepState(
        goal="test",
        meal_plan={
            "monday": {"meals": [{"ingredients": ["eggs", "rice"]}]},
            "tuesday": {"meals": [{"ingredients": ["rice", "chicken"]}]},
        },
    )
    result = grocery_agent(state)
    assert result["grocery_list"] == ["chicken", "eggs", "rice"]


def test_handles_missing_meal_plan():
    state = MealPrepState(goal="test")
    result = grocery_agent(state)
    assert result["grocery_list"] == []


def test_deduplicates_exact_matches_only():
    state = MealPrepState(
        goal="test",
        meal_plan={
            "monday": {"meals": [
                {"ingredients": ["2 eggs", "1 cup rice"]},
                {"ingredients": ["2 eggs"]},
            ]},
        },
    )
    result = grocery_agent(state)
    # "2 eggs" appears twice but should only be listed once
    assert result["grocery_list"] == ["1 cup rice", "2 eggs"]
