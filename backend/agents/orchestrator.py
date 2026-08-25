import json
import anthropic
from state import MealPrepState

client = anthropic.Anthropic()

VALID_STEPS = ["macro", "mealplan", "budget", "grocery"]


def orchestrator_agent(state: MealPrepState) -> dict:
    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                "A user sent this message to a meal-prep planning assistant:\n"
                f"\"{state.goal}\"\n\n"
                "First decide: is this actually a request to build/generate a meal "
                "plan (including just a grocery list, a budget check, or macro "
                "targets on their own)? Or is it a general question, casual message, "
                "or something else that doesn't need a plan generated at all — "
                "e.g. nutrition advice, a factual question, small talk, asking how "
                "this works?\n\n"
                "If it IS a meal-plan request, decide which of these steps are needed, in order:\n"
                "- macro: calculate daily macro/calorie targets (needed if they mention protein, calories, bulking, cutting, or macros)\n"
                "- mealplan: build a meal plan matching macro targets (almost always needed)\n"
                "- budget: adjust for cost constraints (only if they mention a budget or price limit)\n"
                "- grocery: consolidate a grocery list (needed if they want to actually shop/cook)\n\n"
                "Also figure out how many days of meals they want. If they don't say, default to 7.\n\n"
                "If it is NOT a meal-plan request, set plan to an empty array and "
                "days to 7 — those fields are ignored in that case."
            ),
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "is_meal_plan_request": {"type": "boolean"},
                        "plan": {
                            "type": "array",
                            "items": {"type": "string", "enum": VALID_STEPS},
                        },
                        # Anthropic's structured-output schema validator rejects
                        # `minimum`/`maximum` on integer properties — enum is the
                        # supported way to constrain to a fixed range of ints.
                        "days": {"type": "integer", "enum": [1, 2, 3, 4, 5, 6, 7]},
                    },
                    "required": ["is_meal_plan_request", "plan", "days"],
                    "additionalProperties": False,
                },
            }
        },
    )

    text = next(block.text for block in response.content if block.type == "text")
    data = json.loads(text)

    return {
        "is_meal_plan_request": data["is_meal_plan_request"],
        "plan": data["plan"],
        "days": max(1, min(7, data["days"])),
    }
