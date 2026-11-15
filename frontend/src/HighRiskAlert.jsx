// Only speaks up when it matters: if any food is at HIGH risk, it's named here.
// When nothing is at high risk, this shows nothing at all (no "0 High risk" box).
export default function HighRiskAlert({ items, onSelect }) {
  const high = items.filter((item) => item.band === "red").sort((a, b) => b.score - a.score);
  if (high.length === 0) return null;

  return (
    <div className="high-alert" role="alert">
      <strong><span aria-hidden="true">▲</span> High shortage risk:</strong>{" "}
      {high.map((item, i) => (
        <span key={item.key}>
          {i > 0 && ", "}
          {/* Each food name is a button: one click opens its details. */}
          <button className="link-button" onClick={() => onSelect(item.key)}>
            {item.name} ({item.score}/100)
          </button>
        </span>
      ))}
    </div>
  );
}
