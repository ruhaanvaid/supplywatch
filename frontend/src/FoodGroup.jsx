import { useState } from "react";
import FoodRow from "./FoodRow";

// One section of the ledger (e.g. "Produce 7"), with its rows. The heading is a real
// button with aria-expanded, so keyboard and screen reader users can fold it too.
// Sections start open, so nothing is hidden by surprise.
export default function FoodGroup({ group, foods, selectedKey, onSelect }) {
  const [open, setOpen] = useState(true);
  const raised = foods.filter((food) => food.band === "red" || food.band === "yellow").length;
  const panelId = `group-${group.id}`;

  return (
    <section className="food-group">
      <h3 className="group-title">
        <button type="button" className="group-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <span className="chevron" aria-hidden="true">›</span>
          {group.label} <span className="num group-count">{foods.length}</span>
          {/* Only mention risk when there is some, so calm groups stay quiet. */}
          {raised > 0 && <span className="group-flag">{raised} need{raised === 1 ? "s" : ""} attention</span>}
        </button>
      </h3>
      {open && (
        <ul id={panelId} className="ledger">
          {foods.map((food) => <FoodRow key={food.key} item={food} selected={food.key === selectedKey} onSelect={onSelect} />)}
        </ul>
      )}
    </section>
  );
}
