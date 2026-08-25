from langgraph.graph import StateGraph, START, END
from state import MealPrepState
from agents.orchestrator import orchestrator_agent
from agents.macro import macro_agent
from agents.mealplan import mealplan_agent
from agents.budget import budget_agent
from agents.grocery import grocery_agent
from agents.summary import summary_agent
from agents.answer import answer_agent


def route_next_step(state: MealPrepState) -> str:
    # The orchestrator can decide this isn't a meal-plan request at all (a
    # general question, small talk, etc.) — skip the whole plan-building
    # pipeline and just answer directly instead of forcing a plan on them.
    # This only matters right after "orchestrator": by the time macro/
    # mealplan/budget/grocery call this, is_meal_plan_request is already True,
    # since those nodes are only ever reached on that branch.
    if state.is_meal_plan_request is False:
        return "answer"

    plan = state.plan or []

    completed = []
    if state.macro_targets is not None:
        completed.append("macro")
    if state.meal_plan is not None:
        completed.append("mealplan")
    if state.budget_notes is not None:
        completed.append("budget")
    if state.grocery_list is not None:
        completed.append("grocery")

    remaining = [step for step in plan if step not in completed]
    return remaining[0] if remaining else "end"


graph = StateGraph(MealPrepState)

graph.add_node("orchestrator", orchestrator_agent)
graph.add_node("macro", macro_agent)
graph.add_node("mealplan", mealplan_agent)
graph.add_node("budget", budget_agent)
graph.add_node("grocery", grocery_agent)
graph.add_node("summary", summary_agent)
graph.add_node("answer", answer_agent)

graph.add_edge(START, "orchestrator")

# Once every planned step is done, route_next_step returns "end" — instead of
# finishing the graph right there, send it to the summary node for a final
# synthesized wrap-up, then always terminate after that (a plain edge, not
# conditional, since summary is never followed by anything else). "answer" is
# a separate terminal branch entirely, for non-meal-plan requests.
ROUTES = {
    "macro": "macro",
    "mealplan": "mealplan",
    "budget": "budget",
    "grocery": "grocery",
    "end": "summary",
    "answer": "answer",
}

graph.add_conditional_edges("orchestrator", route_next_step, ROUTES)
graph.add_conditional_edges("macro", route_next_step, ROUTES)
graph.add_conditional_edges("mealplan", route_next_step, ROUTES)
graph.add_conditional_edges("budget", route_next_step, ROUTES)
graph.add_conditional_edges("grocery", route_next_step, ROUTES)

graph.add_edge("summary", END)
graph.add_edge("answer", END)

meal_prep_graph = graph.compile()
