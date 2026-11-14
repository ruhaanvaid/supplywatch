"""Signal 3 of 4: port_delay.

Question it answers: "Are imports of this item stuck at the port?"
Method: count of container ships waiting at anchor at the Ports of
Los Angeles/Long Beach. 2 ships waiting (normal) -> 0.0; 20 or more -> 1.0.
Only items marked import_exposed in items.json are affected. For domestic
items the answer is 0.0 ("we know exposure is low"), not None ("unknown").
"""
import csv

from connectors.common import SAMPLE_DIR, get_mode, load_items, make_result, scale_to_unit

NORMAL_SHIPS = 2    # a typical, uncongested month
SEVERE_SHIPS = 20   # a serious backlog counts as the maximum signal


def get_signal(item, as_of_date, data_dir=SAMPLE_DIR):
    """The standard connector function. Returns {value, raw, note}."""
    if not load_items()[item]["import_exposed"]:
        return make_result(0.0, None, "Mostly domestic supply, so port congestion has little effect.")
    if get_mode() == "live":
        return make_result(None, None, "Live port data source not connected.")
    try:
        with open(data_dir / "port_congestion.csv") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return make_result(None, None, "Port data file missing, so this signal is excluded.")

    as_of_month = as_of_date.strftime("%Y-%m")
    known = [row for row in rows if row["month"] <= as_of_month]   # no peeking at the future
    if not known:
        return make_result(None, None, "No port data for this period.")
    latest = known[-1]
    ships = int(latest["ships_waiting"])
    note = (f"{latest['month']}: {ships} ships waiting at LA/Long Beach. "
            f"{NORMAL_SHIPS} or fewer = 0, {SEVERE_SHIPS} or more = 1.")
    return make_result(scale_to_unit(ships, NORMAL_SHIPS, SEVERE_SHIPS), ships, note)
