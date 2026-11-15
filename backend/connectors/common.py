"""Shared helpers for all four signal connectors.

Every connector needs the same few things, so they live here once
instead of being copied four times:
  1. Where the data files are.
  2. Which mode we are in: LIVE (real data) or SAMPLE (made-up demo data).
  3. A way to squash any raw number into the 0-1 range.
  4. One standard shape for a connector's answer.
"""
import json
import os
from datetime import date, datetime
from pathlib import Path

# Find the data folder relative to THIS file, so the app works
# no matter which folder you start it from.
# common.py -> connectors/ -> backend/ -> project root
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SAMPLE_DIR = DATA_DIR / "sample"   # made-up demo data with a storyline
LIVE_DIR = DATA_DIR / "live"       # real data, saved by refresh_live.py

# In sample mode, "today" is the last day covered by the sample data.
# A fixed date means the demo shows the same scores every time you run it.
DEMO_AS_OF = date(2026, 10, 31)


def get_mode():
    """Return 'live' (the default) or 'sample' (if SUPPLYWATCH_MODE=sample).

    Live mode reads the real-data snapshot in data/live/. It is saved on
    disk, so live mode also works offline; it is only as fresh as the
    last time refresh_live.py ran (shown on screen).
    """
    mode = os.environ.get("SUPPLYWATCH_MODE", "live").lower()
    return "sample" if mode == "sample" else "live"


def mode_data_dir():
    """The folder the connectors read from in the current mode."""
    return LIVE_DIR if get_mode() == "live" else SAMPLE_DIR


def current_as_of():
    """The date we score 'as of'. Sample: the fixed demo date.
    Live: the day refresh_live.py last ran, so news windows and months line up."""
    if get_mode() == "sample":
        return DEMO_AS_OF
    try:
        return date.fromisoformat(json.loads((LIVE_DIR / "refreshed.json").read_text())["as_of"])
    except (OSError, KeyError, ValueError):
        return date.today()


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


def month_name(month):
    """'2026-10' -> 'October 2026', so notes read like English."""
    return datetime.strptime(month, "%Y-%m").strftime("%B %Y")


def make_result(value, raw, note):
    """The one answer shape every connector returns.

    value: 0-1 signal, or None if the source is missing/down (never a guess)
    raw:   the original number, so people can check our work
    note:  one plain-English sentence on how the value was computed
    """
    if value is not None:
        value = round(value, 3)
    return {"value": value, "raw": raw, "note": note}
