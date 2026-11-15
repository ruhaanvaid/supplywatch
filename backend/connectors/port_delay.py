"""Signal 3 of 4: port_delay.

Question it answers: "Are imports of this item stuck at the port?"
Method: count of container ships waiting at anchor at the Ports of
Los Angeles/Long Beach. 2 ships waiting (normal) -> 0.0; 20 or more -> 1.0.
Only items marked import_exposed in items.json are affected. For domestic
items the answer is 0.0 ("we know exposure is low"), not None ("unknown").
"""
import csv

from connectors.common import get_mode, load_items, make_result, mode_data_dir, scale_to_unit

NORMAL_SHIPS = 2    # a typical, uncongested month
SEVERE_SHIPS = 20   # a serious backlog counts as the maximum signal


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}."""
    exposed = load_items()[item].get("import_exposed")
    if exposed is None:   # only the original 8 staples have import facts on file
        return make_result(None, None, "Import share not on file for this food, so ports are left out.")
    if not exposed:
        return make_result(0.0, None, "Mostly domestic supply, so port congestion has little effect.")
    if data_dir is None and get_mode() == "live":
        # We found no free, reliable live source for port congestion, so say so
        # and leave it out of the score rather than reuse old or made-up numbers.
        return make_result(None, None, "No free live port data source, so this signal is left out.")
    try:
        with open((data_dir or mode_data_dir()) / "port_congestion.csv") as f:
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
