import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "prepagent.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS recipe_cache (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def get_cached_recipe(recipe_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT data FROM recipe_cache WHERE id = ?", (recipe_id,)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


def cache_recipe(recipe_id: int, data: dict) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO recipe_cache (id, data) VALUES (?, ?)",
        (recipe_id, json.dumps(data)),
    )
    conn.commit()
    conn.close()


def save_plan(plan_id: str, data: dict) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO plans (id, data, created_at) VALUES (?, ?, ?)",
        (plan_id, json.dumps(data), datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def get_plan(plan_id: str) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT data FROM plans WHERE id = ?", (plan_id,)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None
