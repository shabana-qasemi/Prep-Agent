from db import (
    init_db,
    get_cached_recipe,
    cache_recipe,
    save_plan,
    get_plan,
    get_usage_count,
    increment_usage,
    add_progress_entry,
    get_progress_entries,
)


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


def test_usage_count_starts_at_zero():
    init_db()
    assert get_usage_count("1.2.3.4", "2026-01-01") == 0


def test_increment_usage_counts_up():
    init_db()
    increment_usage("1.2.3.4", "2026-01-01")
    increment_usage("1.2.3.4", "2026-01-01")
    assert get_usage_count("1.2.3.4", "2026-01-01") == 2


def test_usage_is_isolated_per_day():
    init_db()
    increment_usage("1.2.3.4", "2026-01-01")
    assert get_usage_count("1.2.3.4", "2026-01-02") == 0


def test_progress_entries_start_empty():
    init_db()
    assert get_progress_entries("visitor-with-no-entries") == []


def test_progress_entries_are_recorded_and_ordered_by_date():
    init_db()
    add_progress_entry("visitor-a", "2026-01-05", 181.0, None)
    add_progress_entry("visitor-a", "2026-01-01", 183.5, "starting weight")
    entries = get_progress_entries("visitor-a")
    assert [e["entry_date"] for e in entries] == ["2026-01-01", "2026-01-05"]
    assert entries[0]["weight"] == 183.5
    assert entries[0]["note"] == "starting weight"


def test_progress_entries_are_isolated_per_visitor():
    init_db()
    add_progress_entry("visitor-b", "2026-01-01", 150.0, None)
    assert get_progress_entries("someone-else") == []
