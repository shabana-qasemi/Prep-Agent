import base64
import json
import anthropic
from fastapi import UploadFile

client = anthropic.Anthropic()

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


async def scan_food_photo(file: UploadFile) -> dict:
    image_bytes = await file.read()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = file.content_type if file.content_type in VALID_MEDIA_TYPES else "image/jpeg"

    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_b64,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "Look at this food photo and estimate its nutritional content. "
                        "Identify the food(s) you see, estimate a reasonable serving size, "
                        "and give your best estimate of calories, protein, carbs, and fat. "
                        "In confidence_note, be honest that this is a visual estimate, not a "
                        "precise measurement, and note anything that makes the estimate less certain "
                        "(hidden ingredients, unclear portion size, etc.)."
                    ),
                },
            ],
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "food_description": {"type": "string"},
                        "estimated_serving": {"type": "string"},
                        "calories": {"type": "integer"},
                        "protein_g": {"type": "integer"},
                        "carbs_g": {"type": "integer"},
                        "fat_g": {"type": "integer"},
                        "confidence_note": {"type": "string"},
                    },
                    "required": [
                        "food_description",
                        "estimated_serving",
                        "calories",
                        "protein_g",
                        "carbs_g",
                        "fat_g",
                        "confidence_note",
                    ],
                    "additionalProperties": False,
                },
            }
        },
    )

    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)
