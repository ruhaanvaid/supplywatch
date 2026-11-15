"""Signal 4 of 4: weather_stress.

Question it answers: "Is the item's main growing region in drought?"
Method: look up the item's region in items.json, then read that region's
US Drought Monitor class (none, D0 to D4) and turn it into 0-1 with a table.
We track drought only. Floods and heat waves are not tracked yet
(listed as a limitation in EXPLAIN.md).
"""
import csv

from connectors.common import load_items, make_result, mode_data_dir, month_name

# US Drought Monitor classes, from "none" up to D4 "exceptional drought".
# Evenly spaced on purpose, which is the simplest choice we can defend.
DROUGHT_SCALE = {"none": 0.0, "D0": 0.2, "D1": 0.4, "D2": 0.6, "D3": 0.8, "D4": 1.0}
DROUGHT_NAMES = {"none": "no drought", "D0": "abnormally dry conditions (D0)", "D1": "moderate drought (D1)",
                 "D2": "severe drought (D2)", "D3": "extreme drought (D3)",
                 "D4": "exceptional drought (D4, the worst level)"}


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}."""
    info = load_items()[item]
    region = info.get("growing_region")
    if info.get("grown_abroad"):   # e.g. bananas, coffee
        return make_result(None, None, "Almost all of it is grown outside the U.S., and the U.S. Drought Monitor "
                                       "only covers the U.S., so drought is left out.")
    if region is None:
        return make_result(None, None, "We don't have a main producing area on file for this food, so drought is left out.")
    try:
        with open((data_dir or mode_data_dir()) / "weather.csv") as f:
            rows = [row for row in csv.DictReader(f) if row["region"] == region]
    except OSError:
        return make_result(None, None, "Drought file missing, so drought is left out.")

    as_of_month = as_of_date.strftime("%Y-%m")
    known = [row for row in rows if row["month"] <= as_of_month]
    if not known or known[-1]["drought_class"] not in DROUGHT_SCALE:
        return make_result(None, None, f"No usable drought data for {region}, so drought is left out.")
    latest = known[-1]
    drought = latest["drought_class"]
    note = (f"{month_name(latest['month'])}: the main producing area ({region}) has {DROUGHT_NAMES[drought]}, "
            f"according to the U.S. Drought Monitor.")
    return make_result(DROUGHT_SCALE[drought], drought, note)
