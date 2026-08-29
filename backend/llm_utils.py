from groq import BadRequestError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed

# Groq's openai/gpt-oss-120b intermittently fails structured-output calls
# with a 400 (tool-calling refusal or JSON-schema validation failure) —
# confirmed via live testing, not hypothetical. Even at temperature=0 a retry
# with the identical prompt often succeeds, so this is the pragmatic fix
# rather than trying to prompt-engineer away a provider-side quirk.
retry_on_bad_structured_output = retry(
    retry=retry_if_exception_type(BadRequestError),
    stop=stop_after_attempt(3),
    wait=wait_fixed(1),
    reraise=True,
)
