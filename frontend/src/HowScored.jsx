// "How we got this score": the points each signal added, biggest first. Shown on
// every card, so you can see how SupplyWatch reached a number without opening it.
// The points come from risk.py's points_by_signal (the same math as the score),
// so they add up to the score, give or take rounding.
const NAMES = {
  price_spike: "price above usual",
  news_severity: "supply news",
  port_delay: "shipping strain",
  weather_stress: "drought",
};

export default function HowScored({ score, points }) {
  if (score == null || !points) return <span className="how-scored">Not enough data to score yet.</span>;
  const entries = Object.entries(points);
  const used = entries.filter(([, p]) => p != null).sort((a, b) => b[1] - a[1]);
  const missing = entries.filter(([, p]) => p == null).map(([name]) => NAMES[name]);
  return (
    <span className="how-scored">
      <span className="how-label">How we got {score}:</span>{" "}
      {used.map(([name, p], i) => (
        <span key={name}>{i > 0 && " · "}{NAMES[name]} <span className="num">+{p}</span></span>
      ))}
      {missing.length > 0 && <span> · no data for {missing.join(", ")}</span>}
    </span>
  );
}
