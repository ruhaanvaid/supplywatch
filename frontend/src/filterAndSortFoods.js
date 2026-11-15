// Filtering and sorting the food cards. Front end only: scores and risk levels
// come from the server unchanged (the server turns a score into a band with
// risk.py: 0-33 Low, 34-66 Medium, 67-100 High, no score = Not enough data).
import { useSearchParams } from "react-router-dom";
import { levelFor, RISK_LEVELS } from "./riskLevels";

export const SORTS = {
  risk_desc: "Risk: high to low",
  risk_asc: "Risk: low to high",
  name: "Name: A to Z",
};
const RISK_IDS = ["all", ...Object.values(RISK_LEVELS).map((level) => level.id)];

// THE function: which foods to show, and in what order.
//   foods  - every tracked food, each like {name, score, band}
//   search - the text in the search box ("" means no search)
//   risk   - "all", "high", "medium", "low" or "none" (Not enough data)
//   sort   - "risk_desc", "risk_asc" or "name"
export function filterAndSortFoods(foods, search, risk, sort) {
  const text = search.trim().toLowerCase();

  // 1. Keep a food only if its name contains the search text
  //    AND its risk level matches the chosen chip ("all" matches everything).
  const visible = foods.filter((food) =>
    food.name.toLowerCase().includes(text) &&
    (risk === "all" || levelFor(food.band).id === risk));

  // 2. Sort a copy (never change the original list).
  return [...visible].sort((a, b) => {
    // Foods without a score always go last, whichever sort is picked.
    const missing = (a.score == null) - (b.score == null);
    if (missing !== 0) return missing;
    const byName = a.name.localeCompare(b.name);
    if (sort === "name") return byName;
    if (sort === "risk_asc") return a.score - b.score || byName;   // lowest score first
    return b.score - a.score || byName;                           // default: highest first
  });
}

// The current filter, sort and search live in the page address
// (?risk=high&sort=name&q=rice), so a refresh or a shared link shows the same view.
// Default values are left out of the address to keep it short. Other parts of
// the address (like ?demo=1) are kept.
export function useFoodView() {
  const [params, setParams] = useSearchParams();
  const view = {
    q: params.get("q") ?? "",
    risk: RISK_IDS.includes(params.get("risk")) ? params.get("risk") : "all",
    sort: params.get("sort") in SORTS ? params.get("sort") : "risk_desc",
  };
  const defaults = { q: "", risk: "all", sort: "risk_desc" };

  // setView({risk: "high"}) changes just that part of the address.
  const setView = (changes) => setParams((old) => {
    const next = new URLSearchParams(old);
    for (const [name, value] of Object.entries(changes)) {
      if (value === defaults[name]) next.delete(name);
      else next.set(name, value);
    }
    return next;
  }, { replace: true });   // replace: typing doesn't fill the Back button with every letter

  return [view, setView];
}
