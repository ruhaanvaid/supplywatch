import RiskCard, { RiskCardSkeleton } from "./RiskCard";

// The grid of food cards. While loading, it shows 4 grey placeholder cards.
export default function RiskGrid({ items, loading, selectedKey, onSelect }) {
  if (loading) {
    return (
      <div className="risk-grid" aria-busy="true" aria-label="Loading foods">
        {[1, 2, 3, 4].map((n) => <RiskCardSkeleton key={n} />)}
      </div>
    );
  }
  return (
    <div className="risk-grid">
      {items.map((item) => (
        <RiskCard key={item.key} item={item} selected={item.key === selectedKey} onSelect={onSelect} />
      ))}
    </div>
  );
}
