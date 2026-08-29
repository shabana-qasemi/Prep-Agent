import os
import pytest
import db

# Every agent constructs a ChatGroq client at import time. Unlike the old
# anthropic.Anthropic() client (which only validated its key on first real
# call), LangChain's ChatGroq validates eagerly at construction — so even
# fully-mocked tests need *a* key present, just never a real one, since the
# actual .invoke()/.with_structured_output() calls are always mocked.
os.environ.setdefault("GROQ_API_KEY", "test-key-for-pytest")


@pytest.fixture(autouse=True)
def use_temp_database(tmp_path, monkeypatch):
    """Every test gets its own throwaway database file, so tests never
    touch — or leave leftover data in — the real prepagent.db."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
