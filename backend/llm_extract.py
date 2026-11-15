"""LLM task 1: turn a news headline into a structured event.

  "Grocers limit egg purchases" -> {"item": "eggs", "event_type": "...",
                                    "severity": 5, "confidence": 0.9}

The LLM does LANGUAGE work only (reading the headline). The scoring math
lives in plain Python (connectors + risk.py).

Repeatability comes from five layers:
  1. a FIXED rubric that defines every severity level,
  2. temperature 0: the model always picks its most likely answer,
  3. structured outputs: the API forces the reply to match our JSON schema,
  4. our own validation below (we never trust the reply blindly),
  5. a disk cache keyed by headline, so each headline is analysed ONCE and
     the same answer is reused forever. This is the real guarantee, because
     even temperature 0 can vary slightly between runs on a hosted model.
"""
import csv
import json

from connectors.common import DATA_DIR, LIVE_DIR, SAMPLE_DIR, load_items
from llm_client import ask_llm, has_key, model_label

CACHE_FILE = DATA_DIR / "ai_cache" / "events.json"   # shared by sample, live and replay headlines
ITEM_KEYS = list(load_items()) + ["none"]
EVENT_TYPES = ["disease_outbreak", "weather", "port_or_shipping", "price_or_market",
               "policy_or_trade", "production_problem", "other"]

RUBRIC = f"""You classify food-supply news headlines for a food bank early-warning tool.
Use ONLY the headline text. Do not add outside knowledge to raise or lower severity.

item: which staple the headline is about, one of {ITEM_KEYS}. Use "none" if it is
about none of them.

severity (whole number 1-5), how much it threatens supply of that item:
1 = Routine. Normal market news, forecasts of a normal crop. No supply impact.
2 = Minor pressure. Small price moves or a local problem. Availability not at risk.
3 = Moderate. A real disruption to production, trade or shipping that could
    reduce supply within weeks.
4 = Serious. Large confirmed loss of production or of a supply route
    (major disease outbreak, export ban). Shortages are likely.
5 = Severe. Shortages or purchase limits are happening NOW.
If torn between two levels, choose the LOWER one.

confidence (0 to 1): how sure you are that the headline is really about the
supply of that item."""

SCHEMA = {
    "type": "object",
    "properties": {
        "item": {"type": "string", "enum": ITEM_KEYS},
        "event_type": {"type": "string", "enum": EVENT_TYPES},
        "severity": {"type": "integer", "enum": [1, 2, 3, 4, 5]},
        "confidence": {"type": "number"},
    },
    "required": ["item", "event_type", "severity", "confidence"],
    "additionalProperties": False,
}


def load_cache():
    if not CACHE_FILE.exists():
        return {}
    with open(CACHE_FILE) as f:
        return json.load(f)


def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2, sort_keys=True)


def validate(event):
    """Return a clean event, or None if anything is out of bounds."""
    if not isinstance(event, dict):
        return None
    if event.get("item") not in ITEM_KEYS or event.get("event_type") not in EVENT_TYPES:
        return None
    severity, confidence = event.get("severity"), event.get("confidence")
    if type(severity) is not int or not 1 <= severity <= 5:
        return None
    if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        return None
    return {key: event[key] for key in ["item", "event_type", "severity", "confidence"]}


def call_llm(headline):
    """One API call. Returns the parsed JSON dict, or None if there was no usable reply."""
    text = ask_llm(RUBRIC, f"Headline: {headline}", json_schema=SCHEMA)
    return None if text is None else json.loads(text)


def extract_event(headline):
    """Cached answer if we have one; otherwise ask the AI (only if a key is set).

    Returns None when there is no cached answer and no way to get one.
    We never guess an event.
    """
    cache = load_cache()
    if headline in cache:
        return cache[headline]
    if not has_key():
        return None
    try:
        event = validate(call_llm(headline))
    except Exception as error:  # network, API or JSON problem: skip, don't crash
        print(f"Extraction failed for {headline!r}: {error}")
        return None
    if event is not None:
        cache[headline] = {**event, "produced_by": model_label()}
        save_cache(cache)
    return cache.get(headline)


if __name__ == "__main__":
    # Run all bundled headlines through extraction (fills the cache if a key is set).
    for folder in [SAMPLE_DIR, LIVE_DIR, DATA_DIR / "historical"]:
        with open(folder / "headlines.csv") as f:
            for row in csv.DictReader(f):
                print(row["date"], extract_event(row["headline"]), "<-", row["headline"])
