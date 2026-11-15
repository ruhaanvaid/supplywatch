import FoodIcon from "./FoodIcon";
import RiskBadge from "./RiskBadge";
import ScoreRing from "./ScoreRing";
import Sparkline from "./Sparkline";
import { groupFor } from "./foodGroups";
import { levelFor } from "./riskLevels";

// The price arrow compares the latest price with its 6-month average (sent by the
// backend): the same comparison the score's price signal uses, so they never disagree.
const TRENDS = {
  up: { arrow: "↑", text: "Price above normal" },
  down: { arrow: "↓", text: "Price below normal" },
  steady: { arrow: "→", text: "Price normal" },
};

// One food, used everywhere a food is shown:
//   variant "grid"      compact card in the food groups
//   variant "list"      one slim row (List view)
//   variant "spotlight" bigger card with a sparkline and a one-line reason
// The landing page shows the same component with sample data, so both pages match.
// With onSelect it's a real <button> (Tab + Enter work, screen readers say "button").
export default function FoodCard({ item, variant = "grid", prices, money = true, reason, selected, onSelect }) {
  const trend = TRENDS[item.price_trend];
  const Tag = onSelect ? "button" : "div";
  const clickable = onSelect ? { type: "button", onClick: () => onSelect(item.key), "aria-pressed": selected } : {};
  return (
    <Tag className={`food-card ${variant} ${levelFor(item.band).className}${selected ? " selected" : ""}${onSelect ? " lift" : ""}`}
         data-key={item.key} {...clickable}>
      <FoodIcon group={groupFor(item)} />
      <span className="food-card-name">{item.name}</span>
      <ScoreRing score={item.score} band={item.band} size={variant === "spotlight" ? 48 : 36} />
      <span className="food-card-meta">
        <RiskBadge band={item.band} />
        {trend && (
          <span className="trend" title={trend.text}>
            <span aria-hidden="true">{trend.arrow}</span> <span className="trend-text">{trend.text}</span>
          </span>
        )}
      </span>
      {prices && <span className="food-card-spark"><Sparkline prices={prices} money={money} width={140} height={36} /></span>}
      {reason && <span className="food-card-reason">{reason}</span>}
    </Tag>
  );
}

// Grey placeholder shaped like a card, shown while data loads, so the page doesn't jump.
export function FoodCardSkeleton() {
  return (
    <div className="food-card grid skeleton" aria-hidden="true">
      <span className="skeleton-line short" />
      <span className="skeleton-line" />
    </div>
  );
}
