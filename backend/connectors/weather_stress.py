"""Signal 4 of 4: weather_stress.

Question it answers: "Is the item's main growing region in drought?"
Method: look up the item's region in items.json, then read that region's
US Drought Monitor class (none, D0 to D4) and turn it into 0-1 with a table.
We track drought only. Floods and heat waves are not tracked yet
(listed as a limitation in EXPLAIN.md).
"""
import csv

from connectors.common import load_items, make_result, mode_data_dir

# US Drought Monitor classes, from "none" up to D4 "exceptional drought".
# Evenly spaced on purpose, which is the simplest choice we can defend.
DROUGHT_SCALE = {"none": 0.0, "D0": 0.2, "D1": 0.4, "D2": 0.6, "D3": 0.8, "D4": 1.0}


def get_signal(item, as_of_date, data_dir=None):
    """The standard connector function. Returns {value, raw, note}."""
    region = load_items()[item].get("growing_region")
    if region is None:   # only the original 8 staples have a growing region on file
        return make_result(None, None, "No main growing region on file for this food, so weather is left out.")
    try:
        with open((data_dir or mode_data_dir()) / "weather.csv") as f:
            rows = [row for row in csv.DictReader(f) if row["region"] == region]
    except OSError:
        return make_result(None, None, "Weather file missing, so this signal is excluded.")

    as_of_month = as_of_date.strftime("%Y-%m")
    known = [row for row in rows if row["month"] <= as_of_month]
    if not known or known[-1]["drought_class"] not in DROUGHT_SCALE:
        return make_result(None, None, f"No usable drought data for {region}.")
    latest = known[-1]
    drought = latest["drought_class"]
    note = f"{latest['month']}: {region} drought class {drought} (none = 0, D4 = 1)."
    return make_result(DROUGHT_SCALE[drought], drought, note)
