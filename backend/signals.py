"""Run all four signal connectors for one item.

Used by both main.py (the live app) and backtest.py (the replay), so both
score items in exactly the same way.
"""
from connectors import news_severity, port_delay, price_spike, weather_stress

# Name -> module. Every module has the same get_signal(item, as_of_date, data_dir).
CONNECTORS = {
    "price_spike": price_spike,
    "news_severity": news_severity,
    "port_delay": port_delay,
    "weather_stress": weather_stress,
}


def get_all_signals(item, as_of_date, data_dir=None):
    """Returns {name: {value, raw, note}} for all four signals.
    data_dir=None: each connector uses the current mode's folder (live or sample)."""
    return {name: module.get_signal(item, as_of_date, data_dir)
            for name, module in CONNECTORS.items()}
