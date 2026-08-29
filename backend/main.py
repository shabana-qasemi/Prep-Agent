from dotenv import load_dotenv

load_dotenv()

import json
import os
import uuid
from datetime import date
from typing import Optional
import requests
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from graph import meal_prep_graph
from db import (
    init_db,
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
from scan import scan_food_photo
from menu import decode_menu_photo

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    goal: str


def stream_plan_events(goal: str):
    accumulated = {"goal": goal}
    try:
        for chunk in meal_prep_graph.stream({"goal": goal}):
            step_name = next(iter(chunk))
            step_data = chunk[step_name]
            accumulated.update(step_data)
            yield f"data: {json.dumps({'step': step_name, 'data': step_data})}\n\n"

        plan_id = uuid.uuid4().hex[:10]
        save_plan(plan_id, accumulated)
        yield f"data: {json.dumps({'step': 'done', 'plan_id': plan_id})}\n\n"
    except (requests.exceptions.HTTPError, RuntimeError) as e:
        yield f"data: {json.dumps({'step': 'error', 'message': f'A required external service failed: {e}'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'step': 'error', 'message': f'Something went wrong: {e}'})}\n\n"


@app.post("/api/plan")
def run_plan(request: PlanRequest, _: None = Depends(enforce_rate_limit)):
    return StreamingResponse(stream_plan_events(request.goal), media_type="text/event-stream")


@app.get("/api/plan/{plan_id}")
def get_saved_plan(plan_id: str):
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@app.post("/api/scan")
async def scan_photo(file: UploadFile = File(...), _: None = Depends(enforce_rate_limit)):
    try:
        return await scan_food_photo(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze photo: {e}")


@app.post("/api/menu")
async def decode_menu(
    file: UploadFile = File(...),
    goal: str = Form(...),
    _: None = Depends(enforce_rate_limit),
):
    try:
        return await decode_menu_photo(file, goal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze menu: {e}")


class ProgressEntryRequest(BaseModel):
    visitor_id: str
    entry_date: str
    weight: float
    note: Optional[str] = None


# No rate limit here — logging progress is pure local storage, no paid API call.
@app.post("/api/progress")
def log_progress(request: ProgressEntryRequest):
    add_progress_entry(request.visitor_id, request.entry_date, request.weight, request.note)
    return {"status": "ok"}


@app.get("/api/progress/{visitor_id}")
def get_progress(visitor_id: str):
    return get_progress_entries(visitor_id)


class DailyMealRequest(BaseModel):
    visitor_id: str
    entry_date: str
    meal_name: str
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
