from state import MealPrepState
from graph import route_next_step


def test_routes_to_first_incomplete_step():
    state = MealPrepState(goal="bulk on a budget", plan=["macro", "mealplan", "budget", "grocery"])
    assert route_next_step(state) == "macro"


def test_skips_completed_steps():
    state = MealPrepState(
        goal="bulk on a budget",
        plan=["macro", "mealplan", "budget", "grocery"],
        macro_targets={"calories": 3000},
    )
    assert route_next_step(state) == "mealplan"


def test_ends_when_plan_is_fully_complete():
    state = MealPrepState(
        goal="bulk on a budget",
        plan=["macro", "grocery"],
        macro_targets={"calories": 3000},
        grocery_list=["eggs", "rice"],
    )
    assert route_next_step(state) == "end"


def test_only_runs_steps_in_the_plan():
    # Orchestrator decided budget wasn't needed — even though macro is done,
    # budget should never run since it was never in the plan.
    state = MealPrepState(
        goal="just eat better, no budget mentioned",
        plan=["macro", "mealplan"],
        macro_targets={"calories": 2200},
    )
    assert route_next_step(state) == "mealplan"


def test_empty_plan_ends_immediately():
    state = MealPrepState(goal="bulk on a budget", plan=[])
    assert route_next_step(state) == "end"


def test_non_meal_plan_request_routes_to_answer():
    # A general question ("how much protein should I eat?") never touches the
    # plan-building pipeline at all — straight to the answer node.
    state = MealPrepState(goal="how much protein should I eat daily?", is_meal_plan_request=False)
    assert route_next_step(state) == "answer"


def test_meal_plan_request_ignores_is_meal_plan_request_true():
    state = MealPrepState(
        goal="bulk on a budget",
        is_meal_plan_request=True,
        plan=["macro", "mealplan"],
    )
    assert route_next_step(state) == "macro"
