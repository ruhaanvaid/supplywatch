# Live data: REAL, saved by `backend/refresh_live.py`

Everything in this folder is **real data** fetched from free public sources.
`refreshed.json` records the date it was fetched (`as_of`). The app scores
"as of" that date and shows it on screen. Re-run the script to update it.

| File | Source | Details |
|---|---|---|
| `prices.csv` | U.S. Bureau of Labor Statistics (BLS), Average Price Data, U.S. city average, monthly | 30 foods. Each food's series ID is its `bls_series` in `data/items.json`. BLS has **no** series for cooking oil, canned tomatoes or peanut butter, so those have **no** live price signal (left out, not guessed). Months BLS published as "-" (no data) are skipped. National averages, not Southern California. |
| `weather.csv` | U.S. Drought Monitor (usdmdataservices.unl.edu), latest weekly map | Each growing region is represented by one area: Sacramento Valley → Colusa County, Central Valley → Fresno County, Riverside County, and the states of Kansas, Iowa, Georgia, North Dakota. The class saved is the worst drought level covering at least half the area. |
| `headlines.csv` | GDELT news search (api.gdeltproject.org), last 30 days, US English sources | 8 broad searches listed in `data/live_sources.json`, up to 10 articles each, with `source_url` links. The AI decides which item each headline is about and how severe it is. Off-topic headlines get low confidence and are ignored. |
| (no port file) | – | We found no free, reliable live source for port congestion, so the port signal is left out in live mode. |

`news_search_failed` in `refreshed.json` lists foods whose news search was
blocked by GDELT's rate limit. Their news signal shows as unavailable
instead of pretending there was no news.
