from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.budget import budget_agent


def test_budget_agent_sums_real_costs_and_calls_llm():
    state = MealPrepState(
        goal="bulk on $60/week",
        meal_plan={
            "monday": {"meals": [
                {"title": "Eggs and Toast", "price_per_serving": 2.50},
                {"title": "Chicken Rice Bowl", "price_per_serving": 3.75},
            ]},
        },
    )

    fake_response = MagicMock()
    fake_response.content = "Looks like it fits your budget."

    with patch("agents.budget.llm") as mock_llm:
        mock_llm.invoke.return_value = fake_response
        result = budget_agent(state)

    assert result["budget_notes"] == "Looks like it fits your budget."

    # Verify the prompt actually included the real computed total ($2.50 + $3.75)
    sent_prompt = mock_llm.invoke.call_args.args[0]
    assert "$6.25" in sent_prompt
