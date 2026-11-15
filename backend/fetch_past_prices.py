"""Download 10+ years of REAL monthly prices (2016 to now) for every food that
has a BLS price series, and save them to data/past/prices.csv.

Used by the "Past years" section to chart what prices really did during
past shortages. Run once (needs internet):  .venv/bin/python fetch_past_prices.py

The free BLS API allows 25 series and 10 years per request, so we ask in chunks.
"""
import csv
from datetime import date

import httpx

from connectors.common import DATA_DIR, load_items

PAST_DIR = DATA_DIR / "past"
FIRST_YEAR = 2016


def year_ranges(first, last, size=10):
    """2016-2026 -> [(2016, 2025), (2026, 2026)]: no request spans more than 10 years."""
    return [(start, min(start + size - 1, last)) for start in range(first, last + 1, size)]


def main():
    item_for = {food["bls_series"]: key for key, food in load_items().items() if "bls_series" in food}
    series_ids, rows = list(item_for), []
    for start in range(0, len(series_ids), 25):
        for first, last in year_ranges(FIRST_YEAR, date.today().year):
            body = {"seriesid": series_ids[start:start + 25], "startyear": str(first), "endyear": str(last)}
            reply = httpx.post("https://api.bls.gov/publicAPI/v1/timeseries/data/", json=body, timeout=60).json()
            for series in reply["Results"]["series"]:
                for point in series["data"]:
                    if point["value"] != "-" and point["period"] != "M13":   # skip gaps and yearly averages
                        rows.append((f"{point['year']}-{point['period'][1:]}",
                                     item_for[series["seriesID"]], point["value"]))
    PAST_DIR.mkdir(exist_ok=True)
    with open(PAST_DIR / "prices.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["month", "item", "price_usd"])
        writer.writerows(sorted(rows, key=lambda r: (r[1], r[0])))
    print(f"saved {len(rows)} monthly prices for {len(item_for)} foods, {FIRST_YEAR} to now")


if __name__ == "__main__":
    main()
