// "Why this score": one row per signal. The number on the right is how many of
// the 0-100 points it adds; the bar shows how close it is to its maximum.
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
              <span className="signal-weight">up to {Math.round(weights[key] * 100)}% of the score</span>
              <span className="signal-value">{missing ? "left out" : `+${points[key]} ${points[key] === 1 ? "point" : "points"}`}</span>
            </div>
            {/* Missing data gets a dashed empty bar and the word "unavailable", never a fake 0. */}
            <div
              className={`signal-track${missing ? " missing" : ""}`}
              role="img"
              aria-label={missing ? `${name}: left out of the score`
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
