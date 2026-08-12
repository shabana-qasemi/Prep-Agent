from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.budget import budget_agent


def test_budget_agent_sums_real_costs_and_calls_claude():
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
    fake_response.content = [MagicMock(type="text", text="Looks like it fits your budget.")]

    with patch("agents.budget.client.messages.create", return_value=fake_response) as mock_create:
        result = budget_agent(state)

    assert result["budget_notes"] == "Looks like it fits your budget."

    # Verify the prompt actually included the real computed total ($2.50 + $3.75)
    sent_prompt = mock_create.call_args.kwargs["messages"][0]["content"]
    assert "$6.25" in sent_prompt
