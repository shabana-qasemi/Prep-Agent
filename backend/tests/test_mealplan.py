from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.mealplan import mealplan_agent, swap_meal, MealEstimate
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


_FAKE_ESTIMATE = MealEstimate(calories=500, protein_g=40, carbs_g=50, fat_g=15, price_per_serving=3.5)


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
        mock_llm.invoke.return_value = _FAKE_ESTIMATE
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
        mock_llm.invoke.return_value = _FAKE_ESTIMATE
        result = mealplan_agent(state)

    assert list(result["meal_plan"].keys()) == ["monday", "tuesday"]


def test_mealplan_estimates_one_recipe_per_call_not_batched():
    # Regression guard: batching several recipes into one JSON response
    # consistently failed schema validation during live testing (the model
    # can't reliably produce one big correctly-shaped blob). Estimating must
    # happen one recipe at a time.
    init_db()
    state = MealPrepState(goal="bulk", days=1)

    fake_filter_response = MagicMock(ok=True)
    fake_filter_response.json.return_value = {"meals": [{"idMeal": "1"}]}

    def fake_lookup(meal_id, title):
        response = MagicMock(ok=True)
        response.json.return_value = {"meals": [_fake_detail(meal_id, title)]}
        return response

    # 3 distinct meal slots (breakfast/lunch/dinner) for 1 day -> 3 unique ids
    lookup_responses = {
        "1": fake_lookup("1", "Meal One"),
        "2": fake_lookup("2", "Meal Two"),
        "3": fake_lookup("3", "Meal Three"),
    }

    call_count = {"filter": 0}

    def fake_get(url, params=None, timeout=None):
        if "filter.php" in url:
            call_count["filter"] += 1
            meal_id = str(call_count["filter"])
            return MagicMock(ok=True, json=lambda: {"meals": [{"idMeal": meal_id}]})
        return lookup_responses[params["i"]]

    with patch("agents.mealplan.requests.get", side_effect=fake_get), \
         patch("agents.mealplan.structured_estimate_llm") as mock_llm:
        mock_llm.invoke.return_value = _FAKE_ESTIMATE
        mealplan_agent(state)

    # One estimate call per unique recipe, never one call for all of them.
    assert mock_llm.invoke.call_count == 3
    for call in mock_llm.invoke.call_args_list:
        prompt = call.args[0]
        assert prompt.count("title:") == 1


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


def test_swap_meal_replaces_slot_and_recomputes_day_nutrients():
    init_db()
    old_meal = {"id": 1, "title": "Old", "calories": 400, "protein_g": 30, "carbs_g": 40, "fat_g": 10, "price_per_serving": 2.0}
    new_meal_cached = {
        "id": 2, "title": "New", "calories": 500, "protein_g": 50, "carbs_g": 50, "fat_g": 20,
        "price_per_serving": 3.0, "ingredients": ["1 cup Rice"],
    }
    cache_recipe(2, new_meal_cached)
    plan = {
        "meal_plan": {
            "monday": {
                "meals": [dict(old_meal), {"id": 3, "calories": 100, "protein_g": 10, "carbs_g": 10, "fat_g": 5}],
                "nutrients": {"calories": 500, "protein": 40, "fat": 15, "carbohydrates": 50},
            }
        }
    }

    fake_filter_response = MagicMock(ok=True)
    fake_filter_response.json.return_value = {"meals": [{"idMeal": "2"}]}

    with patch("agents.mealplan.requests.get", return_value=fake_filter_response):
        updated_day = swap_meal(plan, "monday", 0)

    assert updated_day["meals"][0]["id"] == 2
    assert updated_day["meals"][0]["title"] == "New"
    # nutrients recomputed from the new meal (500+100 cal, 50+10 protein, etc.)
    assert updated_day["nutrients"]["calories"] == 600
    assert updated_day["nutrients"]["protein"] == 60


def test_swap_meal_rejects_unknown_day_or_index():
    plan = {"meal_plan": {"monday": {"meals": [{"id": 1, "calories": 1, "protein_g": 1, "carbs_g": 1, "fat_g": 1}]}}}

    try:
        swap_meal(plan, "someday", 0)
        assert False, "expected ValueError for unknown day"
    except ValueError:
        pass

    try:
        swap_meal(plan, "monday", 5)
        assert False, "expected ValueError for out-of-range meal_index"
    except ValueError:
        pass
