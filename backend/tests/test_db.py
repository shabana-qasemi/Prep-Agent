from db import (
    init_db,
    create_conversation,
    touch_conversation,
    list_conversations,
    add_message,
    get_messages,
    save_plan,
    get_plan,
    update_plan,
)


def test_conversation_roundtrip():
    init_db()
    create_conversation("c1", "visitor-a", "Bulking, 180g protein/day")
    add_message("c1", "user", "Bulking, 180g protein/day")
    add_message("c1", "assistant", "Here's your plan...", plan_id="p1")

    messages = get_messages("c1")
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert messages[1]["plan_id"] == "p1"

    conversations = list_conversations("visitor-a")
    assert len(conversations) == 1
    assert conversations[0]["title"] == "Bulking, 180g protein/day"


def test_list_conversations_only_returns_matching_visitor():
    init_db()
    create_conversation("c1", "visitor-a", "hello")
    create_conversation("c2", "visitor-b", "hi there")

    assert [c["id"] for c in list_conversations("visitor-a")] == ["c1"]
    assert [c["id"] for c in list_conversations("visitor-b")] == ["c2"]


def test_touch_conversation_updates_ordering():
    init_db()
    create_conversation("older", "visitor-a", "first")
    create_conversation("newer", "visitor-a", "second")
    touch_conversation("older")

    # "older" was just touched, so it should now sort ahead of "newer".
    assert list_conversations("visitor-a")[0]["id"] == "older"


def test_update_plan_overwrites_existing_data():
    init_db()
    save_plan("p1", {"goal": "test", "meal_plan": {"monday": {}}}, visitor_id="visitor-a")
    update_plan("p1", {"goal": "test", "meal_plan": {"monday": {"swapped": True}}})

    assert get_plan("p1")["meal_plan"]["monday"] == {"swapped": True}
