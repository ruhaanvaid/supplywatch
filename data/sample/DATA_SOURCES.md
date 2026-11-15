# Sample data: what is real and what is not

Everything in `data/sample/` is **SYNTHETIC demo data**, written by hand to look
plausible and to give the demo a mix of calm and stressed items. It is **not**
real market data and must never be presented as real. It is only used when
`SUPPLYWATCH_MODE=sample`. The default is live mode, with real data from `data/live/`.
The demo pretends "today" is 2026-10-31.

| File | Real or synthetic | What it contains |
|---|---|---|
| `prices.csv` | SYNTHETIC | Monthly price (USD) per item, Nov 2025 – Oct 2026. Units are in `data/items.json`. |
| `headlines.csv` | SYNTHETIC | 14 invented headlines, Sep – Oct 2026. |
| `port_congestion.csv` | SYNTHETIC | Ships waiting at LA/Long Beach per month. |
| `weather.csv` | SYNTHETIC | US Drought Monitor-style class per growing region, Sep – Oct 2026. |

The AI's saved outputs for all headlines (sample, live and replay) are in
`data/ai_cache/`: `events.json` and `explanations.json` were made by
`deepseek/deepseek-v4.1-flash` via OpenRouter, and every entry records which model
made it. `events_HANDLABELED.json` holds our own labels from before we had an
API key. It's kept only for comparison (the AI matched 18/19 items and 15/19
severities), and the app does not read it.

Demo storyline built into the synthetic data:
- eggs: price jump and bird-flu headlines, so the score is red
- rice, canned tomatoes: moderate pressure, so the score is yellow
- cooking oil and pasta: some pressure but just under yellow (31 each, green). With our hand labels, oil was 36 (yellow). DeepSeek rated its news one level lower.
- flour, peanut butter, dried beans: calm, so the score is green
