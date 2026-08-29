MAX_HISTORY_MESSAGES = 6  # last ~3 exchanges — enough for follow-ups without letting the prompt grow unbounded


def build_contextual_goal(history: list[dict], new_message: str) -> str:
    """Wrap a new chat message with recent conversation history so follow-ups
    ("make it cheaper", "why so many calories?") don't require the user to
    repeat everything from scratch. Every agent in the graph reads
    `state.goal` for its own prompt, so folding history in here — rather than
    threading it through every agent individually — makes the whole pipeline
    follow-up-aware for free."""
    recent = [m for m in history if m.get("text")][-MAX_HISTORY_MESSAGES:]
    if not recent:
        return new_message

    lines = [f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['text']}" for m in recent]
    context = "\n".join(lines)
    return (
        "Recent conversation so far, for context:\n"
        f"{context}\n\n"
        f'User\'s new message: "{new_message}"\n\n'
        "If the new message is a follow-up referencing something above (e.g. "
        '"make it cheaper", "that meal", "the plan"), resolve it using that '
        "context. Otherwise treat it as a fresh request."
    )
