"""Fetch REAL current data and save it to data/live/, in the same file formats
the app already reads (prices.csv, headlines.csv, weather.csv).

Run it (needs internet):   cd backend && .venv/bin/python refresh_live.py
Four free public sources:
  - U.S. Bureau of Labor Statistics (BLS): monthly average prices
  - U.S. Drought Monitor: weekly % of an area in each drought class
  - GDELT: a free search over worldwide news from the last 30 days
  - New York Fed: monthly Global Supply Chain Pressure Index (shipping)
Then the AI rates each new headline and writes the 8 explanations (needs
OPENROUTER_API_KEY), so the website itself never has to call the AI.

Why save a snapshot instead of fetching on every page view? BLS allows 25
requests a day without a key, GDELT one request every 5 seconds, and the AI
costs money. A dated snapshot keeps the site fast and free, and the page
shows exactly how fresh it is.
"""
import csv
import json
import os
import re
import time
from datetime import date, timedelta

import httpx

os.environ.setdefault("SUPPLYWATCH_MODE", "live")   # score the data we just saved
from connectors.common import DATA_DIR, LIVE_DIR, load_items  # noqa: E402  (must come after the line above)
from fetch_supply_pressure import fetch_supply_pressure  # noqa: E402


# Which drought areas and news searches to use live in a settings file, so this
# file is only about HOW to fetch. See data/live_sources.json.
SOURCES = json.loads((DATA_DIR / "live_sources.json").read_text())


def write_csv(name, header, rows):
    with open(LIVE_DIR / name, "w", newline="") as f:   # csv module quotes commas safely
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    print(f"  saved {len(rows)} rows to data/live/{name}")


def fetch_prices(today):
    # Every food in items.json that has a BLS price series. Foods without one
    # (cooking oil, canned tomatoes, peanut butter) honestly get no live price.
    item_for = {food["bls_series"]: key for key, food in load_items().items() if "bls_series" in food}
    series_ids, rows = list(item_for), []
    for start in range(0, len(series_ids), 25):   # the free BLS API takes 25 series per request
        body = {"seriesid": series_ids[start:start + 25],
                "startyear": str(today.year - 1), "endyear": str(today.year)}
        reply = httpx.post("https://api.bls.gov/publicAPI/v1/timeseries/data/", json=body, timeout=60).json()
        rows += price_rows(reply, item_for)
    write_csv("prices.csv", ["month", "item", "price_usd"], sorted(rows, key=lambda r: (r[1], r[0])))


def price_rows(reply, item_for):
    rows = []
    for series in reply["Results"]["series"]:
        for point in series["data"]:   # period "M10" means October
            if point["value"] == "-":   # BLS publishes "-" for a month with no data: skip it
                continue
            rows.append((f"{point['year']}-{point['period'][1:]}", item_for[series["seriesID"]], point["value"]))
    return rows


def drought_class(week):
    """Worst drought level covering at least HALF of the area, else "none".
    The Drought Monitor's numbers are cumulative: d1 = % of area at D1 or worse."""
    for level in ["d4", "d3", "d2", "d1", "d0"]:
        if week[level] >= 50:
            return level.upper()
    return "none"


def fetch_drought(today):
    rows = []
    for region, (level, area) in SOURCES["drought_areas"].items():
        url = f"https://usdmdataservices.unl.edu/api/{level}Statistics/GetDroughtSeverityStatisticsByAreaPercent"
        params = {"aoi": area, "startdate": f"{today - timedelta(days=21):%m/%d/%Y}",
                  "enddate": f"{today:%m/%d/%Y}", "statisticsType": 1}
        weeks = httpx.get(url, params=params, headers={"Accept": "application/json"}, timeout=60).json()
        latest = max(weeks, key=lambda w: w["mapDate"])   # the most recent weekly map
        rows.append((latest["mapDate"][:7], region, drought_class(latest)))
    write_csv("weather.csv", ["month", "region", "drought_class"], rows)


def search_news(query, wait=10):
    """GDELT allows one request every 5 seconds, so wait and retry if blocked.
    Returns a list of articles, or None if every try was blocked (= unknown, not "no news")."""
    params = {"query": f"{query} sourcecountry:US sourcelang:english", "mode": "artlist",
              "format": "json", "timespan": "30d", "maxrecords": 10}
    for _ in range(4):
        time.sleep(wait)
        reply = httpx.get("https://api.gdeltproject.org/api/v2/doc/doc", params=params, timeout=60)
        if reply.status_code == 200:
            try:
                return reply.json().get("articles", [])
            except ValueError:   # GDELT answers plain text for bad searches or no results
                print(f"  GDELT said: {reply.text.strip()[:120] or '(no results)'}")
                return []
    return None


def clean_title(title):
    """GDELT puts spaces before punctuation ("47 , 000"); remove them."""
    return re.sub(r"\s+([,.:;!?%])", r"\1", " ".join(title.split())).replace(" ' s ", "'s ")


def fetch_news():
    rows, seen, failed = [], set(), []
    for search in SOURCES["news_searches"]:
        query, foods = search["query"], search["foods"]
        articles = search_news(query)
        if articles is None:   # blocked every time: try once more, waiting longer
            articles = search_news(query, wait=30)
        if articles is None:
            failed += foods
            print(f"  FAILED: {query[:50]}... (news for {len(foods)} foods will show as unavailable)")
            continue
        for article in articles:
            title = clean_title(article["title"])
            if title not in seen:
                seen.add(title)
                day = article["seendate"][:8]   # "20261107T..." -> 2026-11-07
                rows.append((f"{day[:4]}-{day[4:6]}-{day[6:]}", title, article["url"]))
        print(f"  {len(articles):>2} articles: {query[:60]}")
    write_csv("headlines.csv", ["date", "headline", "source_url"], sorted(rows))
    return [title for _, title, _ in rows], failed


def main():
    today = date.today()
    LIVE_DIR.mkdir(exist_ok=True)
    print("Prices (BLS)..."); fetch_prices(today)
    print("Drought (U.S. Drought Monitor)..."); fetch_drought(today)
    print("Supply-chain pressure (NY Fed)..."); fetch_supply_pressure()
    print("News (GDELT, slow on purpose)..."); titles, failed = fetch_news()
    # Remember which news searches failed, so those items show "unavailable", not "no news".
    info = {"as_of": today.isoformat(), "news_search_failed": failed}
    (LIVE_DIR / "refreshed.json").write_text(json.dumps(info, indent=2))

    from llm_extract import extract_event   # imported late: only needed for this step
    rated = sum(extract_event(title) is not None for title in titles)
    print(f"AI rated {rated} of {len(titles)} headlines (the rest are left out, not guessed)")

    import main as app   # writes the 8 explanations into the AI cache
    for key in load_items():
        item = app.item_detail(key)
        print(f"  {item['name']:<16} {item['score']!s:>4} {item['band']}")


if __name__ == "__main__":
    main()
