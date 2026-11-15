"""SupplyWatch API: four read-only endpoints for the one-page frontend.

Run from the backend folder:  .venv/bin/uvicorn main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

import auth
import backtest
import verify
import password_reset
import past
from connectors import news_severity
from connectors.common import MODE_OVERRIDE, current_as_of, get_mode, load_items
from connectors.price_spike import load_price_history, vs_average
from llm_explain import explain
from llm_client import model_label
from price_moves import price_moves_report
from risk import WEIGHTS, compute_risk, points_by_signal, risk_band
from signals import get_all_signals
from suppliers import alternates_for, substitutes_for

app = FastAPI(title="SupplyWatch")
app.include_router(auth.router)     # /api/signup, /api/login, /api/logout, /api/me
app.include_router(verify.router)   # /api/verify (the email link), /api/resend-verification
app.include_router(password_reset.router)   # /api/forgot-password, /api/reset-password


def is_demo(request):
    return request.query_params.get("demo") == "1"


@app.middleware("http")
async def demo_mode(request: Request, call_next):
    """?demo=1 on any request = use the SAMPLE scenario data for that request only."""
    token = MODE_OVERRIDE.set("sample" if is_demo(request) else None)
    try:
        return await call_next(request)
    finally:
        MODE_OVERRIDE.reset(token)


def login_or_demo(request: Request):
    """Guard for the data endpoints: you need to be logged in, or be using the demo."""
    if not is_demo(request) and auth.current_user(request) is None:
        raise HTTPException(401, "Log in, or add ?demo=1 to use the demo.")


def as_of():
    """Sample: a fixed demo date. Live: the day the real data was last refreshed."""
    return current_as_of()


def score_item(item):
    signals = get_all_signals(item, as_of())
    score = compute_risk({name: s["value"] for name, s in signals.items()})
    return signals, score


def price_trend(item):
    """'up', 'down' or 'steady': the latest price vs its 6-month average, the SAME
    comparison the price signal uses (so the card's arrow always agrees with the
    score). Within 1% counts as steady. None if there's not enough price data."""
    try:
        compared = vs_average(load_price_history(item), as_of().strftime("%Y-%m"))
    except OSError:
        return None
    if compared is None:
        return None
    change = compared[3]
    return "up" if change > 0.01 else "down" if change < -0.01 else "steady"


def recent_prices(item, months=12):
    """The last 12 monthly prices up to the as-of date, for the dashboard's small price lines.
    Read-only: the same numbers the price chart shows. They play no part in the score."""
    try:
        history = load_price_history(item)
    except OSError:
        return []
    last = as_of().strftime("%Y-%m")
    return [{"month": m, "price": p} for m, p in history if m <= last][-months:]


@app.get("/api/status")
def status():
    sample = get_mode() == "sample"
    return {
        "mode": get_mode(),
        "demo": MODE_OVERRIDE.get() == "sample",
        "label": ("Using SAMPLE data (synthetic, for demo)" if sample
                  else "Using LIVE data: real prices (BLS), drought (U.S. Drought Monitor) and news (GDELT)"),
        "as_of": as_of().isoformat(),
        "llm": model_label() if model_label() else "cached outputs only (no API key)",
    }


@app.get("/api/items", dependencies=[Depends(login_or_demo)])
def list_items():
    """Every tracked food with its score and color. The page shows only the
    unusual ones (yellow/red) up front, and searches the rest."""
    results = []
    for key, info in load_items().items():
        signals, score = score_item(key)
        results.append({"key": key, "name": info["name"], "emoji": info.get("emoji", ""),
                        "category": info["category"], "score": score, "band": risk_band(score),
                        # points each signal adds, so every card can show how the score was made
                        "points": points_by_signal({name: s["value"] for name, s in signals.items()}),
                        "price_trend": price_trend(key), "price_label": info.get("price_label"),
                        "recent_prices": recent_prices(key)})
    return results


@app.get("/api/items/{key}", dependencies=[Depends(login_or_demo)])
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
        "key": key, "name": info["name"], "emoji": info.get("emoji", ""), "unit": info["unit"], "price_label": info.get("price_label"),
        "score": score, "band": band, "weights": WEIGHTS, "signals": signals,
        "points": points_by_signal({name: s["value"] for name, s in signals.items()}),
        "headlines": events,
        "explanation": explain(info["name"], score, band, signals, events),
        "price_history": history,
        # Big month-to-month price moves, each with the evidence we have (see price_moves.py).
        "price_moves": price_moves_report(key, [(h["month"], h["price"]) for h in history]),
        "price_source": ("Monthly national average prices (U.S. Bureau of Labor Statistics)" if get_mode() == "live"
                         else "Sample prices made up for the demo (not real data)"),
        "suppliers": alternates_for(key),
        "substitutes": substitutes_for(key),
    }


@app.get("/api/backtest")
def get_backtest():
    return backtest.run_backtest()


@app.get("/api/past", dependencies=[Depends(login_or_demo)])
def get_past():
    """Real past US food shortages, each with sources and real prices around it."""
    return {"events": past.past_shortages()}


# When deployed, FastAPI also serves the built React page (frontend/dist), so the
# whole app is ONE service at ONE address. These routes must stay LAST, so the
# /api routes above are matched first.
FRONTEND_BUILD = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_BUILD / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def page(path: str, request: Request):
        """Every page address (/, /login, /signup, /app, typos) gets the same React page,
        and React Router shows the right screen (or its friendly 404).
        Logged-out visitors asking for /app (without ?demo=1) are sent to /login first."""
        if path.startswith("api/"):          # a mistyped API address is an API error, not a page
            raise HTTPException(404, "Unknown API address.")
        if path == "app" and not is_demo(request) and auth.current_user(request) is None:
            return RedirectResponse("/login")
        known = path in ("", "login", "signup", "app", "forgot-password", "reset-password")   # anything else: React shows "Page not found"
        return FileResponse(FRONTEND_BUILD / "index.html", status_code=200 if known else 404)
