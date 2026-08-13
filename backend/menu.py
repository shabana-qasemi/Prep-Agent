import base64
import json
import anthropic
from fastapi import UploadFile

client = anthropic.Anthropic()

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


async def decode_menu_photo(file: UploadFile, goal: str) -> dict:
    image_bytes = await file.read()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = file.content_type if file.content_type in VALID_MEDIA_TYPES else "image/jpeg"

    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=1536,
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
                        "This is a photo of a restaurant menu. Here is what the user wants:\n"
                        f'"{goal}"\n\n'
                        "Read the menu and pick up to 3 of the best options that fit their goal. "
                        "Menus rarely list exact nutrition, so give your best realistic estimate for "
                        "each pick's calories, protein, carbs, and fat, and be upfront that these are "
                        "estimates, not precise measurements. For each pick, explain briefly why it "
                        "fits, and suggest one easy modification (e.g. 'ask for dressing on the side') "
                        "that would make it fit even better if relevant."
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
                        "picks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "item_name": {"type": "string"},
                                    "why_it_fits": {"type": "string"},
                                    "estimated_calories": {"type": "integer"},
                                    "estimated_protein_g": {"type": "integer"},
                                    "estimated_carbs_g": {"type": "integer"},
                                    "estimated_fat_g": {"type": "integer"},
                                    "modification_tip": {"type": "string"},
                                },
                                "required": [
                                    "item_name",
                                    "why_it_fits",
                                    "estimated_calories",
                                    "estimated_protein_g",
                                    "estimated_carbs_g",
                                    "estimated_fat_g",
                                    "modification_tip",
                                ],
                                "additionalProperties": False,
                            },
                        },
                        "menu_note": {"type": "string"},
                    },
                    "required": ["picks", "menu_note"],
                    "additionalProperties": False,
                },
            }
        },
    )

    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)
