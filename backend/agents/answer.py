import anthropic
from state import MealPrepState

client = anthropic.Anthropic()


def answer_agent(state: MealPrepState) -> dict:
    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "You're Prep-Agent, a meal-prep planning assistant. The user sent "
                "this message, and the orchestrator has already determined it's NOT "
                "a request to build a meal plan — just answer it directly and "
                "helpfully in a few sentences, in plain language. Don't build or "
                "describe a meal plan, and don't offer to build one unless it's "
                "genuinely the natural next step for what they asked.\n\n"
                f'"{state.goal}"'
            ),
        }],
    )

    text = next(block.text for block in response.content if block.type == "text")
    return {"direct_answer": text}
