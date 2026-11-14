"""One function, ask_llm(), that sends a prompt to an AI model.

It works with either kind of key (read from the environment, never from a file):
  OPENROUTER_API_KEY -> OpenRouter, using a cheap DeepSeek model (what we use)
  ANTHROPIC_API_KEY  -> Anthropic's Claude directly, using the official library
Both LLM files call ask_llm(), so this is the only file that talks to the AI.
"""
import os

# Cheapest capable option on OpenRouter that supports enforced JSON output.
# About $0.05 per million input words-pieces (tokens): this whole project costs fractions of a cent.
OPENROUTER_MODEL = "deepseek/deepseek-v4.1-flash"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
ANTHROPIC_MODEL = "claude-opus-5-5"


def model_label():
    """Which model and service we'll use, e.g. for labeling saved outputs. None if no key."""
    if os.environ.get("OPENROUTER_API_KEY"):
        return f"{OPENROUTER_MODEL} via OpenRouter"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return f"{ANTHROPIC_MODEL} via Anthropic API"
    return None


def has_key():
    return model_label() is not None


def ask_llm(system, user, json_schema=None):
    """Send one request. Returns the reply text, or None if it didn't finish normally.

    system:      the fixed instructions (rubric / rules)
    user:        the input for this call (a headline, or the facts of a score)
    json_schema: if given, the API forces the reply to match this schema
    """
    if os.environ.get("OPENROUTER_API_KEY"):
        return _ask_openrouter(system, user, json_schema)
    return _ask_anthropic(system, user, json_schema)


def _ask_openrouter(system, user, json_schema):
    import httpx

    body = {
        "model": OPENROUTER_MODEL,
        # DeepSeek "thinks" before answering, and thinking uses tokens too.
        # 1000 was too few: it ran out mid-thought on some headlines.
        "max_tokens": 4000,
        "reasoning": {"effort": "low"},   # simple task: keep the thinking short
        "temperature": 0,   # always pick the most likely answer: as repeatable as possible
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    if json_schema is not None:
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "result", "strict": True, "schema": json_schema},
        }
    headers = {"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"}
    response = httpx.post(OPENROUTER_URL, json=body, headers=headers, timeout=60)
    response.raise_for_status()   # bad key or no credit -> an error the caller catches
    choice = response.json()["choices"][0]
    if choice.get("finish_reason") != "stop":   # cut off or declined: don't use a partial answer
        return None
    return choice["message"]["content"].strip()


def _ask_anthropic(system, user, json_schema):
    import anthropic  # imported here so demo mode works even without the package

    output_config = {"effort": "low"}   # short, simple tasks: little thinking needed
    if json_schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": json_schema}
    response = anthropic.Anthropic().beta.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4000,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config=output_config,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",   # if Claude declines, the API retries on a backup model
    )
    if response.stop_reason != "end_turn":
        return None
    return next(block.text for block in response.content if block.type == "text").strip()
