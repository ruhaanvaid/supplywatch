# Historical data for the backtest (2022–23 egg shortage)

| File | Real or illustrative | Details |
|---|---|---|
| `prices.csv` | **REAL** | U.S. Bureau of Labor Statistics, Average Price Data, U.S. city average, monthly, Jun 2021 – Mar 2023. Downloaded from the BLS public API on 2026-11-14. Series: eggs `APU0000708111` (grade A large, per dozen), rice `APU0000701312` (white long grain, per lb), flour `APU0000701111` (white all-purpose, per lb), pasta `APU0000701322` (spaghetti and macaroni, per lb), dried beans `APU0000714233` (per lb). BLS had **no** matching series for cooking oil, canned tomatoes or peanut butter, so those items have **no** price signal in the replay (it is left out, not guessed). |
| `headlines.csv` | **REAL events, paraphrased** | Each row is a short paraphrase of a real, dated news event. The `source_url` column links the original report. Only 5 events, so this is a small sample. |
| `port_congestion.csv` | **ILLUSTRATIVE** | Hand-drawn to follow the widely reported 2021–22 LA/Long Beach ship backlog (very high in early 2022, cleared by late 2022). These are **not** measured values. |
| `weather.csv` | **ILLUSTRATIVE** | Hand-picked drought classes reflecting the general 2022 picture (California drought, Kansas drought later in 2022). These are **not** official US Drought Monitor readings. |

"Shortage reported" date used in `backtest.py`: **2023-01-11**. Supermarket News
reported grocers limiting egg purchases to two cartons per customer:
https://www.supermarketnews.com/fresh-food/high-demand-bird-flu-are-scrambling-egg-supply-chain
Earlier local reports may exist. This is the earliest one we verified.
