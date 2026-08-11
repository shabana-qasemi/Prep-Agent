import json
import anthropic
from state import MealPrepState

client = anthropic.Anthropic()


def macro_agent(state: MealPrepState) -> dict:
    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "Based on this person's goal, estimate reasonable daily macro and "
                "calorie targets. Make sensible assumptions if details are missing, "
                "and note any assumptions in the 'notes' field.\n\n"
                f"Goal: \"{state.goal}\""
            ),
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "calories": {"type": "integer"},
                        "protein_g": {"type": "integer"},
                        "carbs_g": {"type": "integer"},
                        "fat_g": {"type": "integer"},
                        "notes": {"type": "string"},
                    },
                    "required": ["calories", "protein_g", "carbs_g", "fat_g", "notes"],
                    "additionalProperties": False,
                },
            }
        },
    )

    text = next(block.text for block in response.content if block.type == "text")
    data = json.loads(text)

    return {"macro_targets": data}
