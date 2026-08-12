from db import init_db, get_cached_recipe, cache_recipe, save_plan, get_plan


def test_cache_miss_returns_none():
    init_db()
    assert get_cached_recipe(999999999) is None


def test_cache_hit_returns_saved_data():
    init_db()
    cache_recipe(123456, {"title": "Test Recipe", "calories": 500})
    assert get_cached_recipe(123456) == {"title": "Test Recipe", "calories": 500}


def test_cache_overwrites_on_recache():
    init_db()
    cache_recipe(555, {"title": "Old"})
    cache_recipe(555, {"title": "New"})
    assert get_cached_recipe(555)["title"] == "New"


def test_saved_plan_can_be_retrieved():
    init_db()
    save_plan("abc123", {"goal": "test goal", "macro_targets": {"calories": 2000}})
    assert get_plan("abc123") == {"goal": "test goal", "macro_targets": {"calories": 2000}}


def test_missing_plan_returns_none():
    init_db()
    assert get_plan("does-not-exist") is None
