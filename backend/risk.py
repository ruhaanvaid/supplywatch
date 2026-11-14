"""Combine the four 0-1 signals into one 0-100 shortage-risk score.

This file does arithmetic only. No AI is involved in the score.
"""

# ---- WEIGHTS ---------------------------------------------------------------
# These are REASONED STARTING VALUES, NOT FITTED to data. We have too few
# past shortages to fit weights honestly, so each one reflects a judgment:
#   price_spike    0.35  most direct, hardest-to-fake sign that supply is tight
#   news_severity  0.30  often early, but noisier (headlines can exaggerate)
#   port_delay     0.20  matters only for imported items, and acts slowly
#   weather_stress 0.15  a cause that takes months to reach store shelves
# They add up to 1.00, so a score of 100 means every signal is at maximum.
WEIGHTS = {
    "price_spike": 0.35,
    "news_severity": 0.30,
    "port_delay": 0.20,
    "weather_stress": 0.15,
}

# If signals carrying less than half of the total weight are available,
# we refuse to score. A "score" built from one small signal would look
# confident while really being a guess.
MIN_WEIGHT_COVERED = 0.5

# Color bands: 0-33 green, 34-66 yellow, 67-100 red.
GREEN_MAX = 33
YELLOW_MAX = 66


def compute_risk(signals):
    """signals: {"price_spike": 0.8, "news_severity": None, ...}

    Signals that are None (source missing or down) are left out, and the
    remaining weights are rescaled so they still add up to 1. Example:
    without news, price counts 0.35 / 0.70 = half of the score.
    Returns an int 0-100, or None if too little data is available
    (less than MIN_WEIGHT_COVERED). We never invent a number.
    """
    available = {name: value for name, value in signals.items() if value is not None}
    weight_used = sum(WEIGHTS[name] for name in available)
    if weight_used < MIN_WEIGHT_COVERED:
        return None
    weighted_sum = sum(WEIGHTS[name] * value for name, value in available.items())
    return round(100 * weighted_sum / weight_used)


def risk_band(score):
    """Map a score to its color. None (no data) gets grey, not green."""
    if score is None:
        return "grey"
    if score <= GREEN_MAX:
        return "green"
    if score <= YELLOW_MAX:
        return "yellow"
    return "red"
