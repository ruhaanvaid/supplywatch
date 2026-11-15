"""Tests for major price moves: the "major" rule, and the AI's strict evidence rules.

The AI is replaced with a fake, so these tests never call an API.
"""
import json

import price_moves
from price_moves import find_major_moves, validate

EVIDENCE = [{"id": "news-1", "kind": "News", "label": "2026-09-08: Avian flu at egg farms", "url": None}]
MOVE = {"month": "2026-09", "from_price": 3.20, "to_price": 3.70, "change": 0.156}


def months(prices, start=1):
    return [(f"2026-{start + i:02d}", p) for i, p in enumerate(prices)]


def test_steady_food_uses_3_percent_floor():
    # Ten +0.5% months, then one +3.5% jump. 2x typical is under 3%, so the 3% floor decides.
    prices = [1.0, 1.005, 1.01, 1.0151, 1.0202, 1.0253, 1.0304, 1.0356, 1.0408, 1.046, 1.0512, 1.088]
    result = find_major_moves(months(prices))
    assert [m["month"] for m in result["moves"]] == ["2026-12"]
    assert result["threshold"] == 0.03


def test_jumpy_food_needs_a_bigger_jump():
    # Swings of +-10% are normal here, so a 10% move is NOT major.
    result = find_major_moves(months([1.0, 1.1, 0.99, 1.089, 0.98]))
    assert result["moves"] == []
    assert result["threshold"] > 0.10


def test_when_everything_swings_nothing_stands_out():
    assert find_major_moves(months([1, 2, 1, 2, 1, 2, 1, 2]))["moves"] == []


def test_at_most_5_moves_newest_first():
    # With the "2x typical" part switched off, all 11 swings count, but only 5 are kept.
    config = {**price_moves.MAJOR_MOVES, "typical_multiple": 0}
    moves = find_major_moves(months([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]), config)["moves"]
    assert len(moves) == 5
    assert [m["month"] for m in moves] == sorted((m["month"] for m in moves), reverse=True)


def test_gaps_and_short_history():
    assert find_major_moves(months([1.0, 2.0]))["moves"] == []                   # too little history
    gap = [("2026-01", 1.0), ("2026-02", 1.0), ("2026-05", 2.0), ("2026-06", 2.0), ("2026-07", 2.0)]
    assert all(m["month"] != "2026-05" for m in find_major_moves(gap)["moves"])  # Feb->May isn't month-over-month


def answer(**changes):
    base = {"explanation": "The rise coincided with avian flu reports at egg farms.",
            "evidence_ids": ["news-1"], "confidence": "medium"}
    return json.dumps({**base, **changes})


def test_validate_accepts_a_good_answer():
    assert validate(answer(), EVIDENCE)["evidence_ids"] == ["news-1"]


def test_validate_rejects_rule_breakers():
    assert validate("not json", EVIDENCE) is None
    assert validate(answer(explanation="Prices rose because of avian flu."), EVIDENCE) is None   # "because"
    assert validate(answer(explanation="It was caused by flu."), EVIDENCE) is None              # "caused by"
    assert validate(answer(evidence_ids=["news-99"]), EVIDENCE) is None                         # made-up evidence
    assert validate(answer(evidence_ids=[]), EVIDENCE) is None                                  # claim with no evidence
    assert validate(answer(confidence="certain"), EVIDENCE) is None
    assert validate(answer(explanation="One. Two. Three."), EVIDENCE) is None                   # 3 sentences
    assert validate(answer(explanation="It coincided with flu reports (news-1)."), EVIDENCE) is None  # raw id in text
    assert validate(answer(explanation=price_moves.NO_CAUSE, evidence_ids=[]), EVIDENCE) is not None
    # "No clear cause" with a lead-in is fine, and is shown as just the standard sentence.
    lead_in = validate(answer(explanation=f"Eggs rose this month. {price_moves.NO_CAUSE}", evidence_ids=[]), EVIDENCE)
    assert lead_in["text"] == price_moves.NO_CAUSE


def test_no_evidence_never_asks_the_ai(monkeypatch):
    monkeypatch.setattr(price_moves, "ask_llm", lambda *a: (_ for _ in ()).throw(AssertionError("asked!")))
    result = price_moves.explain_move("Eggs", "test/eggs/2026-09", MOVE, [])
    assert result["text"] == "Price rose 15.6% this month. No clear cause found in our data."


def test_ai_answer_is_cached_and_bad_answers_fall_back(monkeypatch, tmp_path):
    monkeypatch.setattr(price_moves, "CACHE_FILE", tmp_path / "cache.json")
    monkeypatch.setattr(price_moves, "has_key", lambda: True)
    monkeypatch.setattr(price_moves, "ask_llm", lambda *a: answer(explanation="Prices rose due to flu."))
    bad = price_moves.explain_move("Eggs", "test/eggs/2026-09", MOVE, EVIDENCE)
    assert bad["source"] == "automatic summary (no AI used)"            # broke a rule -> template

    monkeypatch.setattr(price_moves, "ask_llm", lambda *a: answer())
    good = price_moves.explain_move("Eggs", "test/eggs/2026-09", MOVE, EVIDENCE)
    assert good["source"].startswith("live output")
    monkeypatch.setattr(price_moves, "has_key", lambda: False)          # no key: the saved answer is used
    assert price_moves.explain_move("Eggs", "test/eggs/2026-09", MOVE, EVIDENCE)["text"] == good["text"]
