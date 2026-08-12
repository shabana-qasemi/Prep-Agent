import pytest
import db


@pytest.fixture(autouse=True)
def use_temp_database(tmp_path, monkeypatch):
    """Every test gets its own throwaway database file, so tests never
    touch — or leave leftover data in — the real prepagent.db."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
