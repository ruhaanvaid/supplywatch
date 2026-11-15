"""The "Past years" section: real past US food shortages (data/past/shortages.json,
each with a source link), paired with REAL BLS prices around each one.

For every event we cut the price history from 12 months before it started to
6 months after it was reported, so the chart shows "normal -> spike -> after".
"""
import csv
import json

from connectors.common import DATA_DIR, load_items

PAST_DIR = DATA_DIR / "past"
MONTHS_BEFORE = 12
MONTHS_AFTER = 6
MIN_MONTHS = 6       # fewer points than this isn't a meaningful chart (BLS has gaps)


def shift_month(month, delta):
    """("2022-03", -12) -> "2021-03". Counting in months avoids calendar math."""
    year, mon = map(int, month.split("-"))
    total = year * 12 + (mon - 1) + delta
    return f"{total // 12}-{total % 12 + 1:02d}"


def load_past_prices():
    """{"eggs": [("2016-01", 2.47), ...], ...} from data/past/prices.csv."""
    prices = {}
    with open(PAST_DIR / "prices.csv") as f:
        for row in csv.DictReader(f):
            prices.setdefault(row["item"], []).append((row["month"], float(row["price_usd"])))
    return prices


def past_shortages():
    events = json.loads((PAST_DIR / "shortages.json").read_text())["events"]
    prices, items = load_past_prices(), load_items()
    for event in events:
        first = shift_month(event["start"], -MONTHS_BEFORE)
        last = shift_month(event["reported"][:7], MONTHS_AFTER)
        # Only foods we track AND have BLS prices for get a chart; others say so on screen.
        charts = []
        for key in event.get("tracked_foods", []):
            points = [{"month": m, "price": p} for m, p in prices.get(key, []) if first <= m <= last]
            if len(points) >= MIN_MONTHS:
                charts.append({"key": key, "name": items[key]["name"], "unit": items[key]["unit"],
                               "price_label": items[key].get("price_label"), "prices": points})
        event["price_charts"] = charts
    return events
