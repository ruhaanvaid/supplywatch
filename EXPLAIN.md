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

### Design system (`tokens.css`, `CLAUDE.md`)

The project's `CLAUDE.md` sets the design rules: no purple, no gradients, no glass effects, no stat rows, no centered single-column template, a real display typeface, and checking the work at 375/768/1024/1440px. The brief: **a civic, newspaper-like tool for busy, skeptical food bank buyers. The page's one job is to get them to try the demo.**

**The price-line idea.** The logo's "W" is a price line, so the whole site is built around real price lines: thin, precise, annotated like a newspaper graphic. The landing hero isn't a slogan; it's the **real 2022–23 egg price chart** with two dated notes ("SupplyWatch first showed Medium risk: Mar 2022", "Shortage reported: Jan 2023"). Every date and the "10 months" are computed from `/api/backtest`, and the prices come from the BLS data in `/api/past`. The same chart style appears in the detail panel, in the Replay section and, small, on every ledger row.

**Palette: six named colors, nothing else.**

| Name | Hex | Job | Why |
|---|---|---|---|
| Paper | `#F5F4EF` | Page background | Warm, like newsprint: calmer than white |
| Ink | `#1D2B26` | Text (13.4:1 on Paper); also rules and muted text at lower strength | A green-black that matches the logo |
| Field | `#285C4F` | **The** accent: logo, buttons, links, every price line (7.0:1) | It's the logo's green, used sparingly so it means "SupplyWatch" |
| Sprout | `#DCE8E1` | Quiet tint: active filter, selected row | Shows "selected" without shouting |
| Signal amber | `#B7791F` | **Medium risk only** | Too light for small text (3.3:1), so it only colors shapes and bars; the word "Medium" stays in Ink |
| Alert red | `#B3321F` | **High risk only** (5.6:1, so it can be a word) | Reserved, so red always means "act now" |

**Low risk is deliberately quiet** (gray shape, muted word), so when something turns amber or red it stands out. Every text color was checked against WCAG AA; the gray Low shape was darkened to 4:1 after the check.

**Type.**
- **Fraunces** (a characterful serif) is used with restraint, only for the hero, section headings, group names and big numbers. **Inter Tight** is used for everything else.
- An explicit scale: hero 54px / line-height 1.04 / -0.02em; sections 30px / 1.15; body 16px / 1.6; UI 14px; captions 12.5px.
- Every score and price uses **tabular numbers**, so digits line up in the ledger.
- Both fonts are bundled from npm (`@fontsource-variable/...`) with `font-display: swap` and fallbacks, so they work offline at a demo.

**Lines, not boxes.** Spacing of 4/8/12/16/24/32/48/72px; 1px hairline rules instead of card borders; 4px corners. There's **one** shadow in the whole UI: the detail panel, which floats over the page.

**Motion.** One moment only: the hero's price line is revealed left to right on load. With "reduce motion" turned on, everything is still.

**Charts without a chart library.** `PriceLine.jsx` (about 80 lines) draws every chart: the line is plain SVG, and the labels, notes and clickable major-move markers are HTML laid on top by percentage. That keeps text readable on phones and makes markers real, focusable buttons. Removing Recharts cut the JavaScript from about 600 kB to 215 kB.

**The logo** is the original `supplywatch-logo.svg`, copied in unchanged (`src/assets/`) and only scaled.

### The public pages

| File | Job |
|---|---|
| `LandingPage.jsx` | Puts the sections in order. Each is a small file in `src/landing/` |
| `landing/LandingNav.jsx` | Logo, How it works, FAQ, Log in, Sign up free. On phones a **Menu** button (`aria-expanded`) opens the links, and choosing one closes it |
| `landing/Hero.jsx` | Two-column editorial grid. Left: a headline built from the replay ("Eggs showed warning signs **N** months before stores limited purchases"), two sentences, and **Sign up free** / **Try the demo (no account)**. Right: the annotated egg chart (`ReplayChart`), running to the window edge on laptops, then the honest line about High only arriving the same month and "One event is a demonstration, not proof" |
| `landing/HowItWorks.jsx` | Four numbered steps in one ruled strip (a real sequence, so the numbers mean something) |
| `landing/WhatItWatches.jsx` | A real `<table>` ledger: each signal, its share of the score (from `risk.py`), its actual source (BLS, GDELT, U.S. Drought Monitor, **New York Fed** supply chain index, which is what live mode really uses for shipping), the question it answers, and **what it misses** |
| `landing/IsIsnt.jsx`, `landing/Faq.jsx` | Two columns of plain statements; a ruled `<details>` accordion |
| `landing/ClosingBand.jsx`, `landing/Footer.jsx` | One Field-green band with one sentence and the two buttons, then a quiet footer |
| `ReplayChart.jsx` | `useEggReplay()` fetches the replay and the real egg prices, and `ReplayChart` draws them with the two notes. Used by the hero AND the dashboard's Replay section |
| `SignupPage.jsx`, `LoginPage.jsx`, `authForm.jsx`, `auth.css` | The forms, now with the real logo. `authForm.jsx` holds what they share: `postJson`, the page frame, and an accessible `Field` |
| `api.js`, `NotFound.jsx` | `getJson()` (adds `?demo=1` in the demo, turns a 401 into `/login`); friendly 404 |

**Removed on purpose:** "The problem" cards (including the unsourced "costs thousands a year"), the trust strip and the separate proof card. The hero now carries the proof, with the real chart.

## The dashboard (ledger design)

| File | Job |
|---|---|
| `App.jsx` | Puts the parts in order (below). A hidden `<h1>` for screen readers. The data-source-down banner has **Try again** |
| `Header.jsx` | Logo (click = reset the dashboard), the LIVE / DEMO badge with the data date, your name, **Log out** |
| `StatusLine.jsx` | One sentence from the real scores ("All 33 scored foods look normal today." / "3 foods need attention: Eggs, Rice, Canned tomatoes."). Names open the food; High/Medium/Low counts are quiet filters |
| `Spotlight.jsx` | **Closest to unusual**: the top 3 scores, always shown (it says when all are Low), each with its price line and a reason: the signal that added the most points |
| `Controls.jsx` | Search, risk chips (with counts) and sort, in one row that wraps |
| `foodGroups.js` + `FoodGroup.jsx` | One small config maps foods to Produce / Dairy and eggs / Meat and poultry / Pantry staples / Drinks and other. Each group is a collapsible ruled section |
| `FoodRow.jsx` | **One ledger row**: name, score as a tabular number plus a thin bar drawn to scale, risk label (shape + word), price arrow, and a 12-month price line. Medium and High rows get a thin amber or red edge. On phones each row folds onto two lines |
| `PriceLine.jsx` + `chartMath.js` | Every chart and small line (see Design system) |
| `DetailPanel.jsx` | The same price-line chart with clickable major-move markers, signal bars (`SignalBars.jsx`: weight, % of max and points; **"unavailable"** with a dashed line when a source is missing), the explanation, headlines and suppliers |
| `PastYears.jsx` + `ReplayPanel.jsx` | **Replay: the 2022–23 egg shortage**, its own section: both lead times at the same size, the egg chart with the same notes as the landing hero, the egg score line with dashed Medium/High thresholds, then the past shortages, each with its real price line |
| `riskLevels.js` + `RiskBadge.jsx` | One table for each risk level's shape and word, used everywhere |

**One small API addition (approved):** `/api/items` now includes each food's last 12 monthly prices (`recent_prices`), so every ledger row can draw its price line without 33 extra requests. It's read-only: the same numbers the detail chart shows, never used in the score. In the demo, only the 8 foods with sample prices have a line; the rest say "No price data".

**Checked:**
- 375, 768, 1024 and 1440px on both pages, with no sideways scrolling
- tap targets at least 44px (the nav links were fixed)
- one `<h1>` per page, no heading jumps, no unnamed buttons or links, alt text on the logo
- every text color at AA (a script measured them on the real pages)
- keyboard order (logo → nav → hero buttons → FAQ; Enter opens answers) with a visible focus ring
- the phone menu opens, closes and scrolls to its section
- the CLAUDE.md vibe-code checklist: all "no"

**Not checked:** a real screen reader, an automated axe scan, Safari and Firefox, real phones (only Chrome at those widths), and the live data view (we tested with the demo).

**Judge questions**
- *Why a serif for headings?* The audience is skeptical of hype. A serif plus ruled tables reads like a trustworthy publication, not an ad.
- *Why is Low gray instead of green?* Most foods are Low most of the time. A page full of green hides the one amber or red line that matters.
- *Why draw charts yourselves?* One small component we can explain line by line, instead of a 400 kB library, and it lets the notes and markers be real, accessible HTML.

### Filtering and sorting: `filterAndSortFoods.js`

One function decides which food cards appear: `filterAndSortFoods(foods, search, risk, sort)`. In plain words:
1. **Keep** a food only if its name contains the search text (capital letters don't matter) **and** its risk level matches the chosen chip. "All" matches everything. So "rice" + High shows only High-risk foods with "rice" in the name.
2. **Sort** a copy of what's left (the original list is never changed). Foods with **no score** ("Not enough data") always go **last**, whatever the sort. Then: highest score first (default), lowest first, or A to Z. Ties are broken by name, so the order never jumps around.

- **It doesn't redefine the risk bands.** The server already labels every food with its band (`risk.risk_band`: 0–33 Low, 34–66 Medium, 67–100 High, no score = grey). The function compares those labels using the existing `riskLevels.js` table; it never re-checks 33/66.
- **The view lives in the address:** `useFoodView` reads and writes `?risk=high&sort=name&q=rice`. Refresh or share the link and you get the same view. Default values are left out to keep the link short. `?demo=1` is kept. It uses *replace*, so typing a word doesn't add one Back-button step per letter.
- **Chip counts follow the search:** each number is how many cards you'd see if you clicked that chip. The count pills in the status hero show the totals.
- **Accessible:** chips and the count pills are real buttons with `aria-pressed` (screen readers say "pressed"); always shape + word, never color alone; "Showing N of 33 foods" is announced as it changes; chips wrap onto new lines on a phone.
- **Tested:** 9 checks on a mixed list (each sort, each filter, search + filter, uppercase search, no-score foods last, an empty result, original list unchanged), plus clicking through the demo in a browser (summary card → filter, refresh keeps the view, empty state → **Clear filters**, Tab + Enter on chips, phone width).

**Judge questions**
- *Why are foods with no score always last, even sorting A to Z?* No score means we can't say anything about them yet, so they shouldn't sit between foods we can rate.
- *Why doesn't the detail panel open by itself on phones?* On a phone it's a sheet covering the page; opening it automatically would hide everything before the user has looked.
- *How did you check accessibility?* Contrast was calculated for every color pair, and keyboard use was tested by hand (Tab order, Enter opens, Escape closes, focus returns). An automated scanner (axe) couldn't be run in our environment, so that remains unchecked.

## Major price moves: backend/price_moves.py + PriceLine.jsx / PriceMoves.jsx

The price chart in each food's panel marks only the **big** month-to-month jumps, and explains each one using **only data the app already has**. This is display and explanation only: the risk score, its formula and the connectors are unchanged.

**What counts as "major"** (the `MAJOR_MOVES` config at the top of `price_moves.py`):
> a month is major if |% change from the month before| ≥ **max(3%, 2 × this food's typical monthly change)**
> where *typical monthly change* = the standard deviation of that food's monthly % changes.

- **Why "2 × typical":** foods wobble by different amounts. Eggs normally swing about 7–8% a month, so 10% is ordinary for eggs, but rice moves about 1%, so 4% is unusual for rice. Comparing each food to its *own* normal stops the jumpy foods from flooding the chart.
- **Why the 3% floor:** for a very steady food, "2 × typical" could be 1%, which is noise rather than news.
- **Why at most 5:** so the chart never gets cluttered. We keep the 5 *biggest*, then list them newest first.
- Only months that are next to each other are compared (a gap in the data is skipped), and a food needs at least 3 monthly changes before "typical" means anything.
- **Example (demo):** eggs' typical change is 6.7%, so the bar is 13.5%. September (+15.6%) and October (+17.6%) clear it.

**`find_major_moves(prices, config)`** in four steps: (1) the % change for each month vs the month before, (2) typical = standard deviation, (3) bar = max(3%, 2 × typical), keep the moves over the bar, (4) keep the 5 biggest, newest first.

**`gather_evidence(food, month)`** looks only at **that month and the month before**, and only at three things we already store:
1. **News** (GDELT) the AI tagged as about *this food*, using the same rule as the news signal (confidence at least 0.5)
2. **Drought** in the food's main U.S. growing area, moderate (D1) or worse
3. **Port / shipping strain**, only for mostly imported foods, at least 25% of the way to "severe", scaled exactly like the port signal

**Past evidence: `backend/fetch_move_evidence.py`.** The live refresh only keeps the last 30 days of news and the latest drought map, because the risk score is about *today*. But a price move from May 2025 needs evidence from May 2025. This script saves that history in two separate files that **only the price-move explanations read. The risk score never reads them**:
- `data/live/drought_history.csv`: the last weekly U.S. Drought Monitor map of every month since December 2024, for each growing area.
- `data/live/headlines_history.csv`: for each real-data major move, a GDELT news search for that food in the move month and the month before (up to 10 articles each).

`refresh_live.py` now runs it after the normal refresh. GDELT allows one request every 5 seconds and answers "429 too many requests" when you go faster. The script waits longer and retries, and if a search is still blocked it **prints FAILED instead of pretending there was no news**. Headlines saved by earlier runs are kept, so running it again later fills the gaps without losing anything.

Every evidence item has a stable id: `news-` plus the first 6 characters of a hash of the headline, `drought-2025-05` or `port-2025-05`. That way an id still means the same thing after the files change, so a saved answer can never point at the wrong headline.

**The evidence rule (strict):**
- **No evidence:** the AI isn't even asked. The page says "Price rose X% this month. No clear cause found in our data."
- **Evidence found:** the AI writes 1–2 sentences from that evidence only (temperature 0), and must answer in strict JSON: `{explanation, evidence_ids, confidence: low|medium|high}`. `validate()` throws the answer away if:
  - it isn't that exact JSON
  - it writes raw evidence ids like "news-3" in the sentence
  - it's more than 2 sentences
  - it uses causal words ("caused by", "because", "due to", "led to", "drove")
  - it cites an evidence id we didn't give it
  - it makes a claim without citing anything

  The allowed wording is "may be related to" or "coincided with".
- **Saving answers:** good answers are saved in `data/ai_cache/price_moves.json` by mode/food/month, with the evidence they were based on and a fingerprint of the rules. If the evidence or the rules change, the saved answer is not reused.
- **No AI key:** saved answers are used if there are any. Otherwise a template that claims nothing: "Price rose X% this month. Our data shows the items below for the same period; we can't tell if they are connected."
- The evidence each sentence rests on is shown under it (news with links when real), along with who wrote it and the AI's confidence.

**Chart honesty:**
- On live data, the label reads "Monthly national average prices (U.S. Bureau of Labor Statistics)". In the demo it says the prices are made up, because putting a BLS label on sample data would be false.
- A note says the price axis doesn't start at $0, so changes look bigger than they are.
- Markers use ▲/▼ plus a "+17.6%" label, never color alone.
- Markers and list entries are buttons (Tab + Enter), with `aria-pressed`. Clicking one highlights the other.

**Honest limits:**
- On real data there are 29 major moves today. **12 are explained from our evidence** (news, drought, shipping). 1 has evidence that doesn't fit: chicken legs fell during a drought, and drought goes with prices *rising*, so it honestly says "No clear cause found in our data." The other 16 have no matching evidence in our files, so they say the same. That's the rule working, not a bug: we won't fill the gap from general knowledge.
- Some of those 16 are gaps, not proof that nothing happened. GDELT blocked 5 of the news searches every time we tried (lettuce/produce in March 2025, May 2025 and May 2026, meat in June 2026, bread/wheat in April 2026). Running `fetch_move_evidence.py` again later fills them in.
- "Coincided with" isn't proof. Two things happening in the same month can be unrelated.
- The live site has no AI key. It shows the **saved** answers in `data/ai_cache/price_moves.json`, written once with DeepSeek via OpenRouter by running `.venv/bin/python price_moves.py` locally with a key. Today that's 19 answers: 6 demo moves and the 13 real-data moves that have evidence. Moves with no evidence don't need the AI.

**Tests:** `tests/test_price_moves.py`, 10 tests with a fake AI:
- the 3% floor
- jumpy foods need bigger jumps
- when every month swings, none stands out
- the cap of 5, newest first
- gaps and short histories
- `validate()` rejects "because", "caused by", made-up evidence, claims without evidence, 3 sentences, and a bad confidence value
- no evidence means the AI is never asked
- a rule-breaking answer falls back to the template
- a good answer is saved and reused without a key
- past news and drought come from the `*_history.csv` files, only inside the move's 2-month window, with ids that stay the same

**Judge questions**
- *Why standard deviation?* It's the standard measure of how much something normally varies. "Twice the usual wobble" is a common, simple rule of thumb for "unusual".
- *Doesn't one huge jump raise the standard deviation and hide itself?* A little, yes. That's one reason for the 3% floor and for showing the bar on screen ("at least 13.5% for this food"), so anyone can check it.
- *How do you stop the AI making up a reason?* It only sees our evidence, it must cite evidence ids we gave it, and causal words are rejected by code. With no evidence it isn't asked at all.
- *Did you check the AI's answers?* Yes, by reading every one. The first run had raw ids in the text and one confusing extra sentence, so we tightened the rules, added code checks for those, and regenerated. One rule was also too strict: it rejected a correct "No clear cause" answer, which is now fixed and tested. After we added past evidence, the AI still said "No clear cause" for clear cases (butter fell right after a "Butter Price Crash" headline, and tomatoes jumped during extreme drought in Florida), because it wasn't told that drought evidence is always from that food's own growing area. We told it what each kind of evidence means, that drought and shipping strain go with prices *rising*, and to prefer one sentence. Then we read all 19 answers again.
- *Why "coincided with" and not "caused by"?* We can show two things happened at the same time, not that one caused the other.

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

**What's stored:** one table, `users`: id, name, email, password **hash**, created date, and whether the email is confirmed. Nothing else.

**Where it's stored: `backend/db.py`**
- **On the live site: Postgres**, a database server that runs separately from our web server. Render creates it from `render.yaml` and hands us its address and password through the `DATABASE_URL` setting, so no password is in the code.
- **Why not a file on the server?** That's what we did first, and accounts kept disappearing. Render's free web server **wipes its own disk every time it restarts**, which happens on every deploy *and* whenever it goes to sleep after 15 minutes with no visitors. A separate database isn't wiped.
- **On a laptop: SQLite**, a database that is just one file (`backend/users.db`, in `.gitignore`) and comes built into Python. Nothing to install.
- `db.py` hides the two differences between them: Postgres writes value slots as `%s` and SQLite as `?`, and they name the auto-counting id column differently. `auth.py` and `verify.py` call `db.run(...)` and work with either.
- **SQL injection:** values (like the email someone types) are always passed *separately* from the SQL text, so typing SQL into the form can't run it.
- **Tested** on SQLite and on a real Postgres: sign up, restart the server, log in again.
- **Limits:** the free Render database **expires after 30 days** (then 14 days to upgrade, about $6/month, before it's deleted), has no backups, and holds 1 GB.
- **Judge question:** *What happens on day 31?* Logins stop working until we upgrade the database or point `DATABASE_URL` at another Postgres (Neon has a free plan with no expiry). The rest of the site, including the demo, doesn't use the database and keeps working.

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

**Forgot password: `backend/password_reset.py` + `ForgotPasswordPage.jsx` + `ResetPasswordPage.jsx`**
- **"Forgot your password?"** on the log-in page goes to `/forgot-password`. You type your email, and if it has an account, we email a link to `/reset-password?token=…`.
- **Same answer either way:** the page says "If that email has an account, we've sent a link…" whether or not it does, so nobody can use it to find out who has an account. A fake email gets no email and no error. One reset email per address per minute.
- **The token** is signed with `SESSION_SECRET` under its own salt (`reset-password`), so it can't be faked or reused as a login or confirmation link. It expires after **1 hour**.
- **Each link works once.** The token holds a *fingerprint* of the current password hash: a SHA-256 of it, cut to 16 characters, so the hash itself never leaves the server. After the password changes, the fingerprint no longer matches and the old link is refused. We tested that.
- **Choosing the new password:** typed twice (they must match), 8–72 characters. The server saves the new bcrypt hash, clears any "too many tries" lock, **marks the email as confirmed** (opening the link proved you own the inbox), and logs you in.
- **Tested on SQLite and Postgres:**
  - a reset email for a real account, and none for an unknown one, with the same message for both
  - the one-per-minute limit
  - a short password (422)
  - a fake token (400)
  - a real token (200, and you're logged in)
  - the same link again (400)
  - the old password refused and the new one working
- **Judge question:** *Why doesn't the page say "no account with that email"?* That would tell a stranger which emails have accounts. Big sites give the same vague answer for the same reason.

**Known limitations** (also in the README)
- **The free accounts database expires 30 days after it was created** (see "Where it's stored"). The demo needs no account, so it always works.
- The failed-login counter lives in memory: it resets on restart, and it counts by email, not by IP address.
- Logging out deletes the cookie in the browser, but the server doesn't keep a list of cancelled tokens, so a copied cookie would keep working until it expires (7 days).
- An unknown email answers slightly faster than a wrong password (bcrypt isn't run), so careful timing could hint whether an email has an account.
- Future work: no social login, no "change my password" while logged in. Unconfirmed accounts aren't deleted automatically. Logging in or resetting your password doesn't log out *other* devices.

**Likely judge questions**
- *Can you see my password?* No. Only the bcrypt hash is stored, and it can't be reversed.
- *What if someone steals the database file?* They'd get names, emails and hashes. Because bcrypt is salted and slow, cracking a strong password would take an impractically long time; a weak one like "password1" could still be guessed.
- *What stops someone faking the cookie?* It's signed with a secret key only the server knows. Change one character and the signature check fails.
- *Why bcrypt and not SHA-256?* SHA-256 is designed to be fast, which helps attackers guess billions of passwords a second. bcrypt is designed to be slow and salted.
- *Why a cookie instead of storing a token in JavaScript?* An HTTP-only cookie can't be read by scripts on the page, so an injected script can't steal the login.
- *Why does the login error not say which part was wrong?* So the form can't be used to discover which emails have accounts.
- *Is this production-ready?* No, and we say so. The limitations above are the list of what we'd add.

## Limitations and honest caveats

- **Accounts are basic** (see Authentication): they live in a free database that expires after 30 days, and there's no password reset.

- **Weights are not fitted.** They are reasoned starting values. With more past events we could test alternatives on one event and check them on another.
- **LLM severity is a judgment call**, even with a fixed rubric. DeepSeek and our own hand labels disagreed on 4 of 19 headlines (each by one level), and the same headline once got 5 and once got 1. The saved cache makes the demo stable, but a different run could give slightly different scores. We used a cheap model (DeepSeek V4.1 Flash) to keep costs near zero. A stronger model might judge more consistently.
- **The Claude path (`ANTHROPIC_API_KEY`) is untested with a real key**. Only the DeepSeek/OpenRouter path has run for real.
- **The backtest is one event.** Red came the same month as the report (0 lead time). Port and drought history are illustrative, not measured. Prices are national averages, not Southern California.
- **Only 33 foods:** the ones with official BLS prices, plus 3 staples. Cooking oil's price is a broad index (it also includes peanut butter and other oils), not a cooking-oil-only price. Import exposure is a yes/no, not a percentage, and each food's drought is checked in one area only.
- **Live data limits:** BLS has no prices for cooking oil, canned tomatoes or peanut butter, and its prices are national averages, not Southern California. There's no free live count of ships waiting at ports, so live mode uses the NY Fed's Global Supply Chain Pressure Index instead. It is global and monthly (about a month behind), and measures shipping costs and delivery times in general, not food or one port specifically. The news search covers only 5 articles per item. Data is as fresh as the last `refresh_live.py` run.
- **Sample vs live:** live mode (the default) is real data. Sample mode is synthetic and labeled on screen.
- **Simplifications:** one producing area per item (beef is also raised in Nebraska and Kansas, for example); weather covers drought only (no floods or heat waves); the supplier list is a starting directory, not checked for current availability; the port signal only covers LA/Long Beach.
