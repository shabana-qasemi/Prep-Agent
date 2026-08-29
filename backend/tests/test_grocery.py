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


def test_merges_same_ingredient_with_different_measures():
    # Regression guard: the real cause of "the grocery list is very long" was
    # the same ingredient appearing with different measures across recipes
    # ("200g Butter" one day, "2 tbsp Butter" another) — a plain set() dedupe
    # can't catch that since the full strings differ. These should collapse
    # into a single line listing both measures.
    state = MealPrepState(
        goal="test",
        meal_plan={
            "monday": {"meals": [{"ingredients": ["200g Butter"]}]},
            "tuesday": {"meals": [{"ingredients": ["2 tbsp Butter"]}]},
        },
    )
    result = grocery_agent(state)
    assert result["grocery_list"] == ["Butter — 2 tbsp, 200g"]


def test_leaves_unmeasured_ingredient_alone():
    state = MealPrepState(
        goal="test",
        meal_plan={"monday": {"meals": [{"ingredients": ["Salt", "Salt"]}]}},
    )
    result = grocery_agent(state)
    assert result["grocery_list"] == ["Salt"]


def test_groups_items_into_aisle_categories():
    state = MealPrepState(
        goal="test",
        meal_plan={
            "monday": {"meals": [{"ingredients": [
                "1 lb Chicken breast", "2 Carrots", "1 cup Milk", "1 cup Rice", "to taste Salt",
            ]}]},
        },
    )
    result = grocery_agent(state)
    categories = result["grocery_categories"]
    assert categories["Meat & Seafood"] == ["1 lb Chicken breast"]
    assert categories["Produce"] == ["2 Carrots"]
    assert categories["Dairy & Eggs"] == ["1 cup Milk"]
    assert categories["Grains & Bread"] == ["1 cup Rice"]
    assert categories["Condiments & Spices"] == ["to taste Salt"]
    # Category order in the dict follows CATEGORY_ORDER, not alphabetical or
    # insertion order — the frontend relies on this to render aisles sensibly.
    assert list(categories.keys()) == [
        "Produce", "Meat & Seafood", "Dairy & Eggs", "Grains & Bread", "Condiments & Spices",
    ]
