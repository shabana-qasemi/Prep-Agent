import base64
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi import UploadFile

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# Groq has no vision-capable model at all right now (confirmed by querying
# their live /models endpoint), so reading a menu photo uses Gemini instead.
# gemini-2.5-flash is no longer available to new API keys as of this
# writing — Google's own API error explicitly points to gemini-3.6-flash,
# confirmed working (including this exact nested-list schema) via live testing.
vision_llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0)


class MenuPick(BaseModel):
    item_name: str
    why_it_fits: str
    estimated_calories: int
    estimated_protein_g: int
    estimated_carbs_g: int
    estimated_fat_g: int
    modification_tip: str


class MenuDecoderResult(BaseModel):
    picks: list[MenuPick]
    menu_note: str


structured_vision_llm = vision_llm.with_structured_output(MenuDecoderResult)


async def decode_menu_photo(file: UploadFile, goal: str) -> dict:
    image_bytes = await file.read()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = file.content_type if file.content_type in VALID_MEDIA_TYPES else "image/jpeg"

    message = HumanMessage(content=[
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
        {
            "type": "image_url",
            "image_url": {"url": f"data:{media_type};base64,{image_b64}"},
        },
    ])

    result: MenuDecoderResult = structured_vision_llm.invoke([message])
    return result.model_dump()
