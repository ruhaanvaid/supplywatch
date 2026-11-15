import { levelFor } from "./riskLevels";

// The risk label used everywhere: a shape + a word. Only the SHAPE carries the risk
// color (amber is too light for small text), the word stays in Ink, except High,
// whose red is dark enough to read. Never color alone, so it works without color vision.
export default function RiskBadge({ band }) {
  const level = levelFor(band);
  return (
    <span className={`risk-badge ${level.className}`}>
      <span className="risk-shape" aria-hidden="true">{level.shape}</span> {level.label}
    </span>
  );
}
