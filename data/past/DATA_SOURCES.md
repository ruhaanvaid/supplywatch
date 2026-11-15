# Past data: REAL, for the "Past years" section

| File | Real? | Details |
|---|---|---|
| `prices.csv` | **REAL** | Monthly U.S. city-average prices from the U.S. Bureau of Labor Statistics, 2016 to now, for the 30 foods with a `bls_series` in `data/items.json`. Downloaded by `backend/fetch_past_prices.py` on 2026-11-14. Months BLS left blank are skipped, so some foods have gaps (e.g. lettuce). |
| `shortages.json` | **REAL events, paraphrased** | 16 major US food shortages and price spikes, 2018–2026, researched on 2026-11-14. Every event has at least one source link that was checked and loads (two links that blocked checking were removed). Summaries are in our own words. Where BLS prices exist, the research's numbers matched them (e.g. eggs $6.23 in March 2025, coffee $9.14 in September 2025). |

Not "every" shortage ever: these are the major ones with national US news coverage that could be sourced. Events in foods we don't price (infant formula, cream cheese, olive oil, cocoa, Sriracha) are listed without a chart.
