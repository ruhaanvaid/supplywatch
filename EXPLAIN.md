# SupplyWatch: how it works, file by file

SupplyWatch watches **33 foods** and shows a food bank only the ones that are
**unusual right now** (medium or high shortage risk, 0–100). Any food can be
searched. Each score comes from public signals (price, news, shipping delays
and drought), is explained in plain English, and
comes with alternate suppliers and substitutes. A replay tests the tool on a
real past shortage.

**Live site:** https://supplywatch-ys1u.onrender.com (free Render plan: the first
visit after ~15 idle minutes takes 30–60 s to wake up, so open it a few minutes early).
**Code:** https://github.com/ruhaanvaid/supplywatch

## How to run it (no API key needed; works offline)

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

By default the app shows **LIVE (real) data**: the snapshot saved in `data/live/`.
It's on disk, so it works offline. To get the made-up demo storyline instead (eggs
red, and so on), start with `SUPPLYWATCH_MODE=sample`.

**Update the real data** (needs internet and `OPENROUTER_API_KEY`; takes about 5–10 minutes):
```bash
cd backend && .venv/bin/python refresh_live.py
```
Then commit and push, and the website picks it up automatically.

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

## data/items.json: the food catalog (33 foods)

**Purpose:** the list of foods SupplyWatch tracks. Every other file looks foods up here.

**Key decisions**
- **Which foods:** every food-bank-relevant food that the U.S. Bureau of Labor Statistics (BLS) publishes a monthly average price for (30 foods), plus 3 staples BLS doesn't price in dollars (canned tomatoes, cooking oil, peanut butter). **Cooking oil** uses BLS's official price **index** for "other fats and oils incl. peanut butter" instead (`price_kind: "index"`): the price signal only needs the % change, so an index works, and the page labels it as an index, never as dollars. Each BLS ID (`bls_series`) was checked against BLS's own series page, so the names are right. Beer, soda, chips, cookies, luxury steaks and duplicate listings were left out.
- **`category`** (grains, protein, dairy, produce, canned_goods, oils, pantry) links each food to suppliers.
- **`substitutes`**: what to hand out instead.
- **`import_exposed`** is on file for every food: `true` when roughly a quarter or more of U.S. supply is imported (bananas, coffee, fresh tomatoes, sugar, lemons, rice, pasta, cooking oil). The basis for each is in `data/live/DATA_SOURCES.md`.
- **`growing_region`** is the main U.S. producing area, from USDA NASS state rankings (e.g. beef → Texas, the top cattle state; pork → Iowa; chicken → Georgia; cheese → Wisconsin; potatoes → Idaho; milk and oranges → Tulare County, CA). For meat and dairy it's where the animals are raised, since drought hits their pasture and feed. Bananas and coffee are marked `grown_abroad`: the U.S. Drought Monitor doesn't cover where they grow, so drought is left out for them.

**Judge questions**
- *Why only 33 foods?* They're the ones with real, official monthly prices. Searching a food we don't track says so, instead of inventing a score.
- *Why does beef get drought points?* Texas raises the most beef cattle in the U.S., and drought there dries out pasture and raises feed costs, so ranchers sell off herds. Texas is in moderate drought right now, which adds 6 points.
- *Why do bananas have no drought signal?* They're grown in Central and South America; the U.S. Drought Monitor only covers the U.S. The weights rescale automatically.

## data/live/, data/sample/, data/historical/: the data

**Purpose:** everything the app reads. Each folder has a `DATA_SOURCES.md` saying exactly what is real and what is not.
- `live/`: **real current data** (BLS prices, U.S. Drought Monitor, GDELT news with links), saved by `refresh_live.py`. This is the default.
- `sample/`: **all synthetic**, built to tell a demo story. It's only used with `SUPPLYWATCH_MODE=sample`, and is labeled on screen ("SAMPLE DATA").
- `ai_cache/`: the AI's saved headline ratings and explanations for all three folders.
- `historical/`: **real BLS prices** and **real events (paraphrased, with links)**. Port and drought values are **illustrative**.
- "Long" CSV format (`month,item,price_usd`): filtering one item is one condition, and adding items adds rows, not columns.

**Judge question:** *Are these real prices?* Yes, in live mode (the default): real BLS prices, with the series IDs listed in `data/live/DATA_SOURCES.md`. The sample-mode prices are synthetic and labeled that way.

## data/suppliers.json + backend/suppliers.py: real places to source food

**Purpose:** 20 **real** organizations a Southern California food bank can source from: the 5 regional Feeding America food banks for our counties, California's TEFAP/USDA Foods and CalFood programs, the Farm to Family produce program, Sysco, US Foods, Restaurant Depot, Smart & Final, Costco Business Center, LA and San Diego produce wholesalers, and local dairy and egg producers. Each has an official website link, and all 20 links were checked.

**Key decisions**
- **Only verified facts:** name, type, area, what they offer, and the link. **No delivery times or prices**, because we can't know them, and making them up for real companies would be wrong. The page says SupplyWatch has no connection to them.
- `alternates_for()` keeps suppliers that carry the food's category. It sorts **local before national**, then **specialists before generalists** (eggs gets an egg distributor first), and shows the top 4.

**Judge question:** *Did these companies agree to be listed?* No. It's a list of public sources with links, like a directory, and the page tells users to contact them directly.

## backend/connectors/common.py: shared helpers

**Purpose:** written once, used by all four connectors: data folder location, the sample/live switch, `scale_to_unit()`, and the `{value, raw, note}` answer shape.

**Key decisions**
- **Default mode is LIVE**, reading the real-data snapshot in `data/live/`. It's a saved snapshot, so even live mode can't break because of Wi-Fi.
- **`mode_data_dir()`** picks the folder (live or sample). **`current_as_of()`** picks the scoring date: the snapshot's refresh date in live mode, or the fixed `DEMO_AS_OF` (2026-10-31) in sample mode.
- **`scale_to_unit` clamps to 0–1.** A straight line from "normal" to "maximum". Anything beyond is capped, so one extreme value can't exceed its share of the score.
- **`make_result`**: `value` may be `None` ("we don't know"). `raw` and `note` let anyone check our work.

## The four connectors (same pattern in each file)

Each has `get_signal(item, as_of_date, data_dir)` returning `{value, raw, note}`.
The **same code** reads live, sample or historical data. Only `data_dir` changes,
and leaving it empty means "the current mode's folder". In live mode there's no free
count of ships waiting at ports, so `port_delay` uses the NY Fed's Global Supply Chain Pressure Index instead (real, monthly).

| File | Raw input | 0 means | 1 means |
|---|---|---|---|
| `price_spike.py` | latest month vs. average of previous 6 months | at or below average | 30%+ above average |
| `news_severity.py` | average LLM severity of last-30-day headlines about the item (confidence ≥ 0.5) | severity 1 / no news | severity 5 |
| `port_delay.py` (sample/backtest) | ships waiting at LA/Long Beach | ≤ 2 ships (normal) | ≥ 20 ships |
| `port_delay.py` (live) | NY Fed Global Supply Chain Pressure Index | ≤ 0 (normal) | ≥ +3 (Dec 2021 peak was +4.4) |
| `weather_stress.py` | drought class in the main producing area | none | D4 (exceptional) |

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
- The hand labels are kept in `data/ai_cache/events_HANDLABELED.json` for comparison.

**Other decisions:** any failure means skip the headline, never crash, never guess. Without a key, only cached results are used. Run `python llm_extract.py` to analyse every bundled headline.

**Judge question:** *Isn't severity subjective?* Yes. Our own labels and the model disagreed on 4 of 19 by one level. That's why the rubric is fixed and written down, and why news is only 30% of the score.

## backend/llm_explain.py: score → 2–3 sentences (LLM task 2)

**Purpose:** sends the exact facts (score, the four values with notes, up to 3 headlines) and asks for a short explanation.

**Key decisions**
- The prompt **forbids any fact not in the input**. The input is plain text, so a judge can read exactly what the model saw.
- **Each signal's points are included** ("adds 11 points"). Without them, the model called rice's port delay the "strongest signal" because it had the highest 0–1 value, but news actually added more points once weights are applied. Giving it the points fixed that, and now the points in each explanation add up to the score. The prompt also tells it to write for food bank staff with no math background: say first whether they need to act (Low = no action, Medium = watch it, High = act now), describe causes in plain words, and never write 0–1 numbers or words like "signal" or "weight".
- Cached by a fingerprint (SHA-256) of the facts, together with the model that wrote it: same facts, same text, and the page shows which model wrote it.
- **No key and no cache:** a fill-in-the-blanks summary of the two biggest contributors, labeled "automatic summary (no AI used)" on screen.

## backend/backtest.py: the replay

**Purpose:** scores the original 8 staples (the only foods with historical data) at each month-end from Jan 2022 to Mar 2023 using `data/historical/`, then compares eggs' first yellow and red months with the date the shortage was reported (2023-01-11, cited).

**Result (be upfront about this):**
- Eggs first turned **yellow in Mar 2022, 10 months before** the report. Bird flu hit an Iowa flock of 5.3 million laying hens that month, and prices were rising.
- Eggs only turned **red in Jan 2023, the same month** as the report, so the red **lead time is 0**. The red push came largely from the shortage headline itself.
- Eggs **dropped back to green in Sep–Nov 2022**, so the warning wasn't continuous.
- **No false alarms:** no other item turned red. Cooking oil peaked at 65 in Apr 2022, just under red, when Indonesia banned palm oil exports.

**Key decisions:** no weights were tuned on this event (or any event), so no held-out event was needed. Missing BLS series (oil, canned tomatoes, peanut butter) are left out, not filled in.

**Judge questions**
- *So does it work?* Partly. It gave an early yellow warning, but red came too late to help, and it's one event. It shows the method, not proof.
- *Isn't price circular?* Partly. Rising price is both a signal and part of what a shortage is, so price-driven lead time overstates the tool.

## "Past years": backend/past.py, backend/fetch_past_prices.py, data/past/

**Purpose:** a **Past years** button opens "Food shortages since 2016": 16 real US food shortages and price spikes (2018 romaine E. coli recall, COVID meat/flour/egg shortages, 2022 infant formula, the 2022 and 2025 egg crises, record beef and coffee in 2025, the 2026 tomato surge, and more). Each shows dates, cause, a short summary, **checked source links**, and a chart of the **real BLS price** from 12 months before to 6 months after. The egg replay test lives here too.

**Key decisions**
- `fetch_past_prices.py` downloads 10+ years of real monthly prices (the BLS API allows 25 series and 10 years per request, so it asks in chunks).
- `past.py` cuts each event's chart window with month arithmetic (`shift_month`), and skips charts with fewer than 6 months of data, because BLS has gaps and a 2-point "chart" would mislead.
- Researched events were cross-checked against our own BLS data, and two source links that couldn't be verified were removed.
- **Only the 2022–23 egg event has a "would we have warned?" replay,** because a replay needs that period's news too, and the free news search only goes back about 3 months.

**Judge question:** *Is this every shortage?* No. It's the major ones with national coverage that we could source. Leaving out what we couldn't verify was deliberate.

## backend/main.py: the API

| Endpoint | Who can use it | Returns |
|---|---|---|
| `GET /api/status` | everyone | sample/live label, `demo` flag, as-of date, whether the AI is live or cached |
| `GET /api/items` | logged in, or `?demo=1` | all 33 foods with score, band and price arrow |
| `GET /api/items/{key}` | logged in, or `?demo=1` | signals, points, headlines, explanation, price history, suppliers, substitutes (404 if unknown) |
| `GET /api/past` | logged in, or `?demo=1` | past shortages with sources and price charts |
| `GET /api/backtest` | everyone (the landing page's proof card uses it) | the replay |
| `POST /api/signup`, `/api/login`, `/api/logout`, `GET /api/me` | everyone | see **Authentication** below |
| any other address | everyone | the React page (React Router picks the screen). `/app` without a login or `?demo=1` is redirected to `/login`. Unknown addresses get status 404 and the friendly "Page not found" screen |

- **The demo switch:** a small "middleware" (code that runs before every request) sees `?demo=1` and sets `MODE_OVERRIDE` in `connectors/common.py` to `"sample"` for that one request. `get_mode()` checks it first, so the whole request quietly uses the sample folder and the sample date. No scoring code changed. `MODE_OVERRIDE` is a `ContextVar`: like a global variable, but each request gets its own copy, so a demo visitor and a logged-in user at the same moment can't mix.
- **The login guard:** `login_or_demo` is a FastAPI "dependency" attached to the data endpoints. It runs first and answers 401 if you're neither logged in nor in the demo.

Price history and headlines come from the current mode's folder, so live mode shows real prices and real headlines with links. Visit `/docs` for FastAPI's built-in test page.

## frontend/: the pages

**Routing:** `main.jsx` uses React Router (`react-router-dom`, the standard React router). It reads the address bar and picks a page: `/` landing, `/signup`, `/login`, `/app` dashboard, anything else "Page not found". It's still one React app; switching pages doesn't reload the browser.

| Page file | Job |
|---|---|
| `LandingPage.jsx` + `LandingFaq.jsx` + `landing.css` | The public home page: hero, the problem, how it works, the **proof card** (fetched from `/api/backtest`, so the "10 months early" can't be made up or go stale), what it is and isn't, FAQ (built-in `<details>` tags, so it expands with no JavaScript), call to action. |
| `LandingPreview.jsx` | The "What you'll see" example card in the hero: the demo scenario's top 3 foods (fetched from `/api/items?demo=1`), with a one-line explanation of the 0–100 score, column labels, and what High / Medium / Low mean you should do. Labeled EXAMPLE · SAMPLE DATA so nobody mistakes it for today's numbers |
| `SignupPage.jsx`, `LoginPage.jsx`, `authForm.jsx` | The two forms. `authForm.jsx` holds what they share: `postJson`, the page frame, and an accessible `Field` (label, red border + message on error, `aria-invalid`/`aria-describedby` so screen readers read the problem) |
| `api.js` | `isDemo()`, and `getJson()`, which adds `?demo=1` to every API call in the demo and turns a 401 into a trip to `/login` |
| `NotFound.jsx` | Friendly 404 with a link home |

## The dashboard (redesigned)

**Design rules** (all in `App.css`, defined once as variables): calm civic palette with a deep-teal accent; every text color passes WCAG AA contrast (checked with the WCAG formula); one spacing scale (4/8/16/24/32px); system fonts, so it works offline; a visible teal focus ring for keyboard users; **risk is never shown by color alone**: ▲ High, ◆ Medium, ● Low, ○ Not enough data.

| File | Job |
|---|---|
| `App.jsx` | Loads data; shows only unusual foods (or search results), high risk first; two columns when a food is open; plain error message with **Try again** |
| `Header.jsx` | Logo (resets the dashboard), "Hi, name" + **Log out** when logged in, or **Sign up free** in the demo; the LIVE DATA / DEMO · SAMPLE DATA badge; "Data as of" |
| `HighRiskAlert.jsx` | A red bar naming any food at **High** risk (click to open it). When nothing is High, it shows **nothing at all** |
| `riskLevels.js` + `RiskBadge.jsx` | One table for how each risk level looks, used everywhere |
| `RiskCard.jsx` + `RiskGrid.jsx` | Food cards (real buttons, keyboard friendly) with a price arrow (latest price vs its 6-month average, the same comparison the score uses, so they never disagree); grey placeholders while loading |
| `DetailPanel.jsx` | Beside the cards on a laptop, a slide-up sheet on a phone. Focus moves into it on open; Escape or × closes it and returns focus to the card |
| `ScoreGauge.jsx` | 0–100 bar with Low/Medium/High zones and a marker at the score |
| `SignalBars.jsx` | "Why this score": one row per signal showing how many of the 0–100 points it adds ("+12 points", from `risk.points_by_signal`, the same numbers the AI is given) and a plain-English sentence (each connector writes its own, e.g. "October 2026: $3.59, 2.2% below its usual level…"). Missing data shows a dashed bar and "left out", never a fake 0 |
| `WhatToDo.jsx` | Supplier cards linking to official sites, plus substitute "chips" |
| `PastYears.jsx` + `ReplayPanel.jsx` | Past shortages with sources and real price charts; the egg replay with both lead times in large text (10 months for Medium, 0 for High) |
| `Footer.jsx` | "How this works and its limitations" |
| `PriceChart.jsx` | Recharts line chart (we only say which field goes on which axis) |

**Judge questions**
- *Why doesn't the detail panel open by itself on phones?* On a phone it's a sheet covering the page; opening it automatically would hide everything before the user has looked.
- *How did you check accessibility?* Contrast was calculated for every color pair, and keyboard use was tested by hand (Tab order, Enter opens, Escape closes, focus returns). An automated scanner (axe) couldn't be run in our environment, so that remains unchecked.

## backend/tests/: pytest (risk + normalization only)

28 tests:
- **test_risk.py**: weights sum to 1, hand-calculated example (47), renormalizing (50), 0 ≠ missing, no coverage gives None, band edges (33/34, 66/67).
- **test_normalization.py**: clamping, the 15% jump gives 0.5 price case, a price index is never labeled as dollars, ignoring future months, too little history gives None.
- **test_news_signal.py**: average severity 4.5 gives 0.875, no relevant news gives 0 (not None), an unreadable headline gives None, old and future headlines are ignored, low-confidence headlines are ignored. These tests replace the AI with a fixed lookup table, so they never call the API.

## start.sh: one-command launch

Installs packages on the first run, starts the backend in the background and the frontend in front. Ctrl+C stops both. This means no juggling two terminals on demo day.

## render.yaml: how the live site is deployed

**Purpose:** tells Render how to build and run the app on its free plan. Render reads it from GitHub and redeploys on every push to `main`.
- **Build:** install the Python packages, then build the React page into `frontend/dist`.
- **Start:** run `uvicorn` on the port Render gives us (`$PORT`).
- **One service:** the last lines of `main.py` make FastAPI also serve the built page, so the API and the page share one address and no CORS setup is needed.
- **Health check:** Render opens `/api/status` to confirm the app started.
- **No API key on the server:** it runs in live mode on the saved real-data snapshot and the saved AI outputs.

**Judge question:** *Why Render and not Vercel?* Render runs our Python server exactly as it runs on a laptop, with zero code changes. Vercel would mean rewriting the backend as serverless functions. The trade-off is the free plan's slow wake-up after being idle.

## backend/refresh_live.py: fetching real current data

**Purpose:** the only file that downloads data. It saves a dated snapshot to `data/live/` in the **same file formats** the connectors already read, so no connector needed a new "live" branch.
- **Prices:** BLS public API, one request for all 5 series. Months published as "-" are skipped.
- **Drought:** U.S. Drought Monitor, latest weekly map per region. The class saved is the worst level covering at least half the area.
- **News:** 8 broad GDELT searches (e.g. general "food shortage" news, meats, dairy, produce), up to 10 US English articles each from the last 30 days, with links. The AI decides which food each headline is about. The searches live in `data/live_sources.json`, along with which foods each one covers. GDELT blocks anything faster than one request every 5 seconds, so the script waits 10 seconds and retries. A search that still fails is recorded in `refreshed.json`, and that item's news shows as **unavailable** (not "no news").
- **AI step:** rates each new headline and writes the 8 explanations, so the website never calls the AI.

**Why a snapshot, not live fetching per page view?** BLS allows 25 requests a day without a key, GDELT is slow and strict, and the AI costs money. The snapshot is instant, free and repeatable, and the page shows exactly how fresh it is.

**Judge question:** *So it's not truly real-time?* Correct. It's as fresh as the last refresh, which is shown on screen. Prices are monthly anyway (BLS publishes about two weeks after each month ends), and drought maps are weekly. A scheduled daily refresh would be the next step.

## Authentication: backend/auth.py (simple accounts)

**Be upfront with judges:** this is a basic account system for a competition project, not production-grade security. It uses standard, well-known pieces (bcrypt, signed cookies, SQLite), but leaves out things a real product would need (see the limitations below).

**What's stored:** one SQLite table, `users`: id, name, email, password **hash**, created date. Nothing else. SQLite is a database that is just one file (`backend/users.db`), and it comes built into Python. That file is in `.gitignore`, so accounts never go to GitHub.

**How passwords are stored**
- We never store the password. `bcrypt.hashpw` turns it into a **hash**: a one-way scramble. You can check a password against it (`bcrypt.checkpw`), but you can't turn it back into the password.
- bcrypt adds a random **salt** to each one, so two people with the same password get different hashes, and precomputed "rainbow tables" don't work.
- bcrypt is **slow on purpose** (about a quarter of a second per guess), so someone who stole the file couldn't try billions of guesses.
- bcrypt only reads the first 72 bytes of a password, so sign-up allows 8 to 72 characters.

**What the session cookie is**
- After sign-up or login, the server gives the browser a cookie named `session`. It holds the user's id, **signed** with a secret key (`itsdangerous`, the same library Flask uses). If anyone edits the cookie, the signature no longer matches and the server rejects it.
- The key comes from the `SESSION_SECRET` environment variable. It's never in the code, because anyone who knew the key could forge a login. Render generates it (`render.yaml`), and `start.sh` makes a random one locally.
- **HTTP-only:** the page's JavaScript can't read it (we checked: `document.cookie` is empty), so an injected script can't steal it.
- **SameSite=Lax:** the browser doesn't send it with form posts from other websites, which blocks the common cross-site trick.
- **Secure (on Render):** sent only over https.
- **Expiry:** 7 days. The browser sends it automatically with every request, and `current_user()` checks the signature and age, then looks up the user.

**What happens on login failure**
- A wrong password *and* an unknown email both get the same answer: 401 "Invalid email or password." That way nobody can use the login form to find out who has an account.
- Each failure is remembered for that email. After **5 failures in 15 minutes**, the login answers 429 ("Too many failed tries") without checking the password. This stops someone guessing thousands of passwords.
- Sign-up with an email that's already taken gets 409, "That email is already registered", and the page offers a link to log in. The email column is `UNIQUE`, so the database itself refuses duplicates.

**Protecting the app:** a logged-out visitor asking for `/app` gets redirected to `/login` by the server. The data endpoints answer 401 without a valid cookie, and the dashboard turns any 401 into a trip to `/login`. **Log out** deletes the cookie. `?demo=1` skips all of this and shows sample data, clearly badged DEMO.

**Tested by hand** with `curl` and in the browser:
- signing up with bad input (422)
- signing up (cookie is HTTP-only)
- a duplicate email (409)
- a tampered cookie (401)
- 6 wrong passwords (401 ×5, then 429)
- an unknown email (same 401 message)
- logging in with a differently capitalized email
- `/app` logged out (redirect) and logged in (200)
- logging out (then 401)
- the database holding only `$2b$…` bcrypt hashes

**Email confirmation and welcome email: `backend/verify.py` + `backend/emails.py`**
- **On sign-up**, `auth.py` builds a link like `/api/verify?token=…` and emails it. The token is signed with the same `SESSION_SECRET`, but with a different "salt" (`verify-email`). The salt is a label mixed into the signature, so an email link can never be used as a login cookie, or the other way round. We tested that. The token holds the user's id and email and expires after **2 days**.
- **Background tasks:** the email is sent *after* the sign-up answer goes back (FastAPI's `BackgroundTasks`), so a slow email service never makes sign-up slow.
- **Opening the link** (`GET /api/verify`) checks the signature and age, marks the account `verified = 1`, and sends the **welcome email**. That happens the first time only, so clicking twice doesn't send two welcomes. It then redirects to `/app?verified=1`, or `/login?verified=1` if that browser isn't logged in, where a green message says the email is confirmed.
- **A broken or old link** redirects with `?verify_error=1`, and the page says so and offers a new one.
- **"Send it again"** (`POST /api/resend-verification`) needs a login, refuses if you're already confirmed, and allows one email a minute per user.
- **Unconfirmed users can still use the dashboard.** They see a yellow reminder banner (`VerifyBanner.jsx`). Blocking them would make the demo harder for no real safety gain, because nothing in the app is private or costly.
- **How it sends (`emails.py`):** through Brevo's web API over HTTPS, using `BREVO_API_KEY` and `MAIL_FROM` from environment variables. Render's free plan blocks the normal email ports (SMTP 25/465/587), so a web API is the only option there. Without the key, the email is **printed to the server log** instead, so sign-up works on a laptop with nothing set up. If sending fails, the error is logged and sign-up still succeeds.
- **What went wrong when we set it up (and the fixes):**
  - **The settings weren't saved on Render.** The log said "not sent: … not set".
  - **The pasted key had a hidden line break.** `emails.py` now `.strip()`s both settings.
  - **The first error message printed the whole key into the log.** Now only the error type, or Brevo's own reply, is logged, because secrets must never go in logs. The key should be replaced after that.
  - **The key had a stray extra character.** Brevo said "Key not found".
  - **Brevo blocked Render's unknown IP address.** Fixed in Brevo's Authorised IPs settings.
- **Judge questions:**
  - *Why confirm emails at all?* It proves the address belongs to the person, so alerts (a future feature) would reach the right inbox, and nobody can sign up with someone else's email.
  - *Why can't someone fake a confirmation link?* It's signed with the server's secret key, so changing one character breaks it.
  - *Where did the welcome email go?* Check spam. Mail sent from a free address through a third-party service often lands there. A domain of our own, with the email-authentication settings Brevo walks you through, would fix it.

**Known limitations** (also in the README)
- **On Render's free plan, accounts are wiped on every redeploy or restart**, because the server's disk is temporary. A paid persistent disk or a hosted database would fix this. The demo needs no account, so it always works.
- The failed-login counter lives in memory: it resets on restart, and it counts by email, not by IP address.
- Logging out deletes the cookie in the browser, but the server doesn't keep a list of cancelled tokens, so a copied cookie would keep working until it expires (7 days).
- An unknown email answers slightly faster than a wrong password (bcrypt isn't run), so careful timing could hint whether an email has an account.
- Future work: no password reset, no social login, no "change my password". Unconfirmed accounts aren't deleted automatically.

**Likely judge questions**
- *Can you see my password?* No. Only the bcrypt hash is stored, and it can't be reversed.
- *What if someone steals the database file?* They'd get names, emails and hashes. Because bcrypt is salted and slow, cracking a strong password would take an impractically long time; a weak one like "password1" could still be guessed.
- *What stops someone faking the cookie?* It's signed with a secret key only the server knows. Change one character and the signature check fails.
- *Why bcrypt and not SHA-256?* SHA-256 is designed to be fast, which helps attackers guess billions of passwords a second. bcrypt is designed to be slow and salted.
- *Why a cookie instead of storing a token in JavaScript?* An HTTP-only cookie can't be read by scripts on the page, so an injected script can't steal the login.
- *Why does the login error not say which part was wrong?* So the form can't be used to discover which emails have accounts.
- *Is this production-ready?* No, and we say so. The limitations above are the list of what we'd add.

## Limitations and honest caveats

- **Accounts are basic** (see Authentication): they're wiped on each redeploy of the free Render plan, and there's no password reset or email verification.

- **Weights are not fitted.** They are reasoned starting values. With more past events we could test alternatives on one event and check them on another.
- **LLM severity is a judgment call**, even with a fixed rubric. DeepSeek and our own hand labels disagreed on 4 of 19 headlines (each by one level), and the same headline once got 5 and once got 1. The saved cache makes the demo stable, but a different run could give slightly different scores. We used a cheap model (DeepSeek V4.1 Flash) to keep costs near zero. A stronger model might judge more consistently.
- **The Claude path (`ANTHROPIC_API_KEY`) is untested with a real key**. Only the DeepSeek/OpenRouter path has run for real.
- **The backtest is one event.** Red came the same month as the report (0 lead time). Port and drought history are illustrative, not measured. Prices are national averages, not Southern California.
- **Only 33 foods:** the ones with official BLS prices, plus 3 staples. Cooking oil's price is a broad index (it also includes peanut butter and other oils), not a cooking-oil-only price. Import exposure is a yes/no, not a percentage, and each food's drought is checked in one area only.
- **Live data limits:** BLS has no prices for cooking oil, canned tomatoes or peanut butter, and its prices are national averages, not Southern California. There's no free live count of ships waiting at ports, so live mode uses the NY Fed's Global Supply Chain Pressure Index instead. It is global and monthly (about a month behind), and measures shipping costs and delivery times in general, not food or one port specifically. The news search covers only 5 articles per item. Data is as fresh as the last `refresh_live.py` run.
- **Sample vs live:** live mode (the default) is real data. Sample mode is synthetic and labeled on screen.
- **Simplifications:** one producing area per item (beef is also raised in Nebraska and Kansas, for example); weather covers drought only (no floods or heat waves); the supplier list is a starting directory, not checked for current availability; the port signal only covers LA/Long Beach.
