"""Signal 2 of 4: news_severity.

Question it answers: "How bad is recent news about this item's supply?"
Method: take headlines from the last 30 days, let the LLM tag each one with
an item and a severity 1-5 (see llm_extract.py), keep the ones about this
item, and average their severity. Severity 1 -> 0.0, severity 5 -> 1.0.
"""
import csv
import json
from datetime import date, timedelta

from connectors.common import make_result, mode_data_dir, scale_to_unit
from llm_extract import extract_event

WINDOW_DAYS = 30       # only recent news counts
MIN_CONFIDENCE = 0.5   # ignore headlines the LLM wasn't sure were about this item


def recent_events(item, as_of_date, data_dir=None):
    """Return (events about this item, number of headlines we couldn't analyse)."""
    with open((data_dir or mode_data_dir()) / "headlines.csv") as f:
        rows = list(csv.DictReader(f))
    window_start = as_of_date - timedelta(days=WINDOW_DAYS)
    events, not_analysed = [], 0
    for row in rows:
        day = date.fromisoformat(row["date"])
        if not window_start < day <= as_of_date:   # outside the window (or in the future)
            continue
        event = extract_event(row["headline"])
        if event is None:
            not_analysed += 1
        elif event["item"] == item and event["confidence"] >= MIN_CONFIDENCE:
            events.append({**event, "date": row["date"], "headline": row["headline"],
                           "source_url": row.get("source_url")})   # real headlines have links
    return events, not_analysed


def search_failed(item, data_dir):
    """True if the last live refresh could not search the news for this item."""
    try:
        info = json.loads(((data_dir or mode_data_dir()) / "refreshed.json").read_text())
    except OSError:
        return False   # sample and replay folders have no refresh file
    return item in info.get("news_search_failed", [])


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}."""
    if search_failed(item, data_dir):
        return make_result(None, None, "The news search failed at the last refresh, so news is left out.")
    try:
        events, not_analysed = recent_events(item, as_of_date, data_dir)
    except OSError:
        return make_result(None, None, "Headline file missing, so news is left out.")

    if not events:
        if not_analysed:
            # Some headlines might have been about this item, and we can't tell. Don't guess.
            return make_result(None, None, f"Some headlines ({not_analysed}) could not be rated by the AI, so news is left out.")
        # Quiet news is real information: we looked, and nothing relevant happened.
        return make_result(0.0, 0, f"No news about supply problems for this food in the last {WINDOW_DAYS} days.")

    average = sum(e["severity"] for e in events) / len(events)
    stories = "1 news story" if len(events) == 1 else f"{len(events)} news stories"
    note = (f"{stories} about this food in the last {WINDOW_DAYS} days. The AI rated "
            f"how serious they are: {average:.1f} out of 5 on average (1 = minor, 5 = severe shortage).")
    if not_analysed:
        note += f" Some other headlines ({not_analysed}) could not be rated."
    return make_result(scale_to_unit(average, 1, 5), round(average, 2), note)
