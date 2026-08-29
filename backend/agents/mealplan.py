import random
import concurrent.futures
import requests
from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState
from db import get_cached_recipe, cache_recipe
from llm_utils import retry_on_groq_error

BASE_URL = "https://www.themealdb.com/api/json/v1/1"
FILTER_URL = f"{BASE_URL}/filter.php"
LOOKUP_URL = f"{BASE_URL}/lookup.php"

DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
BREAKFAST_CATEGORY = "Breakfast"
MAIN_CATEGORIES = ["Chicken", "Beef", "Seafood", "Vegetarian", "Pasta", "Pork"]

# TheMealDB HTTP calls cost nothing and don't share a rate limit with
# anything else, so they get a wider pool.
MAX_HTTP_WORKERS = 6

# Groq estimate calls are different: live-testing a 7-day plan with this pool
# at 6 hit the free tier's 8000 tokens/minute cap and burned through all of
# retry_on_groq_error's retries — running 6 recipe estimates at once bursts
# more tokens into the same one-minute window than spacing them out
# sequentially ever did. 3 is the sweet spot found by testing: still a real
# speedup over one-at-a-time, without concentrating the burst enough to blow
# the cap on a full 7-day (~21 recipe) plan.
MAX_LLM_WORKERS = 3

llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)


def check_response(response: requests.Response, context: str) -> None:
    if not response.ok:
        raise RuntimeError(f"{context} failed: {response.status_code} {response.reason}")


def fetch_category_meal_ids(category: str) -> list[str]:
    response = requests.get(FILTER_URL, params={"c": category}, timeout=15)
    check_response(response, f"TheMealDB category lookup for '{category}'")
    meals = response.json().get("meals") or []
    return [meal["idMeal"] for meal in meals]


def fetch_meal_detail(meal_id: str) -> dict:
    response = requests.get(LOOKUP_URL, params={"i": meal_id}, timeout=15)
    check_response(response, f"TheMealDB recipe lookup for id {meal_id}")
    meals = response.json().get("meals") or []
    if not meals:
        raise RuntimeError(f"TheMealDB has no recipe for id {meal_id}")
    return meals[0]


def extract_ingredients(detail: dict) -> list[str]:
    ingredients = []
    for i in range(1, 21):
        ingredient = (detail.get(f"strIngredient{i}") or "").strip()
        measure = (detail.get(f"strMeasure{i}") or "").strip()
        if ingredient:
            ingredients.append(f"{measure} {ingredient}".strip())
    return ingredients


class MealEstimate(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    price_per_serving: float


# json_mode, not the default tool-calling method — see orchestrator.py for
# why. Estimating is also done one recipe at a time, not batched: batching
# several recipes (especially ones with 15+ ingredients) into one JSON
# response consistently failed validation during live testing — the model
# just can't reliably produce one big, correctly-shaped blob. One recipe per
# call is far more reliable, and Groq's free tier has room for it.
structured_estimate_llm = llm.with_structured_output(MealEstimate, method="json_mode")


@retry_on_groq_error
def _estimate_one(prompt: str) -> MealEstimate:
    return structured_estimate_llm.invoke(prompt)


def _build_estimate_prompt(r: dict) -> str:
    ingredients = ", ".join(r["ingredients"]) or "unknown"
    return (
        "Estimate realistic values for a single serving of this recipe: "
        "calories, protein_g, carbs_g, fat_g, and price_per_serving (USD, a "
        "rough US grocery-cost estimate for the ingredients divided by "
        "servings). Base it on typical preparation of this dish and its "
        "listed ingredients.\n\n"
        f"title: {r['title']}\ningredients: {ingredients}\n\n"
        "Respond with JSON matching this shape: "
        '{"calories": int, "protein_g": int, "carbs_g": int, "fat_g": int, "price_per_serving": float}'
    )


def estimate_nutrition_and_price(recipes: dict[str, dict]) -> dict[str, MealEstimate]:
    """TheMealDB has no nutrition or pricing data at all — these are
    AI-estimated from each recipe's title and ingredients, not measured or
    verified. The frontend labels them accordingly.

    Each recipe still gets its own Groq call (see _estimate_one's docstring
    neighbor above for why), but a longer plan's calls run concurrently
    instead of one-at-a-time — this was the single biggest contributor to
    slow generation on 5-7 day plans."""
    recipe_ids = list(recipes.keys())
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
        results = executor.map(
            lambda rid: _estimate_one(_build_estimate_prompt(recipes[rid])), recipe_ids
        )
        return dict(zip(recipe_ids, results))


def _fetch_day_meal_ids(day_name: str, lunch_category: str, dinner_category: str) -> tuple[str, list[str]]:
    breakfast_id = random.choice(fetch_category_meal_ids(BREAKFAST_CATEGORY))
    lunch_id = random.choice(fetch_category_meal_ids(lunch_category))
    dinner_id = random.choice(fetch_category_meal_ids(dinner_category))
    return day_name, [breakfast_id, lunch_id, dinner_id]


def mealplan_agent(state: MealPrepState) -> dict:
    requested_days = state.days or 7
    day_names = DAY_NAMES[:requested_days]

    # Each day's category picks are independent of every other day's, and each
    # is 3 separate TheMealDB HTTP round-trips — running days concurrently
    # instead of one at a time cuts a big chunk of wall-clock time on longer
    # plans, with zero effect on Groq's rate limit (this part is pure HTTP).
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_HTTP_WORKERS) as executor:
        futures = []
        for i, day_name in enumerate(day_names):
            lunch_category = MAIN_CATEGORIES[(i * 2) % len(MAIN_CATEGORIES)]
            dinner_category = MAIN_CATEGORIES[(i * 2 + 1) % len(MAIN_CATEGORIES)]
            futures.append(executor.submit(_fetch_day_meal_ids, day_name, lunch_category, dinner_category))
        # Iterating `futures` (not as_completed) keeps day order stable even
        # though the underlying requests finish in whatever order they land.
        week_plan: dict[str, list[str]] = dict(future.result() for future in futures)

    unique_ids = {meal_id for meal_ids in week_plan.values() for meal_id in meal_ids}

    # Only fetch full details + estimate nutrition for recipes we haven't
    # already cached from a previous run.
    complete: dict[str, dict] = {}
    to_fetch = []
    for meal_id in unique_ids:
        cached = get_cached_recipe(int(meal_id))
        if cached is not None:
            complete[meal_id] = cached
        else:
            to_fetch.append(meal_id)

    raw_details: dict[str, dict] = {}
    if to_fetch:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_HTTP_WORKERS) as executor:
            details = executor.map(fetch_meal_detail, to_fetch)
            raw_details = dict(zip(to_fetch, details))

    needs_estimate = {
        meal_id: {"title": detail.get("strMeal"), "ingredients": extract_ingredients(detail)}
        for meal_id, detail in raw_details.items()
    }

    if needs_estimate:
        estimates = estimate_nutrition_and_price(needs_estimate)
        for meal_id, base in needs_estimate.items():
            estimate = estimates.get(meal_id)
            recipe_data = {
                "id": int(meal_id),
                "title": base["title"],
                "calories": estimate.calories if estimate else 0,
                "protein_g": estimate.protein_g if estimate else 0,
                "carbs_g": estimate.carbs_g if estimate else 0,
                "fat_g": estimate.fat_g if estimate else 0,
                "price_per_serving": estimate.price_per_serving if estimate else 0,
                "image": raw_details[meal_id].get("strMealThumb"),
                "source_url": raw_details[meal_id].get("strSource") or None,
                "ingredients": base["ingredients"],
            }
            cache_recipe(int(meal_id), recipe_data)
            complete[meal_id] = recipe_data

    meal_plan = {}
    for day_name, meal_ids in week_plan.items():
        meals = [complete[meal_id] for meal_id in meal_ids]
        meal_plan[day_name] = {
            "meals": meals,
            "nutrients": {
                "calories": sum(m["calories"] for m in meals),
                "protein": sum(m["protein_g"] for m in meals),
                "fat": sum(m["fat_g"] for m in meals),
                "carbohydrates": sum(m["carbs_g"] for m in meals),
            },
        }

    return {"meal_plan": meal_plan}


def swap_meal(plan: dict, day: str, meal_index: int) -> dict:
    """Reroll a single meal slot in an already-generated plan, in place on
    the given plan dict. Returns the updated day entry. Raises ValueError for
    a bad day/index so the API layer can turn that into a 404."""
    meal_plan = plan.get("meal_plan") or {}
    if day not in meal_plan or day not in DAY_NAMES:
        raise ValueError(f"unknown day: {day}")
    meals = meal_plan[day]["meals"]
    if not (0 <= meal_index < len(meals)):
        raise ValueError(f"meal_index out of range: {meal_index}")

    day_index = DAY_NAMES.index(day)
    if meal_index == 0:
        category = BREAKFAST_CATEGORY
    else:
        # Matches the same (day_index*2, day_index*2+1) rotation mealplan_agent
        # used originally, so a swap pulls from the same category the slot
        # was built from.
        offset = 0 if meal_index == 1 else 1
        category = MAIN_CATEGORIES[(day_index * 2 + offset) % len(MAIN_CATEGORIES)]

    current_id = meals[meal_index].get("id")
    candidate_ids = fetch_category_meal_ids(category)
    remaining = [mid for mid in candidate_ids if int(mid) != current_id] or candidate_ids
    new_id = random.choice(remaining)

    new_meal = get_cached_recipe(int(new_id))
    if new_meal is None:
        detail = fetch_meal_detail(new_id)
        base = {"title": detail.get("strMeal"), "ingredients": extract_ingredients(detail)}
        estimate = estimate_nutrition_and_price({new_id: base})[new_id]
        new_meal = {
            "id": int(new_id),
            "title": base["title"],
            "calories": estimate.calories,
            "protein_g": estimate.protein_g,
            "carbs_g": estimate.carbs_g,
            "fat_g": estimate.fat_g,
            "price_per_serving": estimate.price_per_serving,
            "image": detail.get("strMealThumb"),
            "source_url": detail.get("strSource") or None,
            "ingredients": base["ingredients"],
        }
        cache_recipe(int(new_id), new_meal)

    meals[meal_index] = new_meal
    meal_plan[day]["nutrients"] = {
        "calories": sum(m["calories"] for m in meals),
        "protein": sum(m["protein_g"] for m in meals),
        "fat": sum(m["fat_g"] for m in meals),
        "carbohydrates": sum(m["carbs_g"] for m in meals),
    }
    return meal_plan[day]
