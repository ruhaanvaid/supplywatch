"""Signal 2 of 4: news_severity.

Question it answers: "How bad is recent news about this item's supply?"
Method: take headlines from the last 30 days, let the LLM tag each one with
an item and a severity 1-5 (see llm_extract.py), keep the ones about this
item, and average their severity. Severity 1 -> 0.0, severity 5 -> 1.0.
"""
import csv
from datetime import date, timedelta

from connectors.common import SAMPLE_DIR, get_mode, make_result, scale_to_unit
from llm_extract import extract_event

WINDOW_DAYS = 30       # only recent news counts
MIN_CONFIDENCE = 0.5   # ignore headlines the LLM wasn't sure were about this item


def recent_events(item, as_of_date, data_dir=SAMPLE_DIR):
    """Return (events about this item, number of headlines we couldn't analyse)."""
    with open(data_dir / "headlines.csv") as f:
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
            events.append({**event, "date": row["date"], "headline": row["headline"]})
    return events, not_analysed


def get_signal(item, as_of_date, data_dir=SAMPLE_DIR):
    """The standard connector function. Returns {value, raw, note}."""
    if get_mode() == "live":
        return make_result(None, None, "Live news source not connected.")
    try:
        events, not_analysed = recent_events(item, as_of_date, data_dir)
    except OSError:
        return make_result(None, None, "Headline file missing, so this signal is excluded.")

    if not events:
        if not_analysed:
            # Some headlines might have been about this item, and we can't tell. Don't guess.
            return make_result(None, None, f"{not_analysed} headline(s) could not be analysed.")
        # Quiet news is real information: we looked, and nothing relevant happened.
        return make_result(0.0, 0, f"No relevant headlines in the last {WINDOW_DAYS} days.")

    average = sum(e["severity"] for e in events) / len(events)
    note = (f"{len(events)} headline(s) in the last {WINDOW_DAYS} days, average severity "
            f"{average:.1f}/5 (1 = 0, 5 = 1).")
    if not_analysed:
        note += f" {not_analysed} other headline(s) could not be analysed."
    return make_result(scale_to_unit(average, 1, 5), round(average, 2), note)
