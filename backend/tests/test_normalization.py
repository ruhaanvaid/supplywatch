"""Tests for how raw numbers become 0-1 signals."""
import pytest

from connectors.common import scale_to_unit
from connectors.port_delay import scale_pressure
from connectors.price_spike import compute_spike


def test_scale_to_unit_straight_line_and_clamping():
    assert scale_to_unit(0.15, 0, 0.30) == pytest.approx(0.5)
    assert scale_to_unit(0.45, 0, 0.30) == 1.0    # above the top -> clamped
    assert scale_to_unit(-0.10, 0, 0.30) == 0.0   # below the bottom -> clamped


def test_scale_to_unit_rejects_bad_range():
    with pytest.raises(ValueError):
        scale_to_unit(1, 5, 5)


def _history(prices):
    return [(f"2026-{m:02d}", p) for m, p in enumerate(prices, start=1)]


def test_price_spike_flat_prices_give_zero():
    result = compute_spike(_history([2.0] * 7), "2026-07")
    assert result["value"] == 0.0


def test_price_spike_15_percent_jump_gives_half():
    result = compute_spike(_history([2.0] * 6 + [2.3]), "2026-07")
    assert result["value"] == pytest.approx(0.5)
    assert result["raw"] == 2.3


def test_price_index_is_never_labeled_as_dollars():
    result = compute_spike(_history([200.0] * 6 + [230.0]), "2026-07", is_index=True)
    assert result["value"] == pytest.approx(0.5)   # +15%, same math as a dollar price
    assert "$" not in result["note"] and "index 230.0" in result["note"]


def test_price_spike_ignores_future_months():
    # Month 8 has a huge spike, but we ask "as of month 7", so it must be ignored.
    result = compute_spike(_history([2.0] * 7 + [9.0]), "2026-07")
    assert result["value"] == 0.0


def test_price_spike_too_little_history_is_none():
    result = compute_spike(_history([2.0] * 3), "2026-03")
    assert result["value"] is None


def test_supply_pressure_scaling():
    assert scale_pressure(-0.5) == 0.0                  # calmer than normal -> 0
    assert scale_pressure(1.5) == pytest.approx(0.5)    # halfway to +3 -> 0.5
    assert scale_pressure(4.4) == 1.0                   # the Dec 2021 peak -> clamped to 1
