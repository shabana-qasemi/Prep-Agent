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
    # visitor_id was added after this table already existed in some deployed
    # databases — CREATE TABLE IF NOT EXISTS won't retrofit a column onto an
    # existing table, so add it explicitly if missing.
    existing_columns = {row["name"] for row in conn.execute("PRAGMA table_info(plans)").fetchall()}
    if "visitor_id" not in existing_columns:
        conn.execute("ALTER TABLE plans ADD COLUMN visitor_id TEXT NOT NULL DEFAULT ''")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            visitor_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            plan_id TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS api_usage (
            client_ip TEXT NOT NULL,
            usage_date TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (client_ip, usage_date)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS progress_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            entry_date TEXT NOT NULL,
            weight REAL NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            entry_date TEXT NOT NULL,
            meal_name TEXT NOT NULL,
            calories REAL NOT NULL,
            protein REAL NOT NULL,
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


def save_plan(plan_id: str, data: dict, visitor_id: str = "") -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO plans (id, data, created_at, visitor_id) VALUES (?, ?, ?, ?)",
        (plan_id, json.dumps(data), datetime.now(timezone.utc).isoformat(), visitor_id),
    )
    conn.commit()
    conn.close()


def get_plan(plan_id: str) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT data FROM plans WHERE id = ?", (plan_id,)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


def update_plan(plan_id: str, data: dict) -> None:
    conn = get_connection()
    conn.execute("UPDATE plans SET data = ? WHERE id = ?", (json.dumps(data), plan_id))
    conn.commit()
    conn.close()


def create_conversation(conversation_id: str, visitor_id: str, first_message: str) -> None:
    title = first_message[:60] + "…" if len(first_message) > 60 else first_message
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    conn.execute(
        "INSERT INTO conversations (id, visitor_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (conversation_id, visitor_id, title, now, now),
    )
    conn.commit()
    conn.close()


def touch_conversation(conversation_id: str) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), conversation_id),
    )
    conn.commit()
    conn.close()


def list_conversations(visitor_id: str, limit: int = 30) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, updated_at FROM conversations WHERE visitor_id = ? ORDER BY updated_at DESC LIMIT ?",
        (visitor_id, limit),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_message(conversation_id: str, role: str, text: str, plan_id: Optional[str] = None) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO messages (conversation_id, role, text, plan_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (conversation_id, role, text, plan_id, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def get_messages(conversation_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT role, text, plan_id, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
        (conversation_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_usage_count(client_ip: str, usage_date: str) -> int:
    conn = get_connection()
    row = conn.execute(
        "SELECT count FROM api_usage WHERE client_ip = ? AND usage_date = ?",
        (client_ip, usage_date),
    ).fetchone()
    conn.close()
    return row["count"] if row else 0


def increment_usage(client_ip: str, usage_date: str) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO api_usage (client_ip, usage_date, count) VALUES (?, ?, 1)
        ON CONFLICT (client_ip, usage_date) DO UPDATE SET count = count + 1
        """,
        (client_ip, usage_date),
    )
    conn.commit()
    conn.close()


def add_progress_entry(visitor_id: str, entry_date: str, weight: float, note: Optional[str]) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO progress_entries (visitor_id, entry_date, weight, note, created_at) VALUES (?, ?, ?, ?, ?)",
        (visitor_id, entry_date, weight, note, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def get_progress_entries(visitor_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT entry_date, weight, note FROM progress_entries WHERE visitor_id = ? ORDER BY entry_date ASC",
        (visitor_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_daily_meal(visitor_id: str, entry_date: str, meal_name: str, calories: float, protein: float) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO daily_meals (visitor_id, entry_date, meal_name, calories, protein, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (visitor_id, entry_date, meal_name, calories, protein, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()
    return cursor.lastrowid


def get_daily_meals(visitor_id: str, entry_date: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, meal_name, calories, protein FROM daily_meals WHERE visitor_id = ? AND entry_date = ? ORDER BY id ASC",
        (visitor_id, entry_date),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def remove_daily_meal(meal_id: int, visitor_id: str) -> None:
    conn = get_connection()
    conn.execute("DELETE FROM daily_meals WHERE id = ? AND visitor_id = ?", (meal_id, visitor_id))
    conn.commit()
    conn.close()
