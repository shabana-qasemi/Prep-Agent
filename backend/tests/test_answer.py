from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.answer import answer_agent


def test_answer_agent_returns_direct_answer():
    state = MealPrepState(goal="how much protein should I eat daily?", is_meal_plan_request=False)

    fake_response = MagicMock()
    fake_response.content = "Roughly 0.7-1g per pound of bodyweight is a solid target."

    # Patching the whole module-level `llm` object (not its .invoke method)
    # since ChatGroq is a pydantic model and patch() can't cleanly mutate a
    # pydantic instance's attributes (fails restoring it on cleanup).
    with patch("agents.answer.llm") as mock_llm:
        mock_llm.invoke.return_value = fake_response
        result = answer_agent(state)

    assert result == {"direct_answer": "Roughly 0.7-1g per pound of bodyweight is a solid target."}


def test_answer_agent_sends_the_users_question_in_the_prompt():
    state = MealPrepState(goal="is peanut butter healthy?", is_meal_plan_request=False)

    fake_response = MagicMock()
    fake_response.content = "In moderation, yes."

    with patch("agents.answer.llm") as mock_llm:
        mock_llm.invoke.return_value = fake_response
        answer_agent(state)

    sent_prompt = mock_llm.invoke.call_args.args[0]
    assert "is peanut butter healthy?" in sent_prompt
