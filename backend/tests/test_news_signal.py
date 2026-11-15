"""Tests for the news signal's trickiest rule: quiet news = 0, unreadable news = None.

We replace the LLM extraction with a fixed lookup table, so these tests never
call the API and don't depend on what is in the cache file.
"""
from datetime import date

import pytest

from connectors import news_severity

AS_OF = date(2026, 10, 31)
FAKE_EVENTS = {
    "Egg farm outbreak": {"item": "eggs", "event_type": "disease_outbreak", "severity": 4, "confidence": 0.9},
    "Egg purchase limits": {"item": "eggs", "event_type": "price_or_market", "severity": 5, "confidence": 0.9},
    "Unsure egg rumor": {"item": "eggs", "event_type": "other", "severity": 5, "confidence": 0.3},
    "Peanut crop normal": {"item": "peanut_butter", "event_type": "other", "severity": 1, "confidence": 0.8},
}


def run(tmp_path, monkeypatch, rows, item="eggs"):
    """Write a small headlines.csv, then compute the news signal from it."""
    (tmp_path / "headlines.csv").write_text("date,headline\n" + "".join(f"{d},{h}\n" for d, h in rows))
    monkeypatch.setattr(news_severity, "extract_event", lambda headline: FAKE_EVENTS.get(headline))
    return news_severity.get_signal(item, AS_OF, tmp_path)


def test_average_severity_is_scaled(tmp_path, monkeypatch):
    result = run(tmp_path, monkeypatch, [("2026-10-10", "Egg farm outbreak"), ("2026-10-20", "Egg purchase limits")])
    assert result["value"] == pytest.approx(0.875)   # average 4.5 -> (4.5 - 1) / 4


def test_no_relevant_news_is_zero_not_none(tmp_path, monkeypatch):
    result = run(tmp_path, monkeypatch, [("2026-10-10", "Peanut crop normal")])
    assert result["value"] == 0.0


def test_unanalysable_headline_is_none(tmp_path, monkeypatch):
    result = run(tmp_path, monkeypatch, [("2026-10-10", "Headline with no extraction")])
    assert result["value"] is None


def test_old_and_future_headlines_are_ignored(tmp_path, monkeypatch):
    rows = [("2026-09-01", "Egg farm outbreak"), ("2026-11-05", "Egg purchase limits")]
    assert run(tmp_path, monkeypatch, rows)["value"] == 0.0


def test_failed_news_search_is_none_not_zero(tmp_path, monkeypatch):
    # The live refresh couldn't search news for eggs: that's "unknown", not "calm".
    (tmp_path / "refreshed.json").write_text('{"as_of": "2026-10-31", "news_search_failed": ["eggs"]}')
    result = run(tmp_path, monkeypatch, [("2026-10-10", "Peanut crop normal")])
    assert result["value"] is None


def test_low_confidence_headline_is_ignored(tmp_path, monkeypatch):
    result = run(tmp_path, monkeypatch, [("2026-10-10", "Unsure egg rumor")])
    assert result["value"] == 0.0
