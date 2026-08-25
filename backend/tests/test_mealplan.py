import os
from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.mealplan import mealplan_agent
from db import init_db


def _fake_week(days=("monday", "tuesday")):
    return {day: {"meals": [{"id": 1}], "nutrients": {"calories": 2000}} for day in days}


def _fake_recipe_info():
    return {
        "title": "Test Recipe",
        "nutrition": {"nutrients": [{"name": "Calories", "amount": 500}]},
        "pricePerServing": 250,
        "sourceUrl": "https://example.com/recipe",
        "extendedIngredients": [],
    }


def test_mealplan_requests_never_hang_without_a_timeout():
    # Regression guard: a real live-testing session found that Spoonacular
    # calls with no `timeout` can hang the whole request indefinitely when
    # the API is slow to respond (rather than failing fast). Every
    # requests.get call this agent makes must set a timeout.
    init_db()
    os.environ["SPOONACULAR_API_KEY"] = "test-key"
    state = MealPrepState(goal="bulk", days=2)

    fake_generate = MagicMock()
    fake_generate.ok = True
    fake_generate.json.return_value = {"week": _fake_week()}

    fake_info = MagicMock()
    fake_info.ok = True
    fake_info.json.return_value = _fake_recipe_info()

    with patch("agents.mealplan.requests.get", side_effect=[fake_generate, fake_info]) as mock_get:
        mealplan_agent(state)

    assert mock_get.call_count == 2
    for call in mock_get.call_args_list:
        assert call.kwargs.get("timeout") is not None, "requests.get call is missing a timeout"


def test_mealplan_truncates_to_requested_days():
    init_db()
    os.environ["SPOONACULAR_API_KEY"] = "test-key"
    state = MealPrepState(goal="bulk", days=1)

    fake_generate = MagicMock()
    fake_generate.ok = True
    fake_generate.json.return_value = {"week": _fake_week(("monday", "tuesday", "wednesday"))}

    fake_info = MagicMock()
    fake_info.ok = True
    fake_info.json.return_value = _fake_recipe_info()

    with patch("agents.mealplan.requests.get", side_effect=[fake_generate, fake_info]):
        result = mealplan_agent(state)

    assert list(result["meal_plan"].keys()) == ["monday"]
