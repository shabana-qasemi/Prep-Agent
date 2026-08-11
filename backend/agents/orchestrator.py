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
                "A user has this meal prep goal:\n"
                f"\"{state.goal}\"\n\n"
                "Decide which of these steps are needed to fulfill it, in order:\n"
                "- macro: calculate daily macro/calorie targets (needed if they mention protein, calories, bulking, cutting, or macros)\n"
                "- mealplan: build a 7-day meal plan matching macro targets (almost always needed)\n"
                "- budget: adjust for cost constraints (only if they mention a budget or price limit)\n"
                "- grocery: consolidate a grocery list (needed if they want to actually shop/cook)\n\n"
                "Return only the relevant step names, in the order they should run."
            ),
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "plan": {
                            "type": "array",
                            "items": {"type": "string", "enum": VALID_STEPS},
                        }
                    },
                    "required": ["plan"],
                    "additionalProperties": False,
                },
            }
        },
    )

    text = next(block.text for block in response.content if block.type == "text")
    data = json.loads(text)

    return {"plan": data["plan"]}
