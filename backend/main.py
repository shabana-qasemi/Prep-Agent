from dotenv import load_dotenv

load_dotenv()

import json
import uuid
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from graph import meal_prep_graph
from db import init_db, save_plan, get_plan
from scan import scan_food_photo

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ExecAgent Studio backend is alive"}


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
def run_plan(request: PlanRequest):
    return StreamingResponse(stream_plan_events(request.goal), media_type="text/event-stream")


@app.get("/api/plan/{plan_id}")
def get_saved_plan(plan_id: str):
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@app.post("/api/scan")
async def scan_photo(file: UploadFile = File(...)):
    try:
        return await scan_food_photo(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze photo: {e}")
