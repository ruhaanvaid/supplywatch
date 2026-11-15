# Live data: REAL, saved by `backend/refresh_live.py`

Everything in this folder is **real data** fetched from free public sources.
`refreshed.json` records the date it was fetched (`as_of`). The app scores
"as of" that date and shows it on screen. Re-run the script to update it.

| File | Source | Details |
|---|---|---|
| `prices.csv` | U.S. Bureau of Labor Statistics (BLS), Average Price Data, U.S. city average, monthly | 31 foods. Each food's series ID is its `bls_series` in `data/items.json`. 30 are average prices in dollars; **cooking oil** uses the BLS Consumer Price Index for "other fats and oils including peanut butter" (`CUUR0000SEFS03`, an index, 1982–84 = 100). BLS has **no** series for canned tomatoes or peanut butter alone, so those have **no** live price signal (left out, not guessed). Months BLS published as "-" (no data) are skipped. National averages, not Southern California. |
| `weather.csv` | U.S. Drought Monitor (usdmdataservices.unl.edu), latest weekly map | Each growing region is represented by one area: Sacramento Valley → Colusa County, Central Valley → Fresno County, Riverside County, and the states of Kansas, Iowa, Georgia, North Dakota. The class saved is the worst drought level covering at least half the area. |
| `headlines.csv` | GDELT news search (api.gdeltproject.org), last 30 days, US English sources | 8 broad searches listed in `data/live_sources.json`, up to 10 articles each, with `source_url` links. The AI decides which item each headline is about and how severe it is. Off-topic headlines get low confidence and are ignored. |
| `supply_pressure.csv` | Federal Reserve Bank of New York, Global Supply Chain Pressure Index (GSCPI), monthly, saved by `backend/fetch_supply_pressure.py` | Built from shipping costs and supplier delivery times. 0 = the long-run average, +1 = one standard deviation above it. There's no free live count of ships waiting at ports, so this is the live "shipping & port delays" signal. It is global, about a month behind, and not food-specific. It only affects foods marked `import_exposed`. |

`news_search_failed` in `refreshed.json` lists foods whose news search was
blocked by GDELT's rate limit. Their news signal shows as unavailable
instead of pretending there was no news.

## Which foods count as mostly imported (`import_exposed` in `data/items.json`)

Rule: `true` when roughly a quarter or more of U.S. supply is imported. This is a
yes/no judgment for each food, not a measured percentage.

| Food | Imported? | Basis |
|---|---|---|
| Bananas, coffee | yes | The U.S. grows almost none; USDA ERS names both as foods imports dominate. |
| Fresh tomatoes | yes | USDA ERS: tomatoes are "predominantly supplied by imports" (mostly Mexico). |
| Sugar | yes | U.S. production was about 9.4 million short tons in 2024/25 against use of roughly 12.5 million, so about a quarter is imported. |
| Lemons | yes | Approximate: imports (Mexico, Chile, Argentina) supply about half of fresh lemons. Not checked against a specific USDA table. |
| Rice, pasta, cooking oil | yes | Set with the original 8 staples (imported jasmine/basmati rice, Canadian durum wheat, imported vegetable and olive oils). |
| Beef cuts | no | About 17% of U.S. beef is imported (USDA-FAS, 2025), below the cutoff, though rising. |
| Pork, chicken, eggs, milk, butter, cheese, bread, flour, potatoes, lettuce, canned corn, dried beans, peanut butter | no | Mostly produced in the U.S. |
| Oranges, strawberries | no | Approximate: mostly U.S.-grown (Florida/California oranges, California strawberries), with Mexico supplying a minority. Not checked against a specific USDA table. |

Sources: USDA ERS, [imports' share of fresh fruit and vegetable supply](https://www.freshplaza.com/north-america/article/9695893/u-s-fresh-produce-imports-supply-59-of-fruit-and-35-of-vegetable-availability/) and [Charts of Note](https://ers.usda.gov/data-products/charts-of-note/77582); beef import share from [an agricultural economics paper citing USDA-FAS 2025](https://ageconsearch.umn.edu/record/371493/files/cmsarticle_1032.pdf); sugar production from [RFD-TV citing USDA](https://www.rfdtv.com/usda-lowers-sugar-output-as-imports-shift?p=95).
