from groq import BadRequestError, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt


def _wait_for_groq_error(retry_state):
    exc = retry_state.outcome.exception()
    if isinstance(exc, RateLimitError):
        # Groq's free tier caps tokens-per-minute; the error itself reports
        # a reset in ~16s, so wait long enough for that window to clear
        # rather than immediately retrying into the same limit.
        return 20
    # BadRequestError retries are about the model producing malformed
    # output, not a quota issue — a short wait is enough (see below).
    return 1


# Two real, live-confirmed Groq failure modes on openai/gpt-oss-120b, both
# worth retrying automatically rather than surfacing to the user:
# - BadRequestError: intermittent tool-calling refusal or JSON-schema
#   validation failure. Even at temperature=0 a retry with the identical
#   prompt often succeeds.
# - RateLimitError: the free tier's tokens-per-minute cap. A short backoff
#   lets the per-minute window reset before trying again.
retry_on_groq_error = retry(
    retry=retry_if_exception_type((BadRequestError, RateLimitError)),
    stop=stop_after_attempt(3),
    wait=_wait_for_groq_error,
    reraise=True,
)
