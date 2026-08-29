import random
import requests
from pydantic import BaseModel
from langchain_groq import ChatGroq
from state import MealPrepState
from db import get_cached_recipe, cache_recipe
from llm_utils import retry_on_bad_structured_output

BASE_URL = "https://www.themealdb.com/api/json/v1/1"
FILTER_URL = f"{BASE_URL}/filter.php"
LOOKUP_URL = f"{BASE_URL}/lookup.php"

DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
BREAKFAST_CATEGORY = "Breakfast"
MAIN_CATEGORIES = ["Chicken", "Beef", "Seafood", "Vegetarian", "Pasta", "Pork"]

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


@retry_on_bad_structured_output
def _estimate_one(prompt: str) -> MealEstimate:
    return structured_estimate_llm.invoke(prompt)


def estimate_nutrition_and_price(recipes: dict[str, dict]) -> dict[str, MealEstimate]:
    """TheMealDB has no nutrition or pricing data at all — these are
    AI-estimated from each recipe's title and ingredients, not measured or
    verified. The frontend labels them accordingly."""
    estimates = {}
    for recipe_id, r in recipes.items():
        ingredients = ", ".join(r["ingredients"]) or "unknown"
        estimates[recipe_id] = _estimate_one(
            "Estimate realistic values for a single serving of this recipe: "
            "calories, protein_g, carbs_g, fat_g, and price_per_serving (USD, a "
            "rough US grocery-cost estimate for the ingredients divided by "
            "servings). Base it on typical preparation of this dish and its "
            "listed ingredients.\n\n"
            f"title: {r['title']}\ningredients: {ingredients}\n\n"
            "Respond with JSON matching this shape: "
            '{"calories": int, "protein_g": int, "carbs_g": int, "fat_g": int, "price_per_serving": float}'
        )
    return estimates


def mealplan_agent(state: MealPrepState) -> dict:
    requested_days = state.days or 7
    day_names = DAY_NAMES[:requested_days]

    # Pick which TheMealDB category supplies each day's lunch/dinner, cycling
    # through the list so a longer plan still gets some variety.
    week_plan: dict[str, list[str]] = {}
    for i, day_name in enumerate(day_names):
        lunch_category = MAIN_CATEGORIES[(i * 2) % len(MAIN_CATEGORIES)]
        dinner_category = MAIN_CATEGORIES[(i * 2 + 1) % len(MAIN_CATEGORIES)]

        breakfast_id = random.choice(fetch_category_meal_ids(BREAKFAST_CATEGORY))
        lunch_id = random.choice(fetch_category_meal_ids(lunch_category))
        dinner_id = random.choice(fetch_category_meal_ids(dinner_category))
        week_plan[day_name] = [breakfast_id, lunch_id, dinner_id]

    unique_ids = {meal_id for meal_ids in week_plan.values() for meal_id in meal_ids}

    # Only fetch full details + estimate nutrition for recipes we haven't
    # already cached from a previous run.
    raw_details = {}
    needs_estimate = {}
    complete: dict[str, dict] = {}
    for meal_id in unique_ids:
        cached = get_cached_recipe(int(meal_id))
        if cached is not None:
            complete[meal_id] = cached
            continue
        detail = fetch_meal_detail(meal_id)
        raw_details[meal_id] = detail
        needs_estimate[meal_id] = {
            "title": detail.get("strMeal"),
            "ingredients": extract_ingredients(detail),
        }

    if needs_estimate:
        estimates = estimate_nutrition_and_price(needs_estimate)
        for meal_id, base in needs_estimate.items():
            estimate = estimates.get(meal_id)
            recipe_data = {
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
