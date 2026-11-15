import { useState } from "react";
import FoodCard from "./FoodCard";
import FoodIcon from "./FoodIcon";

// One collapsible section (e.g. "Produce · 7") holding that group's foods.
// The header is a real button with aria-expanded, so keyboard and screen reader
// users can open and close it too. Sections start open: nothing is hidden by surprise.
export default function FoodGroup({ group, foods, layout, selectedKey, onSelect }) {
  const [open, setOpen] = useState(true);
  const raised = foods.filter((food) => food.band === "red" || food.band === "yellow").length;
  const panelId = `group-${group.id}`;

  return (
    <section className="food-group">
      <h3 className="food-group-title">
        <button type="button" className="food-group-toggle" aria-expanded={open} aria-controls={panelId}
                onClick={() => setOpen(!open)}>
          <span className="chevron" aria-hidden="true">›</span>
          <FoodIcon group={group.id} />
          {group.label}
          <span className="num group-count">{foods.length}</span>
          {/* Only mention risk when there is some, so calm groups stay quiet. */}
          {raised > 0 && <span className="group-flag">{raised} need{raised === 1 ? "s" : ""} attention</span>}
        </button>
      </h3>
      {open && (
        <div id={panelId} className={`food-list ${layout}`}>
          {foods.map((food) => (
            <FoodCard key={food.key} item={food} variant={layout} selected={food.key === selectedKey} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}
