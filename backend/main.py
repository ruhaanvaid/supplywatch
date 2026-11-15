"""SupplyWatch API: four read-only endpoints for the one-page frontend.

Run from the backend folder:  .venv/bin/uvicorn main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import backtest
import past
from connectors import news_severity
from connectors.common import current_as_of, get_mode, load_items
from connectors.price_spike import load_price_history
from llm_explain import explain
from llm_client import model_label
from risk import WEIGHTS, compute_risk, risk_band
from signals import get_all_signals
from suppliers import alternates_for, substitutes_for

app = FastAPI(title="SupplyWatch")


def as_of():
    """Sample: a fixed demo date. Live: the day the real data was last refreshed."""
    return current_as_of()


def score_item(item):
    signals = get_all_signals(item, as_of())
    score = compute_risk({name: s["value"] for name, s in signals.items()})
    return signals, score


def price_trend(item):
    """'up', 'down' or 'steady': the latest month's price vs the month before.
    A change of 1% or less counts as steady. None if there's no price data."""
    try:
        prices = [p for m, p in load_price_history(item) if m <= as_of().strftime("%Y-%m")]
    except OSError:
        return None
    if len(prices) < 2:
        return None
    change = prices[-1] / prices[-2] - 1
    return "up" if change > 0.01 else "down" if change < -0.01 else "steady"


@app.get("/api/status")
def status():
    sample = get_mode() == "sample"
    return {
        "mode": get_mode(),
        "label": ("Using SAMPLE data (synthetic, for demo)" if sample
                  else "Using LIVE data: real prices (BLS), drought (U.S. Drought Monitor) and news (GDELT)"),
        "as_of": as_of().isoformat(),
        "llm": model_label() if model_label() else "cached outputs only (no API key)",
    }


@app.get("/api/items")
def list_items():
    """Every tracked food with its score and color. The page shows only the
    unusual ones (yellow/red) up front, and searches the rest."""
    results = []
    for key, info in load_items().items():
        _, score = score_item(key)
        results.append({"key": key, "name": info["name"], "emoji": info.get("emoji", ""),
                        "category": info["category"], "score": score, "band": risk_band(score),
                        "price_trend": price_trend(key)})
    return results


@app.get("/api/items/{key}")
def item_detail(key: str):
    """Everything the detail panel shows for one item."""
    items = load_items()
    if key not in items:
        raise HTTPException(status_code=404, detail=f"Unknown item: {key}")
    info = items[key]
    signals, score = score_item(key)
    band = risk_band(score)

    events, history = [], []
    try:   # both read the current mode's folder (live or sample)
        events, _ = news_severity.recent_events(key, as_of())
        history = [{"month": m, "price": p} for m, p in load_price_history(key) if m <= as_of().strftime("%Y-%m")]
    except OSError:
        pass   # a missing file just means an empty chart or list, not a crash

    return {
        "key": key, "name": info["name"], "unit": info["unit"],
        "score": score, "band": band, "weights": WEIGHTS, "signals": signals,
        "headlines": events,
        "explanation": explain(info["name"], score, band, signals, events),
        "price_history": history,
        "suppliers": alternates_for(key),
        "substitutes": substitutes_for(key),
    }


@app.get("/api/backtest")
def get_backtest():
    return backtest.run_backtest()


@app.get("/api/past")
def get_past():
    """Real past US food shortages, each with sources and real prices around it."""
    return {"events": past.past_shortages()}


# When deployed, FastAPI also serves the built React page (frontend/dist), so the
# whole app is ONE service at ONE address. This line must stay LAST: the API
# routes above are matched first, and everything else falls through to the page.
FRONTEND_BUILD = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")
