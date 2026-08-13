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

# Every /api/plan and /api/scan call spends real Anthropic + Spoonacular
# credits, so if this ever goes live we cap each IP to a small number of
# generations per day. This is a soft limit, not abuse-proof (an attacker
# behind a proxy or VPN can rotate IPs) — it only exists to stop *accidental*
# runaway cost from normal traffic, not to be a security boundary.
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
