import base64
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from fastapi import UploadFile

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# llama-3.3-70b-versatile is text-only — photo analysis needs a vision-capable
# model. Groq's hosted model catalog changes over time, so verify this is
# still current at https://console.groq.com/docs/models before relying on it.
vision_llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct", temperature=0)


class FoodScanResult(BaseModel):
    food_description: str
    estimated_serving: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    confidence_note: str


structured_vision_llm = vision_llm.with_structured_output(FoodScanResult)


async def scan_food_photo(file: UploadFile) -> dict:
    image_bytes = await file.read()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = file.content_type if file.content_type in VALID_MEDIA_TYPES else "image/jpeg"

    message = HumanMessage(content=[
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
        {
            "type": "image_url",
            "image_url": {"url": f"data:{media_type};base64,{image_b64}"},
        },
    ])

    result: FoodScanResult = structured_vision_llm.invoke([message])
    return result.model_dump()
