"""Tests for risk.py: the formula, the missing-data rule, and the color bands."""
import pytest

from risk import WEIGHTS, compute_risk, risk_band

ALL = ["price_spike", "news_severity", "port_delay", "weather_stress"]


def test_weights_add_up_to_one():
    assert sum(WEIGHTS.values()) == pytest.approx(1.0)


def test_all_max_is_100_and_all_zero_is_0():
    assert compute_risk({name: 1.0 for name in ALL}) == 100
    assert compute_risk({name: 0.0 for name in ALL}) == 0


def test_formula_matches_hand_calculation():
    signals = {"price_spike": 0.8, "news_severity": 0.5, "port_delay": 0.2, "weather_stress": 0.0}
    # 100 * (0.35*0.8 + 0.30*0.5 + 0.20*0.2 + 0.15*0.0) = 100 * 0.47 = 47
    assert compute_risk(signals) == 47


def test_missing_signal_is_excluded_and_weights_renormalized():
    signals = {"price_spike": 1.0, "news_severity": None, "port_delay": 0.0, "weather_stress": 0.0}
    # Without news: 0.35*1.0 / (0.35 + 0.20 + 0.15) = 0.35 / 0.70 = 50
    assert compute_risk(signals) == 50


def test_zero_is_not_the_same_as_missing():
    with_zero = {"price_spike": 1.0, "news_severity": 0.0, "port_delay": 0.0, "weather_stress": 0.0}
    assert compute_risk(with_zero) == 35   # a real 0 pulls the score down


def test_no_signals_gives_no_score():
    assert compute_risk({name: None for name in ALL}) is None


def test_too_little_coverage_gives_no_score():
    # Only port (weight 0.20) is known: below the 0.5 minimum, so no score.
    signals = {"price_spike": None, "news_severity": None, "port_delay": 0.0, "weather_stress": None}
    assert compute_risk(signals) is None


@pytest.mark.parametrize("score, band", [
    (0, "green"), (33, "green"), (34, "yellow"), (66, "yellow"),
    (67, "red"), (100, "red"), (None, "grey"),
])
def test_band_edges(score, band):
    assert risk_band(score) == band
