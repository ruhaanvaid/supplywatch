# SupplyWatch: how it works, file by file

SupplyWatch gives a Southern California food bank a 0–100 shortage-risk score
for 8 staple items, built from four public signals (price, news, ports,
weather). It explains each score in plain English, suggests alternate
suppliers and substitutes, and replays a real past shortage to test itself.

**Live site:** https://supplywatch-ys1u.onrender.com (free Render plan: the first
visit after ~15 idle minutes takes 30–60 s to wake up, so open it a few minutes early).
**Code:** https://github.com/ruhaanvaid/supplywatch

## How to run it (demo mode: no internet, no API key)

One command, from the project folder (installs everything on first run):
```bash
./start.sh
```
Then open http://localhost:5173. Press Ctrl+C to stop.

Or start the two parts by hand. Terminal 1, the backend:
```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000
```
Terminal 2, the frontend:
```bash
cd frontend && npm install && npm run dev
```
Open http://localhost:5173. Run the tests with `cd backend && .venv/bin/pytest`.

No key is needed for the demo: the AI outputs are already saved. Optional: set
`OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`) to analyse new headlines live, or
`SUPPLYWATCH_MODE=live` to switch off sample data.

## The big picture (say this first to judges)

```
data files ──> 4 connectors ──> risk.py ──> main.py (API) ──> React page
 (CSV/JSON)    each returns      weighted    4 endpoints      grid + detail
               0–1 + note        average                      + replay chart
                    ▲
          llm_extract.py (headline → severity)   llm_explain.py (score → sentences)
```
- **The AI only does language work**: reading headlines and writing explanations.
  **The score is plain arithmetic** anyone can check by hand.
- **Missing data is never invented.** A source that's down returns `None`, it is
  left out, and the other weights are rescaled. If less than half the weight
  is available, there is no score at all (grey tile).

---

## data/items.json: the item master list

**Purpose:** one place that describes the 8 items. Every other file looks items up here.

**Key decisions**
- **Keys like `canned_tomatoes`** are used in code and URLs. `name` is the screen label.
- **`growing_region`**: one main US source region per item, used by the weather signal. This is a simplification.
- **`import_exposed`**: true for rice, cooking oil and pasta, which partly arrive by sea through LA/Long Beach.
- **`category`**: links items to suppliers (a "grains" supplier helps with rice, flour, pasta).
- **`substitutes`**: what to hand out instead if the item runs short.

**Judge questions**
- *Why only one growing region?* It keeps the weather signal explainable. Real supply is spread out, and this is listed as a limitation.
- *Why is eggs `import_exposed: false`?* US eggs are produced domestically, so the port signal reports "low exposure" (0), not "unknown".

## data/sample/ and data/historical/: the data

**Purpose:** everything the app reads. Each folder has a `DATA_SOURCES.md` saying exactly what is real and what is not.
- `sample/`: **all synthetic**, built to tell a demo story. It is labeled on screen ("Using SAMPLE data").
- `historical/`: **real BLS prices** and **real events (paraphrased, with links)**. Port and drought values are **illustrative**.
- "Long" CSV format (`month,item,price_usd`): filtering one item is one condition, and adding items adds rows, not columns.

**Judge question:** *Are these real prices?* The demo prices are synthetic, and `DATA_SOURCES.md` says so. The backtest prices are real BLS data, with the series IDs listed.

## data/suppliers.json + backend/suppliers.py: alternates

**Purpose:** 20 **fictional** SoCal suppliers (clearly labeled) tagged by category and county. `alternates_for()` keeps suppliers that sell the item's category, sorted by fastest delivery, top 4. `substitutes_for()` reads `items.json`.

**Judge question:** *Is this smart matching?* No, deliberately. It's a filter a food bank can verify at a glance. A real deployment would load the food bank's own vendor list.

## backend/connectors/common.py: shared helpers

**Purpose:** written once, used by all four connectors: data folder location, the sample/live switch, `scale_to_unit()`, and the `{value, raw, note}` answer shape.

**Key decisions**
- **Default mode is SAMPLE.** The demo can't break because of Wi-Fi or a missing key.
- **`DEMO_AS_OF` is fixed (2026-10-31)**, so demo scores are identical every run.
- **`scale_to_unit` clamps to 0–1.** A straight line from "normal" to "maximum". Anything beyond is capped, so one extreme value can't exceed its share of the score.
- **`make_result`**: `value` may be `None` ("we don't know"). `raw` and `note` let anyone check our work.

## The four connectors (same pattern in each file)

Each has `get_signal(item, as_of_date, data_dir)` returning `{value, raw, note}`.
`data_dir` lets the backtest point the same code at historical data. In live
mode, a source we haven't connected returns `None` and says so. It never
quietly falls back to sample data.

| File | Raw input | 0 means | 1 means |
|---|---|---|---|
| `price_spike.py` | latest month vs. average of previous 6 months | at or below average | 30%+ above average |
| `news_severity.py` | average LLM severity of last-30-day headlines about the item (confidence ≥ 0.5) | severity 1 / no news | severity 5 |
| `port_delay.py` | ships waiting at LA/Long Beach | ≤ 2 ships (normal) | ≥ 20 ships |
| `weather_stress.py` | drought class in the growing region | none | D4 (exceptional) |

**Key decisions**
- **No peeking at the future:** every connector only uses rows dated up to `as_of`. This is essential for an honest backtest, and there's a test for it.
- **0 vs None:** "no news in 30 days" is 0 (we looked; it's calm). "Couldn't analyse the headlines" is None (unknown). Domestic items get port = 0 (known low exposure).
- **The 30% / 20 ships / D4 maxima** are judgment calls, chosen so ordinary months sit near 0 and serious disruptions reach 1.

**Judge questions**
- *Why compare to a 6-month average?* It's long enough to smooth out normal wobbles and short enough to reflect the current "normal".
- *Why does the drought table go up in even steps of 0.2?* It's the simplest defensible choice. We have no data to justify anything fancier.

## backend/signals.py

**Purpose:** lists the four connectors and offers `get_all_signals()`, which runs all four for one item. Used by both `main.py` and `backtest.py`, so the live app and the replay score items in exactly the same way.

**Why it's its own file:** it used to live in `connectors/__init__.py`, which caused a circular import. `news_severity` needs `llm_extract`, which needs `connectors.common`, which loaded all of `connectors/` again. Moving it out fixed that, so `connectors/__init__.py` is now empty on purpose.

## backend/risk.py: the score

**Purpose:** `compute_risk()` = 100 × Σ(weight × signal) ÷ Σ(weights of available signals). `risk_band()` maps it to green (0–33), yellow (34–66), red (67–100), or grey (no score).

**Key decisions**
- **Weights 0.35 / 0.30 / 0.20 / 0.15 are reasoned starting values, NOT fitted.** Price is the most direct evidence. News comes early but is noisy. Ports and weather are slower, indirect causes.
- **Renormalizing:** if news is missing, price counts 0.35 / 0.70 = half the score.
- **Minimum coverage 0.5:** we found in testing that live mode with only the port signal (weight 0.20) produced a confident-looking "0, green". Now anything under half the total weight returns no score.

**Judge questions**
- *Why not machine learning?* There are too few past shortages to train on honestly, and a weighted average can be checked by hand.
- *Worked example (eggs, demo):* 0.35×1.00 + 0.30×0.875 + 0.20×0 + 0.15×0.4 = 0.6725, which rounds to **67, red**.

## backend/llm_client.py: the only file that talks to the AI

**Purpose:** `ask_llm(system, user, json_schema)` sends one request to an AI model. Both LLM files use it, so all internet AI calls go through one place.
- With `OPENROUTER_API_KEY` (what we use): **DeepSeek V4.1 Flash** (`deepseek/deepseek-v4.1-flash`) through **OpenRouter**, a service that gives one key access to many AI models.
- With `ANTHROPIC_API_KEY` instead: Claude (`claude-opus-5-5`) directly, through Anthropic's official library. This is kept as a backup option.

**Key decisions**
- **Why DeepSeek?** It's very cheap (about $0.05 per million input tokens). Rating all 19 headlines and writing 8 explanations cost about **one cent**. It supports enforced JSON output and `temperature`.
- **Key from the environment**, never written in any file.
- **`temperature: 0`**: the model always picks its most likely answer.
- **`response_format` with `strict: true`**: OpenRouter enforces our JSON schema.
- **`max_tokens: 4000` + `reasoning: {effort: "low"}`**: DeepSeek "thinks" before answering, and thinking uses tokens. With 1,000 it ran out mid-thought on two wheat headlines and gave no answer. We found that bug by testing.
- **`finish_reason != "stop"` gives None**: a cut-off reply is never used.
- Errors (bad key, no credit, no internet) become exceptions that the callers catch and skip. Both key types were tested with fake keys: clean 401s, no crash.

**Judge question:** *What happens if the API is down during the demo?* Nothing visible. The demo reads saved outputs from disk and only calls the API for headlines it has never seen.

## backend/llm_extract.py: headline → event (LLM task 1)

**Purpose:** turns a headline into `{item, event_type, severity 1–5, confidence}`.

**How repeatability is achieved (5 layers):**
1. A fixed **rubric** that defines every severity level, plus "if torn, pick the lower one".
2. **`temperature: 0`**.
3. **Structured outputs**: the API forces the reply to match our JSON schema.
4. Our own **`validate()`** checks types and ranges anyway, because we never trust blindly.
5. A **disk cache keyed by headline**: each headline is analysed once and reused forever. **This is the real guarantee**, because we saw temperature 0 alone is NOT enough (next point).

**What we observed (good evidence for judges):**
- In a first run, DeepSeek rated "Grocers in Los Angeles begin limiting egg purchases" as severity **1**. Two minutes earlier, the same headline got **5**. Hosted models aren't perfectly repeatable even at temperature 0, which is exactly why the cache exists. (That first run also had the token-limit bug, so we fixed it and did one clean run of all 19, which is what's saved.)
- **Clean run vs. the original hand labels** (made by us with the same rubric): same item on **18/19**, same severity on **15/19**, and every disagreement is off by just one level. The one item difference: it read "Kansas wheat planting *on schedule*" as not about supply ("none"), which is defensible.
- The hand labels are kept in `data/sample/llm_cache_events_HANDLABELED.json` for comparison.

**Other decisions:** any failure means skip the headline, never crash, never guess. Without a key, only cached results are used. Run `python llm_extract.py` to analyse every bundled headline.

**Judge question:** *Isn't severity subjective?* Yes. Our own labels and the model disagreed on 4 of 19 by one level. That's why the rubric is fixed and written down, and why news is only 30% of the score.

## backend/llm_explain.py: score → 2–3 sentences (LLM task 2)

**Purpose:** sends the exact facts (score, the four values with notes, up to 3 headlines) and asks for a short explanation.

**Key decisions**
- The prompt **forbids any fact not in the input**. The input is plain text, so a judge can read exactly what the model saw.
- **Each signal's points are included** ("adds 11 points"). Without them, the model called rice's port delay the "strongest signal" because it had the highest 0–1 value, but news actually added more points once weights are applied. Giving it the points fixed that, and now the points in each explanation add up to the score.
- Cached by a fingerprint (SHA-256) of the facts, together with the model that wrote it: same facts, same text, and the page shows which model wrote it.
- **No key and no cache:** a fill-in-the-blanks summary of the two biggest contributors, labeled "automatic summary (no AI used)" on screen.

## backend/backtest.py: the replay

**Purpose:** scores all 8 items at each month-end from Jan 2022 to Mar 2023 using `data/historical/`, then compares eggs' first yellow and red months with the date the shortage was reported (2023-01-11, cited).

**Result (be upfront about this):**
- Eggs first turned **yellow in Mar 2022, 10 months before** the report. Bird flu hit an Iowa flock of 5.3 million laying hens that month, and prices were rising.
- Eggs only turned **red in Jan 2023, the same month** as the report, so the red **lead time is 0**. The red push came largely from the shortage headline itself.
- Eggs **dropped back to green in Sep–Nov 2022**, so the warning wasn't continuous.
- **No false alarms:** no other item turned red. Cooking oil peaked at 65 in Apr 2022, just under red, when Indonesia banned palm oil exports.

**Key decisions:** no weights were tuned on this event (or any event), so no held-out event was needed. Missing BLS series (oil, canned tomatoes, peanut butter) are left out, not filled in.

**Judge questions**
- *So does it work?* Partly. It gave an early yellow warning, but red came too late to help, and it's one event. It shows the method, not proof.
- *Isn't price circular?* Partly. Rising price is both a signal and part of what a shortage is, so price-driven lead time overstates the tool.

## backend/main.py: the API

| Endpoint | Returns |
|---|---|
| `GET /api/status` | sample/live label, as-of date, whether the AI is live or cached |
| `GET /api/items` | 8 items with score and band |
| `GET /api/items/{key}` | signals, weights, headlines, explanation, price history, suppliers, substitutes (404 if unknown) |
| `GET /api/backtest` | the replay |

Sample-only extras (price history, headlines) are hidden in live mode so sample data is never shown as live. Visit `/docs` for FastAPI's built-in test page.

## frontend/: one React page

- `vite.config.js`: forwards `/api` to port 8000, so no CORS code is needed.
- `App.jsx`: loads status and scores, opens the riskiest item, and holds which item is selected.
- `RiskGrid.jsx`: 8 tiles showing color **and** the band in words (works for people who can't tell colors apart).
- `DetailPanel.jsx`: explanation (with its source), price chart, the four signals with weight, value and how each was computed, headlines, suppliers, substitutes.
- `PriceChart.jsx` / `ReplayPanel.jsx`: Recharts line charts. The replay chart marks the yellow and red lines, the report date, and the highest other item (the false-alarm check).
- `App.css`: band colors defined once. The SAMPLE/LIVE banner is styled to be impossible to miss.

**Judge question:** *Why Recharts instead of drawing charts yourself?* It saves ~60 lines of coordinate math. Our code just says which field goes on which axis.

## backend/tests/: pytest (risk + normalization only)

25 tests:
- **test_risk.py**: weights sum to 1, hand-calculated example (47), renormalizing (50), 0 ≠ missing, no coverage gives None, band edges (33/34, 66/67).
- **test_normalization.py**: clamping, the 15% jump gives 0.5 price case, ignoring future months, too little history gives None.
- **test_news_signal.py**: average severity 4.5 gives 0.875, no relevant news gives 0 (not None), an unreadable headline gives None, old and future headlines are ignored, low-confidence headlines are ignored. These tests replace the AI with a fixed lookup table, so they never call the API.

## start.sh: one-command launch

Installs packages on the first run, starts the backend in the background and the frontend in front. Ctrl+C stops both. This means no juggling two terminals on demo day.

## render.yaml: how the live site is deployed

**Purpose:** tells Render how to build and run the app on its free plan. Render reads it from GitHub and redeploys on every push to `main`.
- **Build:** install the Python packages, then build the React page into `frontend/dist`.
- **Start:** run `uvicorn` on the port Render gives us (`$PORT`).
- **One service:** the last lines of `main.py` make FastAPI also serve the built page, so the API and the page share one address and no CORS setup is needed.
- **Health check:** Render opens `/api/status` to confirm the app started.
- **No API key on the server:** it runs in sample mode on the saved AI outputs.

**Judge question:** *Why Render and not Vercel?* Render runs our Python server exactly as it runs on a laptop, with zero code changes. Vercel would mean rewriting the backend as serverless functions. The trade-off is the free plan's slow wake-up after being idle.

## Live mode: deliberately not built

Live data was "optional and secondary" in the brief, and the code is already at the top of the ~1,100-line budget. Instead of half-building it, every live source honestly says "not connected". With less than half the score's weight available, every tile is grey and the banner says live sources aren't connected. Connecting one would mean writing its live branch inside the existing `get_signal()`, with the same `{value, raw, note}` output.

---

## Limitations and honest caveats

- **Weights are not fitted.** They are reasoned starting values. With more past events we could test alternatives on one event and check them on another.
- **LLM severity is a judgment call**, even with a fixed rubric. DeepSeek and our own hand labels disagreed on 4 of 19 headlines (each by one level), and the same headline once got 5 and once got 1. The saved cache makes the demo stable, but a different run could give slightly different scores. We used a cheap model (DeepSeek V4.1 Flash) to keep costs near zero. A stronger model might judge more consistently.
- **The Claude path (`ANTHROPIC_API_KEY`) is untested with a real key**. Only the DeepSeek/OpenRouter path has run for real.
- **The backtest is one event.** Red came the same month as the report (0 lead time). Port and drought history are illustrative, not measured. Prices are national averages, not Southern California.
- **Sample vs live:** the whole demo runs on synthetic sample data (labeled on screen). Live data sources are not connected (a deliberate scope cut), so live mode shows grey "not enough data" tiles and says so in the banner.
- **Simplifications:** one growing region per item; weather covers drought only (no floods or heat waves); suppliers are fictional; the port signal only covers LA/Long Beach.
