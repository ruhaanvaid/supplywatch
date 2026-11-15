import PriceChart from "./PriceChart";

const LABELS = {
  price_spike: "Price spike",
  news_severity: "News severity",
  port_delay: "Port delay",
  weather_stress: "Weather stress",
};

// Everything about one item: why it scored what it did, and what to do about it.
export default function DetailPanel({ detail }) {
  const { name, unit, score, band, weights, signals, headlines, explanation } = detail;
  return (
    <section className="detail">
      <h2>
        {name} <span className={`pill ${band}`}>{score ?? "–"} · {band}</span>
      </h2>
      <p className="explanation">{explanation.text}</p>
      <p className="small">Explanation source: {explanation.source}</p>

      <h3>Price per {unit}</h3>
      <PriceChart data={detail.price_history} />

      <h3>The four signals</h3>
      <table>
        <thead>
          <tr><th>Signal</th><th>Weight</th><th>Value (0–1)</th><th>How it was computed</th></tr>
        </thead>
        <tbody>
          {Object.entries(signals).map(([key, signal]) => (
            <tr key={key} className={signal.value === null ? "missing" : ""}>
              <td>{LABELS[key]}</td>
              <td>{weights[key]}</td>
              <td>{signal.value === null ? "not available (left out)" : signal.value.toFixed(2)}</td>
              <td>{signal.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Headlines used</h3>
      {headlines.length === 0 ? (
        <p>No relevant headlines in the last 30 days.</p>
      ) : (
        <ul>
          {headlines.map((h) => (
            <li key={h.headline}>
              {h.date}: {h.headline} <span className="small">(severity {h.severity}/5, {h.produced_by})</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Alternate suppliers</h3>
      <ul>
        {detail.suppliers.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> ({s.type}, {s.area}): {s.what}
          </li>
        ))}
      </ul>
      <p className="small">
        Real organizations, listed for convenience. SupplyWatch has no connection to them;
        check availability, prices and terms with them directly.
      </p>

      <h3>Substitute products</h3>
      <p>{detail.substitutes.join(", ")}</p>
    </section>
  );
}
