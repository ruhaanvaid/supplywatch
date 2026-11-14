# Sample data: what is real and what is not

Everything in `data/sample/` is **SYNTHETIC demo data**, written by hand to look
plausible and to give the demo a mix of calm and stressed items. It is **not**
real market data and must never be presented as real. The demo pretends
"today" is 2026-10-31.

| File | Real or synthetic | What it contains |
|---|---|---|
| `prices.csv` | SYNTHETIC | Monthly price (USD) per item, Nov 2025 – Oct 2026. Units are in `data/items.json`. |
| `headlines.csv` | SYNTHETIC | 14 invented headlines, Sep – Oct 2026. |
| `port_congestion.csv` | SYNTHETIC | Ships waiting at LA/Long Beach per month. |
| `weather.csv` | SYNTHETIC | US Drought Monitor-style class per growing region, Sep – Oct 2026. |
| `llm_cache_events.json` | AI OUTPUT | Event extractions for every bundled headline (sample AND historical), made by `deepseek/deepseek-v4.1-flash` via OpenRouter on 2026-11-14 (one clean run). Each entry says so in `produced_by`. |
| `llm_cache_events_HANDLABELED.json` | HAND-LABELED | Our own labels with the same rubric, made before we had an API key. Kept only to compare with the AI (18/19 same item, 15/19 same severity). The app does not read this file. |
| `llm_cache_explanations.json` | AI OUTPUT | The 8 score explanations, made by the same DeepSeek model. Each entry records its model. |

Demo storyline built into the synthetic data:
- eggs: price jump and bird-flu headlines, so the score is red
- rice, canned tomatoes: moderate pressure, so the score is yellow
- cooking oil and pasta: some pressure but just under yellow (31 each, green). With our hand labels, oil was 36 (yellow). DeepSeek rated its news one level lower.
- flour, peanut butter, dried beans: calm, so the score is green
