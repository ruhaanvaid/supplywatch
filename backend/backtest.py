"""Replay a past disruption: would SupplyWatch have warned us in time?

Event: the 2022-23 US egg shortage (bird flu).
We score every item at the end of each month from Jan 2022 to Mar 2023,
using ONLY the historical data folder and only data known by that month.
Then we compare the first month eggs turned red (and yellow) with the date
the shortage was reported in the news.

No weights were tuned on this event (or on any event). The weights in risk.py
are the same reasoned starting values used everywhere else.
"""
import calendar
from datetime import date

from connectors.common import DATA_DIR
from risk import compute_risk, risk_band
from signals import get_all_signals

HISTORICAL_DIR = DATA_DIR / "historical"
TARGET_ITEM = "eggs"
# The replay only has historical data for the original 8 staples, so it scores just those.
REPLAY_ITEMS = ["rice", "canned_tomatoes", "flour", "cooking_oil", "eggs", "peanut_butter", "dried_beans", "pasta"]
MONTHS = [(2022, m) for m in range(1, 13)] + [(2023, m) for m in range(1, 4)]
SHORTAGE_REPORTED = {
    "date": "2023-01-11",
    "what": "Supermarket News reports grocers limiting egg purchases to two cartons per customer.",
    "source": "https://www.supermarketnews.com/fresh-food/high-demand-bird-flu-are-scrambling-egg-supply-chain",
}


def month_end(year, month):
    """Score 'as of' the last day of each month."""
    return date(year, month, calendar.monthrange(year, month)[1])


def first_month_at(timeline, item, bands):
    """First month where the item's band is one of `bands`, or None if it never was."""
    for row in timeline:
        if row["bands"][item] in bands:
            return row["month"]
    return None


def months_between(earlier, later):
    """'2022-03', '2023-01' -> 10. None if either month is missing."""
    if earlier is None or later is None:
        return None
    (y1, m1), (y2, m2) = map(int, earlier.split("-")), map(int, later.split("-"))
    return (y2 * 12 + m2) - (y1 * 12 + m1)


def run_backtest():
    timeline = []
    for year, month in MONTHS:
        as_of = month_end(year, month)
        row = {"month": f"{year}-{month:02d}", "scores": {}, "bands": {}}
        for item in REPLAY_ITEMS:
            signals = get_all_signals(item, as_of, HISTORICAL_DIR)
            score = compute_risk({name: s["value"] for name, s in signals.items()})
            row["scores"][item], row["bands"][item] = score, risk_band(score)
        timeline.append(row)

    reported_month = SHORTAGE_REPORTED["date"][:7]
    first_red = first_month_at(timeline, TARGET_ITEM, ["red"])
    first_yellow = first_month_at(timeline, TARGET_ITEM, ["yellow", "red"])
    # A "false alarm" = any OTHER item that turned red during the replay window.
    false_alarms = [{"item": item, "first_red": first_month_at(timeline, item, ["red"])}
                    for item in REPLAY_ITEMS if item != TARGET_ITEM
                    and first_month_at(timeline, item, ["red"])]
    return {
        "event": "2022-23 US egg shortage (bird flu)",
        "target_item": TARGET_ITEM,
        "shortage_reported": SHORTAGE_REPORTED,
        "first_red": first_red,
        "first_yellow": first_yellow,
        "lead_time_months_red": months_between(first_red, reported_month),
        "lead_time_months_yellow": months_between(first_yellow, reported_month),
        "false_alarms": false_alarms,
        "timeline": timeline,
        "data_note": ("Prices: REAL US city-average prices from BLS. Headlines: real events, "
                      "paraphrased, with source links. Port and drought values: ILLUSTRATIVE, "
                      "not measured. One event only, so this is a demonstration, not proof."),
    }


if __name__ == "__main__":
    result = run_backtest()
    for row in result["timeline"]:
        print(row["month"], {item[:6]: score for item, score in row["scores"].items()})
    for key in ["first_yellow", "first_red", "lead_time_months_yellow", "lead_time_months_red", "false_alarms"]:
        print(f"{key}: {result[key]}")
