"""Suggest alternate suppliers and substitute products for an item.

This is a plain filter, with no scoring or AI: a supplier qualifies if it
sells the item's category (grains, protein, ...). Fastest delivery first.
"""
import json

from connectors.common import DATA_DIR, load_items

MAX_SUGGESTIONS = 4   # a short list is easier to act on than twenty options


def alternates_for(item):
    category = load_items()[item]["category"]
    with open(DATA_DIR / "suppliers.json") as f:
        suppliers = json.load(f)["suppliers"]
    matches = [s for s in suppliers if category in s["categories"]]
    matches.sort(key=lambda s: s["lead_time_days"])
    return matches[:MAX_SUGGESTIONS]


def substitutes_for(item):
    return load_items()[item]["substitutes"]
