from langchain_groq import ChatGroq
from state import MealPrepState

llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)


def answer_agent(state: MealPrepState) -> dict:
    response = llm.invoke(
        "You're Prep-Agent, a meal-prep planning assistant. The user sent "
        "this message, and the orchestrator has already determined it's NOT "
        "a request to build a meal plan — just answer it directly and "
        "helpfully in a few sentences, in plain language. Don't build or "
        "describe a meal plan, and don't offer to build one unless it's "
        "genuinely the natural next step for what they asked.\n\n"
        f'"{state.goal}"'
    )

    return {"direct_answer": response.content}
