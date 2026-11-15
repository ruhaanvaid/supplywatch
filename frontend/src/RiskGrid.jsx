// The 8 colored tiles. Each tile shows the score AND the band in words,
// so the grid still makes sense to people who can't tell colors apart.
export default function RiskGrid({ items, selectedKey, onSelect }) {
  return (
    <div className="grid">
      {items.map((item) => (
        <button
          key={item.key}
          className={`tile ${item.band} ${item.key === selectedKey ? "selected" : ""}`}
          onClick={() => onSelect(item.key)}
        >
          <span className="tile-name"><span aria-hidden="true">{item.emoji}</span> {item.name}</span>
          <span className="tile-score">{item.score ?? "–"}</span>
          <span className="tile-band">{item.band === "grey" ? "not enough data" : item.band}</span>
        </button>
      ))}
    </div>
  );
}
