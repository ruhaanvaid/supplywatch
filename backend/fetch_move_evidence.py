"""Fetch PAST evidence for the major price moves on real data.

The live refresh only keeps the last 30 days of news and the latest drought map,
which is right for the risk score (it's about today). But a price move from, say,
May 2025 needs evidence from May 2025. This script saves that history in two
separate files that ONLY the price-move explanations read (the score never does):

  data/live/drought_history.csv    month, region, drought_class  (U.S. Drought Monitor, monthly)
  data/live/headlines_history.csv  date, headline, source_url    (GDELT, around each move)

Run from the backend folder (no key needed; it's slow on purpose, GDELT allows
one request every 5 seconds):   .venv/bin/python fetch_move_evidence.py
"""
import csv
import json
from datetime import date, timedelta

import httpx

from connectors.common import DATA_DIR, LIVE_DIR, MODE_OVERRIDE, load_items
from connectors.price_spike import load_price_history
from price_moves import find_major_moves, previous_month
from refresh_live import clean_title, drought_class

SOURCES = json.loads((DATA_DIR / "live_sources.json").read_text())
HISTORY_START = date(2024, 12, 1)   # a month before our first BLS price (Jan 2025)


def write_csv(name, header, rows):
    with open(LIVE_DIR / name, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    print(f"  wrote {name}: {len(rows)} rows")


def fetch_drought_history(today):
    """The last weekly Drought Monitor map of every month, for each growing area."""
    rows = []
    for region, (level, area) in SOURCES["drought_areas"].items():
        url = f"https://usdmdataservices.unl.edu/api/{level}Statistics/GetDroughtSeverityStatisticsByAreaPercent"
        params = {"aoi": area, "startdate": f"{HISTORY_START:%m/%d/%Y}", "enddate": f"{today:%m/%d/%Y}", "statisticsType": 1}
        weeks = httpx.get(url, params=params, headers={"Accept": "application/json"}, timeout=120).json()
        last_map_of_month = {}
        for week in sorted(weeks, key=lambda w: w["mapDate"]):
            last_map_of_month[week["mapDate"][:7]] = week          # later weeks overwrite earlier ones
        rows += [(month, region, drought_class(week)) for month, week in sorted(last_map_of_month.items())]
        print(f"  drought: {region} ({len(last_map_of_month)} months)")
    write_csv("drought_history.csv", ["month", "region", "drought_class"], rows)


def month_window(month):
    """'2025-05' -> GDELT start/end times covering April 1 to May 31, 2025."""
    start = previous_month(month) + "-01"
    year, mon = int(month[:4]), int(month[5:7])
    end = date(year + (mon == 12), mon % 12 + 1, 1) - timedelta(days=1)
    return start.replace("-", "") + "000000", f"{end:%Y%m%d}235959"


def fetch_news_history():
    """For each real-data major move, search that food's news query in the move month and the month before."""
    import time
    query_for = {food: s["query"] for s in SOURCES["news_searches"] for food in s["foods"]}
    MODE_OVERRIDE.set("live")
    searches = sorted({(query_for[food], move["month"]) for food in load_items() if food in query_for
                       for move in find_major_moves(load_price_history(food))["moves"]})
    # Keep headlines saved by earlier runs, so a blocked search never wipes good data.
    try:
        with open(LIVE_DIR / "headlines_history.csv") as f:
            rows = [(r["date"], r["headline"], r["source_url"]) for r in csv.DictReader(f)]
    except OSError:
        rows = []
    seen, failed = {title for _, title, _ in rows}, []
    for query, month in searches:
        start, end = month_window(month)
        params = {"query": f"{query} sourcecountry:US sourcelang:english", "mode": "artlist", "format": "json",
                  "startdatetime": start, "enddatetime": end, "maxrecords": 10}
        for wait in (10, 30, 60, 120):   # GDELT: one request every 5 seconds; back off when blocked (429)
            time.sleep(wait)
            reply = httpx.get("https://api.gdeltproject.org/api/v2/doc/doc", params=params, timeout=60)
            if reply.status_code == 200:
                break
        if reply.status_code != 200:   # still blocked: say so, never pretend there was no news
            failed.append(f"{month} {query[:40]}")
            print(f"  news: {month} FAILED (GDELT said {reply.status_code})  {query[:50]}")
            continue
        try:
            articles = reply.json().get("articles", [])
        except ValueError:   # GDELT answers plain text when there are no results
            articles = []
        for article in articles:
            title = clean_title(article["title"])
            if title not in seen:
                seen.add(title)
                day = article["seendate"][:8]
                rows.append((f"{day[:4]}-{day[4:6]}-{day[6:]}", title, article["url"]))
        print(f"  news: {month} {len(articles):>2} articles  {query[:50]}")
    write_csv("headlines_history.csv", ["date", "headline", "source_url"], sorted(rows))
    if failed:
        print(f"  {len(failed)} searches were blocked; run this script again later to fill them in.")


if __name__ == "__main__":
    print("Drought history (U.S. Drought Monitor)...")
    fetch_drought_history(date.today())
    print("News around each major price move (GDELT, slow on purpose)...")
    fetch_news_history()
