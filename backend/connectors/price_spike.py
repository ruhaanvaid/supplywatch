"""Signal 1 of 4: price_spike.

Question it answers: "Is this item's price jumping above its normal level?"
Method: compare the latest monthly price to the average of the 6 months
before it. 0% above (or below) average -> 0.0; 30% or more above -> 1.0.

Rising prices are often the first measurable sign that supply is tightening,
which is why this signal gets the biggest weight in risk.py.
"""
import csv

from connectors.common import SAMPLE_DIR, get_mode, make_result, scale_to_unit

TRAILING_MONTHS = 6   # how many past months make up "normal"
FULL_SPIKE = 0.30     # a 30% jump counts as the maximum signal (1.0)


def load_price_history(item, data_dir=SAMPLE_DIR):
    """Return [(month, price), ...] for one item, oldest first.

    Months are strings like "2026-10", which sort correctly as text.
    """
    with open(data_dir / "prices.csv") as f:
        rows = [row for row in csv.DictReader(f) if row["item"] == item]
    return sorted((row["month"], float(row["price_usd"])) for row in rows)


def compute_spike(history, as_of_month):
    """Turn a price history into the 0-1 signal, using only data up to as_of_month.

    Ignoring later months matters for the backtest: we must not "peek"
    at the future when replaying the past.
    """
    known = [(month, price) for month, price in history if month <= as_of_month]
    if not known:
        return make_result(None, None, "No price data for this item in this dataset.")
    if len(known) < TRAILING_MONTHS + 1:
        return make_result(None, None, f"Not enough price history (need {TRAILING_MONTHS + 1} months).")

    latest_month, latest_price = known[-1]
    trailing_prices = [price for _, price in known[-(TRAILING_MONTHS + 1):-1]]
    average = sum(trailing_prices) / len(trailing_prices)
    pct_above = latest_price / average - 1

    value = scale_to_unit(pct_above, 0, FULL_SPIKE)
    note = (f"{latest_month} price ${latest_price:.2f} is {pct_above:+.1%} vs the "
            f"6-month average ${average:.2f}. 0% or less = 0, +30% or more = 1.")
    return make_result(value, latest_price, note)


def get_signal(item, as_of_date, data_dir=SAMPLE_DIR):
    """The standard connector function. Returns {value, raw, note}."""
    if get_mode() == "live":
        # Live price feed is not built yet (optional per scope). Say so honestly
        # instead of falling back to sample data and pretending it is live.
        return make_result(None, None, "Live price source not connected.")
    try:
        history = load_price_history(item, data_dir)
    except OSError:
        return make_result(None, None, "Price file missing, so this signal is excluded.")
    return compute_spike(history, as_of_date.strftime("%Y-%m"))
