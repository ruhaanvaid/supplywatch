"""Major price moves: find the big month-to-month price jumps for one food, and
explain each one using ONLY evidence the app already has.

Shown under the price chart in the detail panel. This file only READS data:
it never changes the risk score, its formula, or the connectors.

  find_major_moves(prices, config)  -> which months were big jumps
  gather_evidence(food, month)      -> what we have on file around that month
  explain_move(...)                 -> 1-2 sentences (AI, cached, or a template)
"""
import csv
import hashlib
import json
import re
import statistics

from connectors.common import DATA_DIR, get_mode, load_items, mode_data_dir, month_name, scale_to_unit
from connectors.news_severity import MIN_CONFIDENCE
from connectors.port_delay import NORMAL_SHIPS, SEVERE_SHIPS, scale_pressure
from connectors.weather_stress import DROUGHT_NAMES
from llm_client import ask_llm, has_key, model_label
from llm_extract import extract_event

# ============================================================================
# CONFIG: the only place these numbers live. Change them here.
#
# A month is a MAJOR move if its % change from the month before (ignoring + or -)
# is at least   max(MIN_CHANGE, TYPICAL_MULTIPLE x this food's typical change)
# where "typical change" = the standard deviation of the food's monthly % changes.
# So a jumpy food (like eggs) needs a bigger jump to count than a steady one
# (like rice), and nothing under 3% ever counts.
# ============================================================================
MAJOR_MOVES = {
    "min_change": 0.03,        # 3%: the floor; smaller moves are never "major"
    "typical_multiple": 2,     # must be at least 2x this food's normal month-to-month wobble
    "max_moves": 5,            # show only the 5 biggest, so the chart never gets cluttered
    "min_changes_needed": 3,   # need 3+ monthly changes before "typical" means anything
}

# Evidence that counts for a move in month M (we look at M and the month before ONLY).
EVIDENCE = {
    "drought_classes": ["D1", "D2", "D3", "D4"],   # moderate drought or worse (D0 = just "abnormally dry")
    "min_port_pressure": 0.25,                     # shipping strain at least 25% of the way to "severe"
}


def previous_month(month):
    """'2026-01' -> '2025-12'."""
    year, mon = int(month[:4]), int(month[5:7])
    return f"{year - 1}-12" if mon == 1 else f"{year}-{mon - 1:02d}"


def find_major_moves(prices, config=MAJOR_MOVES):
    """prices: [(month, price), ...] oldest first, e.g. [("2026-08", 3.20), ("2026-09", 3.70)].

    Returns {"moves": [...newest first...], "typical": 0.04, "threshold": 0.08}.
    Each move: {"month", "from_price", "to_price", "change"} (change 0.156 = +15.6%).
    """
    # 1. Month-over-month % change. Only compare months that are next to each other.
    changes = []
    for (last_month, last_price), (month, price) in zip(prices, prices[1:]):
        if previous_month(month) == last_month and last_price > 0:
            changes.append({"month": month, "from_price": last_price, "to_price": price,
                            "change": (price - last_price) / last_price})
    if len(changes) < config["min_changes_needed"]:
        return {"moves": [], "typical": None, "threshold": None}   # too little history

    # 2. "Typical" change for THIS food = standard deviation of its monthly changes.
    typical = statistics.stdev(c["change"] for c in changes)
    # 3. The bar a move has to clear (in either direction).
    threshold = max(config["min_change"], config["typical_multiple"] * typical)
    major = [c for c in changes if abs(c["change"]) >= threshold]

    # 4. Keep only the biggest few, then list them newest first.
    biggest = sorted(major, key=lambda c: abs(c["change"]), reverse=True)[:config["max_moves"]]
    return {"moves": sorted(biggest, key=lambda c: c["month"], reverse=True),
            "typical": typical, "threshold": threshold}


def read_rows(filename):
    """Rows of a CSV in the current mode's data folder ([] if the file is missing)."""
    try:
        with open(mode_data_dir() / filename) as f:
            return list(csv.DictReader(f))
    except OSError:
        return []


def gather_evidence(food, month):
    """Everything we have on file for this food in `month` and the month before.

    Returns a list of evidence items: {"id", "kind", "label", "url"}.
    An empty list means we have nothing, and the page says "No clear cause found in our data."
    """
    window = {previous_month(month), month}
    info = load_items()[food]
    evidence = []

    # 1. News headlines (GDELT) the AI tagged as about THIS food, same rule as the news signal.
    for n, row in enumerate(read_rows("headlines.csv")):
        event = extract_event(row["headline"]) if row["date"][:7] in window else None
        if event and event["item"] == food and event["confidence"] >= MIN_CONFIDENCE:
            evidence.append({"id": f"news-{n}", "kind": "News", "url": row.get("source_url") or None,
                             "label": f"{row['date']}: {row['headline']}"})

    # 2. Drought (U.S. Drought Monitor) in the food's main U.S. growing area, moderate or worse.
    region = info.get("growing_region") if not info.get("grown_abroad") else None
    for row in read_rows("weather.csv"):
        if row["region"] == region and row["month"] in window and row["drought_class"] in EVIDENCE["drought_classes"]:
            evidence.append({"id": f"drought-{row['month']}", "kind": "Drought", "url": None,
                             "label": f"{month_name(row['month'])}: {DROUGHT_NAMES[row['drought_class']]} in {region}"})

    # 3. Port / shipping strain, only for foods that are mostly imported.
    if info.get("import_exposed"):
        for month_seen, strain, text in port_strain(window):
            if strain >= EVIDENCE["min_port_pressure"]:
                evidence.append({"id": f"port-{month_seen}", "kind": "Shipping", "url": None,
                                 "label": f"{month_name(month_seen)}: {text}"})
    return evidence


def port_strain(window):
    """(month, 0-1 strain, description) for each month in the window, scaled exactly like the port signal."""
    if get_mode() == "live":   # live: NY Fed supply chain pressure index
        return [(r["month"], scale_pressure(float(r["gscpi"])), f"global shipping strain index {float(r['gscpi']):+.2f} (NY Fed)")
                for r in read_rows("supply_pressure.csv") if r["month"] in window]
    return [(r["month"], scale_to_unit(int(r["ships_waiting"]), NORMAL_SHIPS, SEVERE_SHIPS),   # sample: ships waiting
             f"{r['ships_waiting']} container ships waiting at Los Angeles/Long Beach")
            for r in read_rows("port_congestion.csv") if r["month"] in window]


# ---------------------------------------------------------------------------
# Explanations: the AI may ONLY reword the evidence we give it.
# ---------------------------------------------------------------------------
CACHE_FILE = DATA_DIR / "ai_cache" / "price_moves.json"   # saved by mode/food/month
NO_CAUSE = "No clear cause found in our data."
BANNED = ("caused by", "because", "due to", "led to", "result of", "resulted", "drove", "driven by")

SYSTEM = f"""You write 1-2 short, plain sentences about one monthly food price change,
for food bank staff. Use ONLY the evidence listed in the input. Do NOT use general
knowledge, and do not add any cause, number, place or date that is not in the input.
Link the price change to evidence only with "may be related to" or "coincided with".
Never write "caused by", "because", "due to", "led to" or "drove".
Mention only the evidence you rely on; skip the rest without commenting on it.
Do not write evidence ids, prices or percentages in the sentences (the page already shows them).
If none of the evidence is clearly about this food's supply, set explanation to
exactly "{NO_CAUSE}", evidence_ids to [] and confidence to "low".
evidence_ids = the ids of the evidence you mention. confidence = how clearly the
evidence is about this food's supply in that period (low, medium or high)."""

SCHEMA = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string"},
        "evidence_ids": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
    },
    "required": ["explanation", "evidence_ids", "confidence"],
    "additionalProperties": False,
}


def change_sentence(move):
    """'Price rose 15.6% this month.' (used by the no-AI template)."""
    return f"Price {'rose' if move['change'] > 0 else 'fell'} {abs(move['change']):.1%} this month."


def validate(reply, evidence):
    """Accept the AI's answer only if it follows every rule; otherwise return None."""
    try:
        data = json.loads(reply)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, dict) or set(data) != {"explanation", "evidence_ids", "confidence"}:
        return None
    text, ids = data["explanation"], data["evidence_ids"]
    allowed = {e["id"] for e in evidence}
    if not isinstance(text, str) or not text.strip() or len(text) > 400 or len(re.findall(r"[.!?](\s|$)", text)) > 2:
        return None                                    # empty, too long, or more than 2 sentences
    if any(word in text.lower() for word in BANNED):   # "caused by" etc. is never allowed
        return None
    if not isinstance(ids, list) or not set(ids) <= allowed or data["confidence"] not in ("low", "medium", "high"):
        return None                                    # it may only cite evidence we gave it
    if any(e["id"] in text for e in evidence):         # raw ids like "news-3" don't belong in a sentence
        return None
    if not ids:                                        # citing nothing = it must say "no clear cause"
        return {"text": NO_CAUSE, "evidence_ids": [], "confidence": "low"} if NO_CAUSE in text else None
    return {"text": text.strip(), "evidence_ids": ids, "confidence": data["confidence"]}


def with_change(answer, move):
    """'No clear cause found in our data.' -> 'Price rose 19.2% this month. No clear cause found in our data.'"""
    return {**answer, "text": f"{change_sentence(move)} {NO_CAUSE}"} if answer["text"] == NO_CAUSE else answer


def explain_move(food_name, cache_key, move, evidence):
    """Returns {"text", "evidence_ids", "confidence", "source"}."""
    if not evidence:   # nothing on file: say so; the AI is not even asked
        return {"text": f"{change_sentence(move)} {NO_CAUSE}", "evidence_ids": [], "confidence": None,
                "source": "no evidence in our data"}
    ids = sorted(e["id"] for e in evidence)
    cache = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}
    saved = cache.get(cache_key)
    prompt_id = hashlib.sha256(SYSTEM.encode()).hexdigest()[:8]   # changes whenever the rules change
    if saved and saved["evidence_given"] == ids and saved.get("prompt") == prompt_id:   # same evidence AND same rules
        return {**with_change(saved["answer"], move), "source": f"saved output from {saved['model']}"}
    if has_key():
        facts = "\n".join([f"Food: {food_name}", f"Month: {month_name(move['month'])}",
                           f"Price change: {move['change']:+.1%} (from {move['from_price']:.2f} to {move['to_price']:.2f})",
                           "Evidence (id: description):"] + [f"- {e['id']}: [{e['kind']}] {e['label']}" for e in evidence])
        try:
            answer = validate(ask_llm(SYSTEM, facts, SCHEMA), evidence)
        except Exception as error:   # network/API problem: fall back below, don't crash
            print(f"Price move explanation failed for {cache_key}: {type(error).__name__}")
            answer = None
        if answer:
            cache[cache_key] = {"answer": answer, "evidence_given": ids, "prompt": prompt_id, "model": model_label()}
            CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))
            return {**with_change(answer, move), "source": f"live output from {model_label()}"}
    # No AI available (or its answer broke a rule): a plain template that claims nothing.
    return {"text": f"{change_sentence(move)} Our data shows the items below for the same period; "
                    f"we can't tell if they are connected.", "evidence_ids": ids, "confidence": None,
            "source": "automatic summary (no AI used)"}


def price_moves_report(food, prices):
    """Everything the chart and the 'Major price moves' list need for one food."""
    found = find_major_moves(prices)
    name = load_items()[food]["name"]
    moves = []
    for move in found["moves"]:
        evidence = gather_evidence(food, move["month"])
        explanation = explain_move(name, f"{get_mode()}/{food}/{move['month']}", move, evidence)
        moves.append({**move, "month_name": month_name(move["month"]), "evidence": evidence, "explanation": explanation})
    return {"moves": moves, "typical": found["typical"], "threshold": found["threshold"]}


if __name__ == "__main__":
    # Fill the saved-answers file for every food in both modes (needs an API key).
    #   .venv/bin/python price_moves.py
    from connectors.common import MODE_OVERRIDE, current_as_of
    from connectors.price_spike import load_price_history
    for mode in ("sample", "live"):
        MODE_OVERRIDE.set(mode)
        last = current_as_of().strftime("%Y-%m")
        for key in load_items():
            report = price_moves_report(key, [(m, p) for m, p in load_price_history(key) if m <= last])
            for move in report["moves"]:
                print(f"{mode:6} {key:16} {move['month']} {move['change']:+.1%}  {move['explanation']['source']}")
