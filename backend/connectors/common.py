"""Shared helpers for all four signal connectors.

Every connector needs the same few things, so they live here once
instead of being copied four times:
  1. Where the data files are.
  2. Which mode we are in: SAMPLE (bundled files) or LIVE (internet APIs).
  3. A way to squash any raw number into the 0-1 range.
  4. One standard shape for a connector's answer.
"""
import json
import os
from datetime import date
from pathlib import Path

# Find the data folder relative to THIS file, so the app works
# no matter which folder you start it from.
# common.py -> connectors/ -> backend/ -> project root
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SAMPLE_DIR = DATA_DIR / "sample"

# In demo mode, "today" is the last day covered by the sample data.
# A fixed date means the demo shows the same scores every time you run it.
DEMO_AS_OF = date(2026, 10, 31)


def get_mode():
    """Return 'live' only if explicitly asked for; otherwise 'sample'.

    Defaulting to sample is the safe choice: the demo never needs
    the internet or an API key.
    """
    mode = os.environ.get("SUPPLYWATCH_MODE", "sample").lower()
    return "live" if mode == "live" else "sample"


def load_items():
    """Read the 8-item master list from data/items.json."""
    with open(DATA_DIR / "items.json") as f:
        return json.load(f)["items"]


def scale_to_unit(value, low, high):
    """Map a raw number onto 0-1 with a straight line.

    At or below `low` -> 0.0, at or above `high` -> 1.0, in between -> a fraction.
    Clamping (cutting off at 0 and 1) stops one extreme value from
    pushing a signal past its maximum share of the risk score.
    """
    if high <= low:
        raise ValueError("high must be greater than low")
    fraction = (value - low) / (high - low)
    return max(0.0, min(1.0, fraction))


def make_result(value, raw, note):
    """The one answer shape every connector returns.

    value: 0-1 signal, or None if the source is missing/down (never a guess)
    raw:   the original number, so people can check our work
    note:  one plain-English sentence on how the value was computed
    """
    if value is not None:
        value = round(value, 3)
    return {"value": value, "raw": raw, "note": note}
