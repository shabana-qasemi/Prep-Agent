import base64
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi import UploadFile

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# Groq has no vision-capable model at all right now (confirmed by querying
# their live /models endpoint), so photo analysis uses Gemini instead.
# gemini-2.5-flash is no longer available to new API keys as of this
# writing — Google's own API error explicitly points to gemini-3.6-flash,
# confirmed working (text, structured output, and vision) via live testing.
vision_llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0)


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
