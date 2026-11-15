"""Signal 3 of 4: port_delay.

Question it answers: "Are imports of this item stuck at the port?"
Method: count of container ships waiting at anchor at the Ports of
Los Angeles/Long Beach. 2 ships waiting (normal) -> 0.0; 20 or more -> 1.0.
Only items marked import_exposed in items.json are affected. For domestic
items the answer is 0.0 ("we know exposure is low"), not None ("unknown").

Live mode: there's no free live count of ships waiting, so we use the New York
Fed's Global Supply Chain Pressure Index (GSCPI) instead: real, monthly, built
from shipping costs and delivery times. 0 = normal; +3 or more = 1.0. (It hit
+4.4 in Dec 2021, the worst port backlog in decades.) See fetch_supply_pressure.py.
"""
import csv

from connectors.common import get_mode, load_items, make_result, mode_data_dir, month_name, scale_to_unit

NORMAL_SHIPS = 2    # a typical, uncongested month
SEVERE_SHIPS = 20   # a serious backlog counts as the maximum signal
SEVERE_GSCPI = 3.0  # live: 3 standard deviations above normal = maximum signal


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}."""
    exposed = load_items()[item].get("import_exposed")
    if exposed is None:   # no import fact on file for this food
        return make_result(None, None, "We don't know how much of this food is imported, so shipping is left out.")
    if not exposed:
        return make_result(0.0, None, "Mostly produced in the U.S., so shipping and port delays barely affect it.")
    if data_dir is None and get_mode() == "live":
        return supply_pressure_signal(as_of_date)
    try:
        with open((data_dir or mode_data_dir()) / "port_congestion.csv") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return make_result(None, None, "Port data file missing, so shipping is left out.")

    as_of_month = as_of_date.strftime("%Y-%m")
    known = [row for row in rows if row["month"] <= as_of_month]   # no peeking at the future
    if not known:
        return make_result(None, None, "No port data for this period, so shipping is left out.")
    latest = known[-1]
    ships = int(latest["ships_waiting"])
    note = (f"{month_name(latest['month'])}: {ships} container ships waiting outside Los Angeles/Long Beach "
            f"({NORMAL_SHIPS} is normal, {SEVERE_SHIPS} is a severe backlog). This food is mostly imported.")
    return make_result(scale_to_unit(ships, NORMAL_SHIPS, SEVERE_SHIPS), ships, note)


def scale_pressure(gscpi):
    """GSCPI -> 0-1. At or below normal (0) = 0; +3 standard deviations or more = 1."""
    return scale_to_unit(gscpi, 0, SEVERE_GSCPI)


def supply_pressure_signal(as_of_date):
    """Live mode: the latest NY Fed GSCPI month, up to as_of_date."""
    try:
        with open(mode_data_dir() / "supply_pressure.csv") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return make_result(None, None, "Shipping data file missing, so shipping is left out.")
    known = [row for row in rows if row["month"] <= as_of_date.strftime("%Y-%m")]
    if not known:
        return make_result(None, None, "No shipping data for this period, so shipping is left out.")
    latest = known[-1]
    gscpi = float(latest["gscpi"])
    level = "more" if gscpi > 0 else "less"
    note = (f"This food is mostly imported. Global shipping is under {level} strain than normal: the New York Fed's "
            f"supply chain pressure index was {gscpi:+.2f} in {month_name(latest['month'])} "
            f"(0 = normal; the 2021 port crisis peaked at +4.4).")
    return make_result(scale_pressure(gscpi), gscpi, note)
