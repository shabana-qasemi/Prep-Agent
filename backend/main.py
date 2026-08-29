from dotenv import load_dotenv

load_dotenv()

import json
import logging
import os
import uuid
from datetime import date
from typing import Optional
import requests
from groq import RateLimitError as GroqRateLimitError
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Real exception details (which can include internal file paths, library
# internals, or other implementation detail) are logged here for debugging,
# but never sent to the client — see the sanitized except blocks below.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prepagent")
from graph import meal_prep_graph
from db import (
    init_db,
    save_plan,
    get_plan,
    update_plan,
    create_conversation,
    touch_conversation,
    list_conversations,
    add_message,
    get_messages,
    get_usage_count,
    increment_usage,
    add_progress_entry,
    get_progress_entries,
    add_daily_meal,
    get_daily_meals,
    remove_daily_meal,
)
from conversation import build_contextual_goal
from scan import scan_food_photo
from menu import decode_menu_photo
from agents.mealplan import swap_meal
from agents.grocery import grocery_agent
from state import MealPrepState

init_db()

app = FastAPI()

# Deployment-specific frontend origins go in ALLOWED_ORIGINS (comma-separated)
# so a real domain can be added via config, not a code change — defaults to
# local dev only, never "*", since this API sits behind no auth of its own.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Applies to every request, not just uploads — a JSON body has no built-in
# size limit either, so an oversized `goal` string is just as much a memory-
# exhaustion vector as an oversized photo. Checked against Content-Length
# before the body is read; scan.py/menu.py also re-check actual bytes read,
# since Content-Length can be absent or wrong on some client requests.
MAX_REQUEST_BYTES = 10 * 1024 * 1024


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body too large."})
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Last-resort catch-all: every route below already handles its own
    # expected failure modes with a sanitized message, so reaching this means
    # something truly unexpected happened. Log the real exception server-side
    # only — the client never sees a stack trace, file path, or exception text.
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# No paid APIs are in play anymore (Groq's free tier + TheMealDB's free,
# keyless endpoints), but both still have rate limits of their own, and this
# cap keeps normal traffic well under them. It's a soft limit, not
# abuse-proof (an attacker behind a proxy or VPN can rotate IPs) — it only
# exists to stop *accidental* runaway usage, not to be a security boundary.
DAILY_REQUEST_LIMIT = int(os.environ.get("DAILY_REQUEST_LIMIT", "5"))


def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    today = date.today().isoformat()
    if get_usage_count(client_ip, today) >= DAILY_REQUEST_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily free limit of {DAILY_REQUEST_LIMIT} generations reached. Please try again tomorrow.",
        )
    increment_usage(client_ip, today)


@app.get("/")
def read_root():
    return {"message": "Prep-Agent backend is alive"}


class PlanRequest(BaseModel):
    goal: str = Field(max_length=2000)
    visitor_id: Optional[str] = Field(default=None, max_length=200)
    conversation_id: Optional[str] = Field(default=None, max_length=200)


def stream_plan_events(contextual_goal: str, display_goal: str, conversation_id: str, visitor_id: str):
    accumulated = {"goal": display_goal}
    try:
        for chunk in meal_prep_graph.stream({"goal": contextual_goal}):
            step_name = next(iter(chunk))
            step_data = chunk[step_name]
            accumulated.update(step_data)
            yield f"data: {json.dumps({'step': step_name, 'data': step_data})}\n\n"

        plan_id = uuid.uuid4().hex[:10]
        save_plan(plan_id, accumulated, visitor_id)

        # The assistant's side of this turn, for the chat-history transcript:
        # a direct answer for general questions, or the wrap-up advice when a
        # plan was built. Only meal-plan turns link a plan_id — a plain Q&A
        # turn has nothing to reopen.
        assistant_text = accumulated.get("direct_answer") or accumulated.get("final_summary") or ""
        linked_plan_id = plan_id if accumulated.get("meal_plan") is not None else None
        add_message(conversation_id, "assistant", assistant_text, plan_id=linked_plan_id)
        touch_conversation(conversation_id)

        yield f"data: {json.dumps({'step': 'done', 'plan_id': plan_id, 'conversation_id': conversation_id})}\n\n"
    except (requests.exceptions.HTTPError, RuntimeError) as e:
        # The real exception (e.g. an HTTP status/reason from TheMealDB) is
        # logged server-side only — the client gets a message that says what
        # kind of thing failed without echoing internal exception text.
        logger.warning("External service failure in stream_plan_events: %s", e)
        message = "A required external service failed. Please try again in a moment."
        yield f"data: {json.dumps({'step': 'error', 'message': message})}\n\n"
    except GroqRateLimitError:
        # Every LLM call already retries through this automatically (see
        # llm_utils.retry_on_groq_error) — reaching here means Groq's
        # free-tier per-minute token limit stayed exhausted through all of
        # them, which a longer plan (more days, more unique recipes) makes
        # more likely to hit.
        rate_limit_message = (
            "Groq's free-tier rate limit is temporarily exhausted — this happens "
            "more on longer plans. Wait a minute and try again, or try fewer days."
        )
        yield f"data: {json.dumps({'step': 'error', 'message': rate_limit_message})}\n\n"
    except Exception:
        logger.exception("Unexpected failure in stream_plan_events")
        yield f"data: {json.dumps({'step': 'error', 'message': 'Something went wrong. Please try again.'})}\n\n"


@app.post("/api/plan")
def run_plan(request: PlanRequest, _: None = Depends(enforce_rate_limit)):
    visitor_id = request.visitor_id or ""
    conversation_id = request.conversation_id

    if conversation_id is None:
        conversation_id = uuid.uuid4().hex[:12]
        create_conversation(conversation_id, visitor_id, request.goal)
    else:
        touch_conversation(conversation_id)

    # History is fetched before the new user message is recorded, so it's
    # exactly "everything before this turn" — what build_contextual_goal
    # needs to make this message follow-up-aware.
    history = get_messages(conversation_id)
    add_message(conversation_id, "user", request.goal)

    contextual_goal = build_contextual_goal(history, request.goal)

    return StreamingResponse(
        stream_plan_events(contextual_goal, request.goal, conversation_id, visitor_id),
        media_type="text/event-stream",
    )


@app.get("/api/plan/{plan_id}")
def get_saved_plan(plan_id: str):
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


class SwapMealRequest(BaseModel):
    day: str = Field(max_length=20)
    meal_index: int


@app.post("/api/plan/{plan_id}/swap")
def swap_plan_meal(plan_id: str, request: SwapMealRequest, _: None = Depends(enforce_rate_limit)):
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    try:
        updated_day = swap_meal(plan, request.day, request.meal_index)
        plan["meal_plan"][request.day] = updated_day
    except ValueError as e:
        # ValueError here is always one of swap_meal's own deliberate,
        # user-facing messages (bad day/index) — safe to pass through as-is.
        raise HTTPException(status_code=400, detail=str(e))
    except (requests.exceptions.HTTPError, RuntimeError) as e:
        logger.warning("External service failure in swap_plan_meal: %s", e)
        raise HTTPException(status_code=502, detail="A required external service failed. Please try again.")
    except GroqRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Groq's free-tier rate limit is temporarily exhausted. Wait a minute and try again.",
        )

    # The grocery list is derived from every meal's ingredients, so a swapped
    # meal needs it recomputed too, or the shopping list would silently drift
    # from what's actually in the plan.
    regrouped = grocery_agent(MealPrepState(goal=plan.get("goal", ""), meal_plan=plan["meal_plan"]))
    plan["grocery_list"] = regrouped["grocery_list"]
    plan["grocery_categories"] = regrouped["grocery_categories"]
    update_plan(plan_id, plan)

    return {
        "day": request.day,
        "meal_plan_day": updated_day,
        "grocery_list": plan["grocery_list"],
        "grocery_categories": plan["grocery_categories"],
    }


@app.get("/api/conversations")
def get_conversations(visitor_id: str):
    return list_conversations(visitor_id)


@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str):
    return get_messages(conversation_id)


@app.post("/api/scan")
async def scan_photo(file: UploadFile = File(...), _: None = Depends(enforce_rate_limit)):
    try:
        return await scan_food_photo(file)
    except ValueError as e:
        # ValueError here is always scan_food_photo's own deliberate,
        # user-facing message (e.g. "photo too large") — safe to pass through.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Photo scan failed")
        raise HTTPException(status_code=500, detail="Failed to analyze that photo. Please try again.")


@app.post("/api/menu")
async def decode_menu(
    file: UploadFile = File(...),
    goal: str = Form(..., max_length=2000),
    _: None = Depends(enforce_rate_limit),
):
    try:
        return await decode_menu_photo(file, goal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Menu decode failed")
        raise HTTPException(status_code=500, detail="Failed to analyze that menu. Please try again.")


class ProgressEntryRequest(BaseModel):
    visitor_id: str = Field(max_length=200)
    entry_date: str = Field(max_length=20)
    weight: float
    note: Optional[str] = Field(default=None, max_length=500)


# No rate limit here — logging progress is pure local storage, no paid API call.
@app.post("/api/progress")
def log_progress(request: ProgressEntryRequest):
    add_progress_entry(request.visitor_id, request.entry_date, request.weight, request.note)
    return {"status": "ok"}


@app.get("/api/progress/{visitor_id}")
def get_progress(visitor_id: str):
    return get_progress_entries(visitor_id)


class DailyMealRequest(BaseModel):
    visitor_id: str = Field(max_length=200)
    entry_date: str = Field(max_length=20)
    meal_name: str = Field(max_length=200)
    calories: float
    protein: float


# No rate limit here either — logging a meal name/macros is pure local
# storage, no paid API call (unlike /api/scan, which reads the values from
# a photo via Claude vision).
@app.post("/api/progress/meals")
def log_daily_meal(request: DailyMealRequest):
    meal_id = add_daily_meal(request.visitor_id, request.entry_date, request.meal_name, request.calories, request.protein)
    return {"id": meal_id}


@app.get("/api/progress/meals/{visitor_id}")
def get_daily_meal_log(visitor_id: str, entry_date: str):
    return get_daily_meals(visitor_id, entry_date)


@app.delete("/api/progress/meals/{meal_id}")
def delete_daily_meal(meal_id: int, visitor_id: str):
    remove_daily_meal(meal_id, visitor_id)
    return {"status": "ok"}
