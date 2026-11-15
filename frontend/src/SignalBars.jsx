// "Why this score": one bar per signal showing its 0-1 value and its weight,
// so anyone can see which signals pushed the score up.
const LABELS = {
  price_spike: "Price spike",
  news_severity: "News",
  port_delay: "Port delays",
  weather_stress: "Weather (drought)",
};

export default function SignalBars({ signals, weights }) {
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
              <span className="signal-value">{missing ? "unavailable" : signal.value.toFixed(2)}</span>
            </div>
            {/* Missing data gets a dashed empty bar and the word "unavailable", never a fake 0. */}
            <div
              className={`signal-track${missing ? " missing" : ""}`}
              role="img"
              aria-label={missing ? `${name}: unavailable, left out of the score`
                                  : `${name}: ${signal.value.toFixed(2)} out of 1`}
            >
              {!missing && <span className="signal-fill" style={{ width: `${signal.value * 100}%` }} />}
            </div>
            <p className="signal-note">{missing ? "Left out of the score. " : ""}{signal.note}</p>
          </li>
        );
      })}
    </ul>
  );
}
