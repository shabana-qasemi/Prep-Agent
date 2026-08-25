from unittest.mock import patch, MagicMock
from state import MealPrepState
from agents.answer import answer_agent


def test_answer_agent_returns_direct_answer():
    state = MealPrepState(goal="how much protein should I eat daily?", is_meal_plan_request=False)

    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text="Roughly 0.7-1g per pound of bodyweight is a solid target.")]

    with patch("agents.answer.client.messages.create", return_value=fake_response):
        result = answer_agent(state)

    assert result == {"direct_answer": "Roughly 0.7-1g per pound of bodyweight is a solid target."}


def test_answer_agent_sends_the_users_question_in_the_prompt():
    state = MealPrepState(goal="is peanut butter healthy?", is_meal_plan_request=False)

    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text="In moderation, yes.")]

    with patch("agents.answer.client.messages.create", return_value=fake_response) as mock_create:
        answer_agent(state)

    sent_prompt = mock_create.call_args.kwargs["messages"][0]["content"]
    assert "is peanut butter healthy?" in sent_prompt
