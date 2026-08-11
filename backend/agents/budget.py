import anthropic
from state import MealPrepState

client = anthropic.Anthropic()


def budget_agent(state: MealPrepState) -> dict:
    meal_plan = state.meal_plan or {}

    total_cost = 0.0
    day_summaries = []
    for day_name, day_data in meal_plan.items():
        day_cost = sum(meal.get("price_per_serving", 0) for meal in day_data["meals"])
        total_cost += day_cost
        meal_titles = ", ".join(meal["title"] for meal in day_data["meals"])
        day_summaries.append(f"- {day_name.capitalize()}: ${day_cost:.2f} ({meal_titles})")

    plan_summary = "\n".join(day_summaries)

    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": (
                "Here is the user's goal (which may mention a budget) and their "
                "7-day meal plan with each day's real cost. Assess whether the "
                "full week fits within any stated budget, and suggest specific "
                "swaps for the most expensive days if it doesn't.\n\n"
                f"Goal: \"{state.goal}\"\n\n"
                f"Total weekly cost: ${total_cost:.2f}\n\n"
                f"Daily breakdown:\n{plan_summary}"
            ),
        }],
    )

    notes = next(block.text for block in response.content if block.type == "text")
    return {"budget_notes": notes}
