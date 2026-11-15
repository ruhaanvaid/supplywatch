import { filterAndSortFoods, SORTS } from "./filterAndSortFoods";
import { RISK_LEVELS } from "./riskLevels";

// One tidy row of controls above the food groups: search, sort, risk chips and
// the Grid / List switch. It wraps onto more lines on a phone.
// Each chip's count = how many foods you'd see if you picked it (it follows the search).
// aria-pressed tells screen readers which chip and which view are on.
export default function Controls({ items, view, setView, layout, setLayout }) {
  const chips = [{ id: "all", label: "All", shape: null, className: "" }, ...Object.values(RISK_LEVELS)];
  const countFor = (risk) => filterAndSortFoods(items, view.q, risk, view.sort).length;

  return (
    <div className="controls" role="search">
      <label className="control-field search">
        <span className="control-label">Search any food</span>
        <input type="search" value={view.q} placeholder="e.g. milk, beef, rice"
               onChange={(e) => setView({ q: e.target.value })} />
      </label>
      <label className="control-field sort">
        <span className="control-label">Sort by</span>
        <select value={view.sort} onChange={(e) => setView({ sort: e.target.value })}>
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <div className="filter-chips" role="group" aria-label="Show risk level">
        {chips.map((chip) => (
          <button key={chip.id} type="button" aria-pressed={view.risk === chip.id}
                  className={`filter-chip ${chip.className}${view.risk === chip.id ? " active" : ""}`}
                  onClick={() => setView({ risk: chip.id })}>
            {chip.shape && <span aria-hidden="true">{chip.shape}</span>} {chip.label}{" "}
            <span className="num">({countFor(chip.id)})</span>
          </button>
        ))}
      </div>

      <div className="layout-toggle" role="group" aria-label="Show foods as">
        {["grid", "list"].map((option) => (
          <button key={option} type="button" aria-pressed={layout === option}
                  className={layout === option ? "active" : ""} onClick={() => setLayout(option)}>
            {option === "grid" ? "Grid" : "List"}
          </button>
        ))}
      </div>
    </div>
  );
}
