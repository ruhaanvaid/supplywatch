import { filterAndSortFoods, SORTS } from "./filterAndSortFoods";
import { RISK_LEVELS } from "./riskLevels";

// Search box + risk chips + sort menu above the food cards.
// Each chip's count = how many foods you'd see if you picked it (it follows the search).
// aria-pressed tells screen readers which chip is on.
export default function FoodFilters({ items, view, setView }) {
  const chips = [{ id: "all", label: "All", shape: null, className: "" }, ...Object.values(RISK_LEVELS)];
  const countFor = (risk) => filterAndSortFoods(items, view.q, risk, view.sort).length;

  return (
    <div className="filters">
      <div className="filters-row">
        <label className="search">
          Search any food
          <input type="search" value={view.q} placeholder="e.g. milk, beef, rice"
                 onChange={(e) => setView({ q: e.target.value })} />
        </label>
        <label className="sort">
          Sort by
          <select value={view.sort} onChange={(e) => setView({ sort: e.target.value })}>
            {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label="Show risk level">
        {chips.map((chip) => (
          <button key={chip.id} type="button" aria-pressed={view.risk === chip.id}
                  className={`chip ${chip.className}${view.risk === chip.id ? " active" : ""}`}
                  onClick={() => setView({ risk: chip.id })}>
            {chip.shape && <span aria-hidden="true">{chip.shape}</span>} {chip.label} ({countFor(chip.id)})
          </button>
        ))}
      </div>
    </div>
  );
}
