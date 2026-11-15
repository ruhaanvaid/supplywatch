"""Download the New York Fed's Global Supply Chain Pressure Index (GSCPI) and save
it as data/live/supply_pressure.csv (month, gscpi). Called by refresh_live.py.

What GSCPI is: one monthly number built by the Federal Reserve Bank of New York
from shipping costs (container and bulk freight rates, air freight) and supplier
delivery times. 0 = the long-run average; +1 = one standard deviation above it.
It peaked at about +4.3 in December 2021, when ships queued outside U.S. ports.
The NY Fed publishes it as an old-style Excel file (.xls), so we read it with xlrd.
"""
import csv
from datetime import datetime

import httpx
import xlrd

from connectors.common import LIVE_DIR

GSCPI_URL = ("https://www.newyorkfed.org/medialibrary/research/interactives/"
             "gscpi/downloads/gscpi_data.xlsx")


def fetch_supply_pressure():
    response = httpx.get(GSCPI_URL, timeout=60, follow_redirects=True)
    response.raise_for_status()
    sheet = xlrd.open_workbook(file_contents=response.content).sheet_by_index(0)
    rows = []
    for date_text, value in (sheet.row_values(r)[:2] for r in range(sheet.nrows)):
        try:   # data rows look like ("31-Oct-2026", 1.26); skip headers and blanks
            month = datetime.strptime(date_text, "%d-%b-%Y").strftime("%Y-%m")
            rows.append((month, round(float(value), 3)))
        except (TypeError, ValueError):
            continue
    with open(LIVE_DIR / "supply_pressure.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["month", "gscpi"])
        writer.writerows(rows)
    print(f"  saved {len(rows)} months, latest {rows[-1]}")


if __name__ == "__main__":
    fetch_supply_pressure()
