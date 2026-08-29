import httpx
from unittest.mock import patch, MagicMock
from groq import BadRequestError, RateLimitError
from llm_utils import retry_on_groq_error


def _fake_response(status_code):
    request = httpx.Request("POST", "https://api.groq.com/fake")
    return httpx.Response(status_code=status_code, request=request)


def test_retries_bad_request_error_and_eventually_succeeds():
    calls = {"count": 0}

    @retry_on_groq_error
    def flaky():
        calls["count"] += 1
        if calls["count"] < 2:
            raise BadRequestError("tool call refused", response=_fake_response(400), body=None)
        return "ok"

    with patch("time.sleep"):
        result = flaky()

    assert result == "ok"
    assert calls["count"] == 2


def test_retries_rate_limit_error_with_a_real_wait_then_succeeds():
    calls = {"count": 0}

    @retry_on_groq_error
    def flaky():
        calls["count"] += 1
        if calls["count"] < 2:
            raise RateLimitError("tokens per minute exceeded", response=_fake_response(429), body=None)
        return "ok"

    with patch("time.sleep") as mock_sleep:
        result = flaky()

    assert result == "ok"
    # Rate limit retries wait longer than bad-request retries (20s vs 1s) —
    # this is the actual behavior that matters, not just "it retried".
    mock_sleep.assert_called_once()
    assert mock_sleep.call_args.args[0] == 20


def test_gives_up_after_repeated_failures_and_reraises():
    @retry_on_groq_error
    def always_fails():
        raise RateLimitError("still exceeded", response=_fake_response(429), body=None)

    with patch("time.sleep"):
        try:
            always_fails()
            assert False, "expected RateLimitError to be reraised"
        except RateLimitError:
            pass


def test_does_not_retry_unrelated_exceptions():
    call_count = {"n": 0}

    @retry_on_groq_error
    def raises_value_error():
        call_count["n"] += 1
        raise ValueError("not a groq error")

    try:
        raises_value_error()
        assert False, "expected ValueError to propagate"
    except ValueError:
        pass

    assert call_count["n"] == 1
