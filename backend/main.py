"""SupplyWatch API: four read-only endpoints for the one-page frontend.

Run from the backend folder:  .venv/bin/uvicorn main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import backtest
from connectors import news_severity
from connectors.common import DEMO_AS_OF, get_mode, load_items
from connectors.price_spike import load_price_history
from llm_explain import explain
from llm_client import model_label
from risk import WEIGHTS, compute_risk, risk_band
from signals import get_all_signals
from suppliers import alternates_for, substitutes_for

app = FastAPI(title="SupplyWatch")


def as_of():
    """Sample mode uses a fixed date (repeatable demo); live mode uses today."""
    return DEMO_AS_OF if get_mode() == "sample" else date.today()


def score_item(item):
    signals = get_all_signals(item, as_of())
    score = compute_risk({name: s["value"] for name, s in signals.items()})
    return signals, score


@app.get("/api/status")
def status():
    sample = get_mode() == "sample"
    return {
        "mode": get_mode(),
        "label": ("Using SAMPLE data (synthetic, for demo)" if sample
                  else "Using LIVE data (live sources not connected yet, so most items can't be scored)"),
        "as_of": as_of().isoformat(),
        "llm": model_label() if model_label() else "cached outputs only (no API key)",
    }


@app.get("/api/items")
def list_items():
    """The risk grid: every item with its score and color."""
    results = []
    for key, info in load_items().items():
        _, score = score_item(key)
        results.append({"key": key, "name": info["name"], "score": score, "band": risk_band(score)})
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
    if get_mode() == "sample":   # these come from sample files, so only show them in sample mode
        try:
            events, _ = news_severity.recent_events(key, as_of())
            history = [{"month": m, "price": p} for m, p in load_price_history(key)]
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


# When deployed, FastAPI also serves the built React page (frontend/dist), so the
# whole app is ONE service at ONE address. This line must stay LAST: the API
# routes above are matched first, and everything else falls through to the page.
FRONTEND_BUILD = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")
