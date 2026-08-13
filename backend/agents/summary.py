import anthropic
from state import MealPrepState

client = anthropic.Anthropic()


def summary_agent(state: MealPrepState) -> dict:
    parts = [f'Goal: "{state.goal}"']

    if state.macro_targets:
        m = state.macro_targets
        parts.append(
            f"Daily targets: {m['calories']} kcal, {m['protein_g']}g protein, "
            f"{m['carbs_g']}g carbs, {m['fat_g']}g fat"
        )

    if state.meal_plan:
        parts.append(f"Meal plan covers {len(state.meal_plan)} day(s).")

    if state.budget_notes:
        parts.append(f"Budget notes: {state.budget_notes}")

    if state.grocery_list:
        parts.append(f"Grocery list has {len(state.grocery_list)} items.")

    context = "\n\n".join(parts)

    response = client.messages.create(
        model="claude-opus-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "Here is a completed meal prep plan generated for a user. Write a short, "
                "encouraging 2-4 sentence wrap-up: confirm the plan meets their stated goal, "
                "call out the single most useful actionable tip drawn from the data below "
                "(a budget swap, a prep-day idea, or a macro insight), and end on one "
                "motivating note. Don't just repeat numbers already shown elsewhere — synthesize.\n\n"
                f"{context}"
            ),
        }],
    )

    text = next(block.text for block in response.content if block.type == "text")
    return {"final_summary": text}
