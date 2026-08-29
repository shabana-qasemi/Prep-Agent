from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.mealplan import mealplan_agent, MealEstimates, MealEstimate
from db import init_db, cache_recipe


def _fake_detail(meal_id: str, title: str) -> dict:
    return {
        "idMeal": meal_id,
        "strMeal": title,
        "strMealThumb": f"https://example.com/{meal_id}.jpg",
        "strSource": "https://example.com/recipe",
        "strIngredient1": "Chicken",
        "strMeasure1": "1 lb",
        "strIngredient2": "Rice",
        "strMeasure2": "1 cup",
        **{f"strIngredient{i}": "" for i in range(3, 21)},
        **{f"strMeasure{i}": "" for i in range(3, 21)},
    }


def _fake_estimate(meal_id: str) -> MealEstimate:
    return MealEstimate(id=meal_id, calories=500, protein_g=40, carbs_g=50, fat_g=15, price_per_serving=3.5)


def test_mealplan_http_calls_always_set_a_timeout():
    # Regression guard: a real live-testing session found that Spoonacular
    # calls with no `timeout` could hang a request forever. Every requests.get
    # call TheMealDB integration makes must set a timeout too.
    init_db()
    state = MealPrepState(goal="bulk", days=1)

    fake_filter_response = MagicMock(ok=True)
    fake_filter_response.json.return_value = {"meals": [{"idMeal": "1"}]}

    fake_lookup_response = MagicMock(ok=True)
    fake_lookup_response.json.return_value = {"meals": [_fake_detail("1", "Test Meal")]}

    def fake_get(url, params=None, timeout=None):
        return fake_filter_response if "filter.php" in url else fake_lookup_response

    with patch("agents.mealplan.requests.get", side_effect=fake_get) as mock_get, \
         patch("agents.mealplan.structured_estimate_llm") as mock_llm:
        mock_llm.invoke.return_value = MealEstimates(estimates=[_fake_estimate("1")])
        mealplan_agent(state)

    assert mock_get.call_count > 0
    for call in mock_get.call_args_list:
        assert call.kwargs.get("timeout") is not None, "requests.get call is missing a timeout"


def test_mealplan_truncates_to_requested_days():
    init_db()
    state = MealPrepState(goal="bulk", days=2)

    fake_filter_response = MagicMock(ok=True)
    fake_filter_response.json.return_value = {"meals": [{"idMeal": "1"}]}

    fake_lookup_response = MagicMock(ok=True)
    fake_lookup_response.json.return_value = {"meals": [_fake_detail("1", "Test Meal")]}

    def fake_get(url, params=None, timeout=None):
        return fake_filter_response if "filter.php" in url else fake_lookup_response

    with patch("agents.mealplan.requests.get", side_effect=fake_get), \
         patch("agents.mealplan.structured_estimate_llm") as mock_llm:
        mock_llm.invoke.return_value = MealEstimates(estimates=[_fake_estimate("1")])
        result = mealplan_agent(state)

    assert list(result["meal_plan"].keys()) == ["monday", "tuesday"]


def test_mealplan_skips_estimation_for_already_cached_recipes():
    init_db()
    cache_recipe(99, {
        "title": "Cached Meal",
        "calories": 400,
        "protein_g": 30,
        "carbs_g": 40,
        "fat_g": 10,
        "price_per_serving": 2.0,
        "image": None,
        "source_url": None,
        "ingredients": ["1 cup rice"],
    })

    state = MealPrepState(goal="bulk", days=1)

    fake_filter_response = MagicMock(ok=True)
    fake_filter_response.json.return_value = {"meals": [{"idMeal": "99"}]}

    with patch("agents.mealplan.requests.get", return_value=fake_filter_response), \
         patch("agents.mealplan.structured_estimate_llm") as mock_llm:
        result = mealplan_agent(state)

    mock_llm.invoke.assert_not_called()
    assert result["meal_plan"]["monday"]["meals"][0]["title"] == "Cached Meal"
