import PriceLine from "./PriceLine";
import HowScored from "./HowScored";
import RiskBadge from "./RiskBadge";
import { levelFor } from "./riskLevels";

// One line of the ledger: name, score (tabular number + a thin bar), risk label
// (shape + word), price arrow, a small price line of the last 12 months, and
// underneath, how the score was reached (points per signal).
// It's a real <button>, so Tab + Enter open the food, and screen readers say "button".
const TRENDS = {
  up: { arrow: "↑", text: "Price above normal" },
  down: { arrow: "↓", text: "Price below normal" },
  steady: { arrow: "→", text: "Price normal" },
};

export default function FoodRow({ item, selected, onSelect }) {
  const trend = TRENDS[item.price_trend];
  return (
    <li>
      <button type="button" data-key={item.key} aria-pressed={selected} onClick={() => onSelect(item.key)}
              className={`food-row ${levelFor(item.band).className}${selected ? " selected" : ""}`}>
        <span className="row-name">{item.name}</span>
        <span className="row-score">
          <span className="num">{item.score ?? "–"}</span>
          {/* The thin bar is the score drawn to scale: 0 at the left, 100 at the right. */}
          <span className="score-bar" aria-hidden="true"><span style={{ width: `${item.score ?? 0}%` }} /></span>
        </span>
        <span className="row-risk"><RiskBadge band={item.band} /></span>
        <span className="row-trend" title={trend?.text}>
          {trend ? <><span aria-hidden="true">{trend.arrow}</span><span className="visually-hidden">{trend.text}</span></> : ""}
        </span>
        <span className="row-spark"><PriceLine data={item.recent_prices} compact money={!item.price_label} height={28} /></span>
        <span className="row-how"><HowScored score={item.score} points={item.points} /></span>
      </button>
    </li>
  );
}
