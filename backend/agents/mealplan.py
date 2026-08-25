import os
import requests
from state import MealPrepState
from db import get_cached_recipe, cache_recipe

GENERATE_URL = "https://api.spoonacular.com/mealplanner/generate"
INFO_URL = "https://api.spoonacular.com/recipes/{id}/information"


def get_nutrient(nutrients: list, name: str) -> float:
    return next((n["amount"] for n in nutrients if n["name"] == name), 0)


def check_response(response: requests.Response, context: str) -> None:
    """Like response.raise_for_status(), but never leaks the API key —
    requests' default error message embeds the full request URL, query
    string included, which would expose our Spoonacular key to callers."""
    if not response.ok:
        raise RuntimeError(f"{context} failed: {response.status_code} {response.reason}")


def mealplan_agent(state: MealPrepState) -> dict:
    api_key = os.environ["SPOONACULAR_API_KEY"]

    target_calories = 2000
    if state.macro_targets:
        target_calories = state.macro_targets["calories"]

    generate_response = requests.get(
        GENERATE_URL,
        params={
            "apiKey": api_key,
            "timeFrame": "week",
            "targetCalories": target_calories,
        },
        timeout=20,
    )
    check_response(generate_response, "Spoonacular meal plan generation")
    week = generate_response.json()["week"]

    # Recipes often repeat across the week — collect only the unique IDs so we
    # don't waste API calls fetching the same recipe's details more than once.
    unique_ids = {meal["id"] for day in week.values() for meal in day["meals"]}

    details = {}
    for recipe_id in unique_ids:
        cached = get_cached_recipe(recipe_id)
        if cached is not None:
            details[recipe_id] = cached
            continue

        info_response = requests.get(
            INFO_URL.format(id=recipe_id),
            params={"apiKey": api_key, "includeNutrition": True},
            timeout=20,
        )
        check_response(info_response, f"Spoonacular recipe lookup for id {recipe_id}")
        info = info_response.json()
        nutrients = info.get("nutrition", {}).get("nutrients", [])

        recipe_data = {
            "title": info.get("title"),
            "calories": get_nutrient(nutrients, "Calories"),
            "protein_g": get_nutrient(nutrients, "Protein"),
            "carbs_g": get_nutrient(nutrients, "Carbohydrates"),
            "fat_g": get_nutrient(nutrients, "Fat"),
            "image": info.get("image"),
            "price_per_serving": info.get("pricePerServing", 0) / 100,
            "source_url": info.get("sourceUrl"),
            "ingredients": [
                ing.get("original") for ing in info.get("extendedIngredients", [])
            ],
        }
        cache_recipe(recipe_id, recipe_data)
        details[recipe_id] = recipe_data

    # Spoonacular only generates a full week — trim down to the number of
    # days actually requested (it returns Monday-first, so slicing keeps order).
    requested_days = state.days or 7
    day_names = list(week.keys())[:requested_days]

    meal_plan = {}
    for day_name in day_names:
        day_data = week[day_name]
        meal_plan[day_name] = {
            "meals": [details[meal["id"]] for meal in day_data["meals"]],
            "nutrients": day_data["nutrients"],
        }

    return {"meal_plan": meal_plan}
