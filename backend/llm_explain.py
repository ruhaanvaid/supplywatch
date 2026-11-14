"""LLM task 2: explain a risk score in 2-3 plain-English sentences.

The LLM only rewords facts we hand it. It never computes the score.
Outputs are cached by their exact input, so the same facts always give the
same text. With no API key and no cached text, we fall back to a simple
fill-in-the-blanks summary that is clearly labeled "no AI".
"""
import hashlib
import json

from connectors.common import SAMPLE_DIR
from llm_client import ask_llm, has_key, model_label
from risk import WEIGHTS

CACHE_FILE = SAMPLE_DIR / "llm_cache_explanations.json"

SYSTEM = """You explain a food-supply risk score to food bank staff in 2-3 short,
plain-English sentences.
Use ONLY the facts given. Do NOT add any number, cause, place, date or
prediction that is not in the input. If a signal is "not available", say so
instead of guessing. Start with the signals that ADD THE MOST POINTS to the
score (not the ones with the highest 0-1 value, because signals have different weights)."""


def build_facts(item_name, score, band, signals, events):
    """Write the inputs as plain text. This exact text is what the LLM sees.

    We include how many points each signal adds, so the model can't mistake
    a high-value but low-weight signal for the main driver.
    """
    weight_used = sum(WEIGHTS[n] for n, r in signals.items() if r["value"] is not None)
    lines = [f"Item: {item_name}", f"Risk score: {score}/100 ({band})", "Signals (0 = calm, 1 = max):"]
    for name, result in signals.items():
        if result["value"] is None:
            lines.append(f"- {name}: not available (left out). {result['note']}")
            continue
        points = round(100 * WEIGHTS[name] * result["value"] / weight_used) if weight_used else 0
        lines.append(f"- {name}: {result['value']}, adds {points} points. {result['note']}")
    lines.append("Headlines used:" if events else "Headlines used: none")
    for event in events[:3]:
        lines.append(f"- {event['date']}: {event['headline']} (severity {event['severity']}/5)")
    return "\n".join(lines)


def template_explanation(item_name, score, band, signals):
    """No-AI fallback: name the two signals that add the most to the score."""
    if score is None:
        return f"{item_name}: not enough data available to give a score."
    known = [(WEIGHTS[n] * r["value"], n, r) for n, r in signals.items() if r["value"] is not None]
    top = sorted(known, key=lambda entry: entry[0], reverse=True)[:2]
    parts = [f"{name.replace('_', ' ')}: {result['note']}" for _, name, result in top]
    return f"{item_name} scores {score}/100 ({band}). Biggest contributors are " + " | ".join(parts)


def explain(item_name, score, band, signals, events):
    """Returns {"text": ..., "source": ...} so the UI can show where the text came from."""
    facts = build_facts(item_name, score, band, signals, events)
    key = hashlib.sha256(facts.encode()).hexdigest()[:16]   # short fingerprint of the facts
    cache = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}
    if key in cache:
        return {"text": cache[key]["text"], "source": f"saved output from {cache[key]['model']}"}
    if score is not None and has_key():
        try:
            text = ask_llm(SYSTEM, facts)
        except Exception as error:   # network or API problem: fall back, don't crash
            print(f"Explanation failed for {item_name}: {error}")
            text = None
        if text:
            cache[key] = {"text": text, "model": model_label()}
            CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))
            return {"text": text, "source": f"live output from {model_label()}"}
    return {"text": template_explanation(item_name, score, band, signals),
            "source": "automatic summary (no AI used)"}
