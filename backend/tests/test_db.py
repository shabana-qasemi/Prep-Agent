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
    add_daily_meal,
    get_daily_meals,
    remove_daily_meal,
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


def test_daily_meals_start_empty():
    init_db()
    assert get_daily_meals("visitor-c", "2026-01-01") == []


def test_daily_meals_are_recorded_for_the_right_day():
    init_db()
    add_daily_meal("visitor-d", "2026-01-01", "Chicken bowl", 600, 45)
    add_daily_meal("visitor-d", "2026-01-02", "Oatmeal", 350, 12)
    meals = get_daily_meals("visitor-d", "2026-01-01")
    assert len(meals) == 1
    assert meals[0]["meal_name"] == "Chicken bowl"
    assert meals[0]["calories"] == 600
    assert meals[0]["protein"] == 45


def test_remove_daily_meal_deletes_only_that_entry():
    init_db()
    add_daily_meal("visitor-e", "2026-01-01", "Eggs", 300, 20)
    meal_id = add_daily_meal("visitor-e", "2026-01-01", "Steak", 700, 55)
    remove_daily_meal(meal_id, "visitor-e")
    meals = get_daily_meals("visitor-e", "2026-01-01")
    assert len(meals) == 1
    assert meals[0]["meal_name"] == "Eggs"


def test_remove_daily_meal_requires_matching_visitor():
    init_db()
    meal_id = add_daily_meal("visitor-f", "2026-01-01", "Salad", 250, 10)
    remove_daily_meal(meal_id, "someone-else")
    meals = get_daily_meals("visitor-f", "2026-01-01")
    assert len(meals) == 1
