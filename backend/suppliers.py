"""Suggest real places to source a food from, plus substitute products.

A plain filter, with no scoring or AI: a supplier qualifies if it carries the
food's category (grains, dairy, produce, ...). Order: Southern California options
before national ones (a local source is usually faster to reach), then specialists
before generalists (an egg producer before a food bank that carries everything).
We list only verified facts (name, what they offer, area, official website).
We don't show delivery times or prices, because we can't know them.
"""
import json

from connectors.common import DATA_DIR, load_items

MAX_SUGGESTIONS = 4   # a short list is easier to act on than twenty options


def alternates_for(item):
    category = load_items()[item]["category"]
    with open(DATA_DIR / "suppliers.json") as f:
        suppliers = json.load(f)["suppliers"]
    matches = [s for s in suppliers if category in s["categories"]]
    # Python sorts False before True, and small numbers before big ones.
    matches.sort(key=lambda s: (s["area"] == "National", len(s["categories"])))
    return matches[:MAX_SUGGESTIONS]


def substitutes_for(item):
    """[{"name": ..., "why": ...}]: hand-written in data/items.json, no AI."""
    return load_items()[item]["substitutes"]
