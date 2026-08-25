import json
from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.orchestrator import orchestrator_agent


def test_orchestrator_returns_plan_and_days():
    state = MealPrepState(goal="bulking, need 180g protein/day, 5 days")

    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text=json.dumps({"plan": ["macro", "mealplan"], "days": 5}))]

    with patch("agents.orchestrator.client.messages.create", return_value=fake_response):
        result = orchestrator_agent(state)

    assert result == {"plan": ["macro", "mealplan"], "days": 5}


def test_orchestrator_clamps_out_of_range_days():
    state = MealPrepState(goal="whatever")

    fake_response = MagicMock()
    # A model could still misbehave despite the enum constraint — the clamp
    # is the actual safety net, not the schema alone.
    fake_response.content = [MagicMock(type="text", text=json.dumps({"plan": [], "days": 14}))]

    with patch("agents.orchestrator.client.messages.create", return_value=fake_response):
        result = orchestrator_agent(state)

    assert result["days"] == 7


def test_orchestrator_schema_never_uses_unsupported_numeric_keywords():
    # Regression guard: Anthropic's structured-output schema validator
    # rejects `minimum`/`maximum` on integer properties (a real 400 error
    # caught by live testing, not by any mock). Constraining an integer to a
    # fixed range must use `enum` instead.
    state = MealPrepState(goal="whatever")

    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text=json.dumps({"plan": [], "days": 1}))]

    with patch("agents.orchestrator.client.messages.create", return_value=fake_response) as mock_create:
        orchestrator_agent(state)

    schema_str = json.dumps(mock_create.call_args.kwargs["output_config"])
    assert "minimum" not in schema_str
    assert "maximum" not in schema_str
