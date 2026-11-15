import HowScored from "./HowScored";
import PriceLine from "./PriceLine";
import RiskBadge from "./RiskBadge";

// "Closest to unusual": the 3 highest scores right now, shown larger, ALWAYS, even
// when all are Low (then it says so). Each has its price line and how the score
// was reached: the points each signal added, biggest first.
const HOW_MANY = 3;

export default function Spotlight({ items, onSelect, selectedKey }) {
  const top = items.filter((item) => item.score != null).sort((a, b) => b.score - a.score).slice(0, HOW_MANY);
  if (top.length === 0) return null;

  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <h2 id="spotlight-title">Closest to unusual</h2>
      <p className="caption">The {HOW_MANY} highest scores right now.{top.every((i) => i.band === "green") && " All are still Low."}</p>
      <div className="spotlight-row">
        {top.map((item) => (
          <button key={item.key} type="button" data-key={item.key} aria-pressed={item.key === selectedKey}
                  className={`spot ${item.key === selectedKey ? "selected" : ""}`} onClick={() => onSelect(item.key)}>
            <span className="spot-head">
              <span className="spot-name">{item.name}</span>
              <span className="spot-score num">{item.score}<span className="out-of">/100</span></span>
            </span>
            <RiskBadge band={item.band} />
            <PriceLine data={item.recent_prices} compact money={!item.price_label} height={56} />
            <span className="spot-reason"><HowScored score={item.score} points={item.points} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}
