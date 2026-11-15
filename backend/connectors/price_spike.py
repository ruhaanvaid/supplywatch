"""Signal 1 of 4: price_spike.

Question it answers: "Is this item's price jumping above its normal level?"
Method: compare the latest monthly price to the average of the 6 months
before it. 0% above (or below) average -> 0.0; 30% or more above -> 1.0.

Rising prices are often the first measurable sign that supply is tightening,
which is why this signal gets the biggest weight in risk.py.
"""
import csv

from connectors.common import load_items, make_result, mode_data_dir, scale_to_unit

TRAILING_MONTHS = 6   # how many past months make up "normal"
FULL_SPIKE = 0.30     # a 30% jump counts as the maximum signal (1.0)


def load_price_history(item, data_dir=None):
    """Return [(month, price), ...] for one item, oldest first.

    Months are strings like "2026-10", which sort correctly as text.
    """
    with open((data_dir or mode_data_dir()) / "prices.csv") as f:
        rows = [row for row in csv.DictReader(f) if row["item"] == item]
    return sorted((row["month"], float(row["price_usd"])) for row in rows)


def vs_average(history, as_of_month):
    """Latest price vs the average of the 6 months before it, using only data up
    to as_of_month (so the backtest can't "peek" at the future).
    Returns (latest_month, latest_price, average, pct_above), or None if there
    are fewer than 7 months. The score AND the card's price arrow both use this,
    so they can never disagree."""
    known = [(month, price) for month, price in history if month <= as_of_month]
    if len(known) < TRAILING_MONTHS + 1:
        return None
    latest_month, latest_price = known[-1]
    trailing_prices = [price for _, price in known[-(TRAILING_MONTHS + 1):-1]]
    average = sum(trailing_prices) / len(trailing_prices)
    return latest_month, latest_price, average, latest_price / average - 1


def compute_spike(history, as_of_month, is_index=False):
    """Turn a price history into the 0-1 signal, using only data up to as_of_month."""
    if not any(month <= as_of_month for month, _ in history):
        return make_result(None, None, "No price data for this item in this dataset.")
    compared = vs_average(history, as_of_month)
    if compared is None:
        return make_result(None, None, f"Not enough price history (need {TRAILING_MONTHS + 1} months).")
    latest_month, latest_price, average, pct_above = compared

    value = scale_to_unit(pct_above, 0, FULL_SPIKE)
    # Some foods only have a price INDEX (no dollar price). Only the % change matters,
    # so the math is identical; we just must not label an index as dollars.
    show = (lambda x: f"index {x:.1f}") if is_index else (lambda x: f"${x:.2f}")
    note = (f"{latest_month} price {show(latest_price)} is {pct_above:+.1%} vs the "
            f"6-month average {show(average)}. 0% or less = 0, +30% or more = 1.")
    return make_result(value, latest_price, note)


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}.
    data_dir=None means "the folder for the current mode" (live or sample)."""
    try:
        history = load_price_history(item, data_dir)
    except OSError:
        return make_result(None, None, "Price file missing, so this signal is excluded.")
    is_index = load_items()[item].get("price_kind") == "index"
    return compute_spike(history, as_of_date.strftime("%Y-%m"), is_index)
