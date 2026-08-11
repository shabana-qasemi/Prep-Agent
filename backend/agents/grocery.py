from state import MealPrepState


def grocery_agent(state: MealPrepState) -> dict:
    all_items = []
    for day_data in (state.meal_plan or {}).values():
        for meal in day_data["meals"]:
            all_items.extend(meal.get("ingredients", []))

    unique_items = sorted(set(all_items))
    return {"grocery_list": unique_items}
