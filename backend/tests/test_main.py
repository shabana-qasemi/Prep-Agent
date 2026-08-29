from unittest.mock import patch
from fastapi.testclient import TestClient
import main
from db import init_db, create_conversation, add_message, save_plan


client = TestClient(main.app)


def test_conversations_endpoint_returns_only_this_visitor():
    init_db()
    create_conversation("c1", "visitor-a", "hello")
    create_conversation("c2", "visitor-b", "hi")

    res = client.get("/api/conversations", params={"visitor_id": "visitor-a"})

    assert res.status_code == 200
    assert [c["id"] for c in res.json()] == ["c1"]


def test_conversation_messages_endpoint_returns_full_thread():
    init_db()
    create_conversation("c1", "visitor-a", "hello")
    add_message("c1", "user", "hello")
    add_message("c1", "assistant", "hi there", plan_id=None)

    res = client.get("/api/conversations/c1/messages")

    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    assert body[0]["role"] == "user"
    assert body[1]["role"] == "assistant"


def test_swap_meal_endpoint_returns_404_for_unknown_plan():
    init_db()
    res = client.post("/api/plan/does-not-exist/swap", json={"day": "monday", "meal_index": 0})
    assert res.status_code == 404


def test_swap_meal_endpoint_returns_400_for_invalid_day():
    init_db()
    save_plan("p1", {
        "goal": "test",
        "meal_plan": {"monday": {"meals": [{"id": 1, "calories": 1, "protein_g": 1, "carbs_g": 1, "fat_g": 1, "ingredients": []}], "nutrients": {}}},
    })

    res = client.post("/api/plan/p1/swap", json={"day": "someday", "meal_index": 0})
    assert res.status_code == 400


def test_swap_meal_endpoint_updates_plan_and_regroups_grocery():
    init_db()
    save_plan("p1", {
        "goal": "test",
        "meal_plan": {"monday": {
            "meals": [{"id": 1, "title": "Old", "calories": 100, "protein_g": 10, "carbs_g": 10, "fat_g": 5, "ingredients": ["1 cup Rice"]}],
            "nutrients": {"calories": 100, "protein": 10, "fat": 5, "carbohydrates": 10},
        }},
    })

    new_day = {
        "meals": [{"id": 2, "title": "New", "calories": 200, "protein_g": 20, "carbs_g": 20, "fat_g": 10, "ingredients": ["2 Eggs"]}],
        "nutrients": {"calories": 200, "protein": 20, "fat": 10, "carbohydrates": 20},
    }

    with patch("main.swap_meal", return_value=new_day):
        res = client.post("/api/plan/p1/swap", json={"day": "monday", "meal_index": 0})

    assert res.status_code == 200
    body = res.json()
    assert body["meal_plan_day"]["meals"][0]["title"] == "New"
    assert "2 Eggs" in body["grocery_list"]


def test_plan_endpoint_rejects_oversized_goal():
    # Regression guard: an unbounded `goal` string is a memory/cost vector
    # (it flows into every LLM prompt in the pipeline) — Field(max_length=...)
    # on PlanRequest must reject this with a validation error, not accept it.
    init_db()
    res = client.post("/api/plan", json={"goal": "x" * 3000})
    assert res.status_code == 422


def test_oversized_request_body_rejected_by_size_middleware():
    # Regression guard: this must be rejected before it ever reaches Pydantic
    # validation or an LLM call — a JSON body has no built-in size limit.
    init_db()
    huge_goal = "x" * (main.MAX_REQUEST_BYTES + 1024)
    res = client.post("/api/plan", json={"goal": huge_goal})
    assert res.status_code == 413


def test_swap_endpoint_does_not_leak_raw_exception_text():
    # Regression guard: internal exception text (which can include file
    # paths or library internals) must never reach the client — only a
    # generic, safe message.
    init_db()
    save_plan("p1", {
        "goal": "test",
        "meal_plan": {"monday": {"meals": [{"id": 1, "calories": 1, "protein_g": 1, "carbs_g": 1, "fat_g": 1, "ingredients": []}], "nutrients": {}}},
    })

    with patch("main.swap_meal", side_effect=RuntimeError("/private/some/internal/path failed: 503")):
        res = client.post("/api/plan/p1/swap", json={"day": "monday", "meal_index": 0})

    assert res.status_code == 502
    assert "/private/some/internal/path" not in res.text
    assert res.json()["detail"] == "A required external service failed. Please try again."


def test_unhandled_exception_returns_generic_message_not_stack_trace():
    # TestClient re-raises unhandled exceptions by default (for debuggability
    # during test-writing) even when a global exception_handler is
    # registered — raise_server_exceptions=False is needed to actually
    # observe the sanitized response a real client would get.
    lenient_client = TestClient(main.app, raise_server_exceptions=False)
    init_db()
    save_plan("p1", {
        "goal": "test",
        "meal_plan": {"monday": {"meals": [{"id": 1, "calories": 1, "protein_g": 1, "carbs_g": 1, "fat_g": 1, "ingredients": []}], "nutrients": {}}},
    })

    with patch("main.swap_meal", side_effect=KeyError("some_internal_dict_key")):
        res = lenient_client.post("/api/plan/p1/swap", json={"day": "monday", "meal_index": 0})

    assert res.status_code == 500
    assert "some_internal_dict_key" not in res.text
    assert res.json()["detail"] == "Internal server error."
