// "Why this score": one row per signal, showing its weight (how much of the score it
// can be), its value (the bar: how close it is to its own maximum) and the points it adds.
// A missing source says "unavailable" with a dashed empty bar, never a fake 0.
const LABELS = {
  price_spike: "Price",
  news_severity: "News",
  port_delay: "Shipping & port delays",
  weather_stress: "Weather (drought)",
};

export default function SignalBars({ signals, weights, points }) {
  return (
    <ul className="signal-list">
      {Object.entries(signals).map(([key, signal]) => {
        const missing = signal.value === null;
        const name = LABELS[key];
        return (
          <li key={key} className="signal">
            <div className="signal-head">
              <span className="signal-name">{name}</span>
              <span className="signal-weight">weight {Math.round(weights[key] * 100)}%</span>
              <span className="signal-value num">
                {missing ? "unavailable" : `${Math.round(signal.value * 100)}% of max · +${points[key]} ${points[key] === 1 ? "pt" : "pts"}`}
              </span>
            </div>
            {/* Missing data gets a dashed empty bar and the word "unavailable", never a fake 0. */}
            <div
              className={`signal-track${missing ? " missing" : ""}`}
              role="img"
              aria-label={missing ? `${name}: unavailable, left out of the score`
                                  : `${name}: ${Math.round(signal.value * 100)}% of its maximum`}
            >
              {!missing && <span className="signal-fill" style={{ width: `${signal.value * 100}%` }} />}
            </div>
            <p className="signal-note">{signal.note}</p>
          </li>
        );
      })}
    </ul>
  );
}
