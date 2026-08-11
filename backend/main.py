from dotenv import load_dotenv

load_dotenv()

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from graph import meal_prep_graph

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


@app.post("/api/plan")
def run_plan(request: PlanRequest):
    try:
        result = meal_prep_graph.invoke({"goal": request.goal})
        return result
    except (requests.exceptions.HTTPError, RuntimeError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"A required external service failed while building your plan: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Something went wrong while building your plan: {e}",
        )
