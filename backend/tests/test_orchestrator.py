from unittest.mock import patch
from state import MealPrepState
from agents.orchestrator import orchestrator_agent, OrchestratorDecision


def test_orchestrator_returns_plan_and_days():
    state = MealPrepState(goal="bulking, need 180g protein/day, 5 days")

    fake_decision = OrchestratorDecision(is_meal_plan_request=True, plan=["macro", "mealplan"], days=5)

    with patch("agents.orchestrator.structured_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_decision
        result = orchestrator_agent(state)

    assert result == {"is_meal_plan_request": True, "plan": ["macro", "mealplan"], "days": 5}


def test_orchestrator_detects_a_general_question():
    state = MealPrepState(goal="how much protein should I eat daily?")

    fake_decision = OrchestratorDecision(is_meal_plan_request=False, plan=[], days=7)

    with patch("agents.orchestrator.structured_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_decision
        result = orchestrator_agent(state)

    assert result["is_meal_plan_request"] is False


def test_orchestrator_clamps_out_of_range_days():
    state = MealPrepState(goal="whatever")

    # A model could still misbehave despite the schema — the clamp is the
    # actual safety net, not the schema alone.
    fake_decision = OrchestratorDecision(is_meal_plan_request=True, plan=[], days=14)

    with patch("agents.orchestrator.structured_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_decision
        result = orchestrator_agent(state)

    assert result["days"] == 7
