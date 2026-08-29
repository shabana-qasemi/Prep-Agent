from conversation import build_contextual_goal


def test_returns_message_unchanged_with_no_history():
    assert build_contextual_goal([], "Bulking, 180g protein") == "Bulking, 180g protein"


def test_wraps_message_with_recent_history():
    history = [
        {"role": "user", "text": "Bulking, 180g protein"},
        {"role": "assistant", "text": "Here's your plan..."},
    ]
    result = build_contextual_goal(history, "make it cheaper")

    assert "Bulking, 180g protein" in result
    assert "Here's your plan..." in result
    assert "make it cheaper" in result


def test_ignores_messages_with_no_text():
    history = [{"role": "user", "text": ""}, {"role": "user", "text": None}]
    assert build_contextual_goal(history, "hello") == "hello"


def test_only_keeps_the_most_recent_messages():
    history = [{"role": "user", "text": f"message {i}"} for i in range(10)]
    result = build_contextual_goal(history, "follow up")

    assert "message 9" in result
    assert "message 0" not in result
