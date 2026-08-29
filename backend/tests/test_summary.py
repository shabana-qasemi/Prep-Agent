from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.summary import summary_agent


def test_summary_agent_returns_final_summary():
    state = MealPrepState(
        goal="bulk on a budget",
        macro_targets={"calories": 3000, "protein_g": 180, "carbs_g": 379, "fat_g": 85, "notes": ""},
        meal_plan={"monday": {"meals": [], "nutrients": {}}},
        budget_notes="Fits within budget.",
        grocery_list=["eggs", "rice"],
    )

    fake_response = MagicMock()
    fake_response.content = "Great week ahead — you're on track."

    with patch("agents.summary.llm") as mock_llm:
        mock_llm.invoke.return_value = fake_response
        result = summary_agent(state)

    assert result["final_summary"] == "Great week ahead — you're on track."


def test_summary_agent_prompt_includes_available_context():
    state = MealPrepState(
        goal="just eat healthier",
        macro_targets={"calories": 2200, "protein_g": 120, "carbs_g": 250, "fat_g": 70, "notes": ""},
    )

    fake_response = MagicMock()
    fake_response.content = "Nice, balanced plan."

    with patch("agents.summary.llm") as mock_llm:
        mock_llm.invoke.return_value = fake_response
        summary_agent(state)

    sent_prompt = mock_llm.invoke.call_args.args[0]
    assert "just eat healthier" in sent_prompt
    assert "2200 kcal" in sent_prompt
    # No meal plan / budget / grocery data was provided — shouldn't be mentioned.
    assert "Meal plan covers" not in sent_prompt
    assert "Budget notes" not in sent_prompt
