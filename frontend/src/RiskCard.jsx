import RiskBadge from "./RiskBadge";
import { levelFor } from "./riskLevels";

// The arrow compares the latest price with its 6-month average (sent by the
// backend) — the same comparison the score's price signal uses.
const TRENDS = {
  up: { arrow: "↑", text: "Price above normal" },
  down: { arrow: "↓", text: "Price below normal" },
  steady: { arrow: "→", text: "Price normal" },
};

// One food. It's a real <button>, so it works with the keyboard (Tab + Enter)
// and screen readers announce it as clickable.
export default function RiskCard({ item, selected, onSelect }) {
  const trend = TRENDS[item.price_trend];
  return (
    <button
      className={`risk-card ${levelFor(item.band).className}${selected ? " selected" : ""}`}
      onClick={() => onSelect(item.key)}
      aria-pressed={selected}
      data-key={item.key}
    >
      <span className="risk-card-name">
        <span aria-hidden="true">{item.emoji}</span> {item.name}
      </span>
      <span className="risk-card-score">
        {item.score ?? "–"}
        <span className="risk-card-outof">/100</span>
      </span>
      <span className="risk-card-footer">
        <RiskBadge band={item.band} />
        {trend && <span className="trend">{trend.arrow} {trend.text}</span>}
      </span>
    </button>
  );
}

// Grey placeholder shown while data loads, shaped like a real card so the
// page doesn't jump around when the data arrives.
export function RiskCardSkeleton() {
  return (
    <div className="risk-card skeleton" aria-hidden="true">
      <span className="skeleton-line short" />
      <span className="skeleton-line tall" />
      <span className="skeleton-line" />
    </div>
  );
}
