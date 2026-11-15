import { levelFor } from "./riskLevels";

// The risk label used everywhere: shape + word + color.
// Never color alone, so it still works for people who can't tell red from green.
export default function RiskBadge({ band }) {
  const level = levelFor(band);
  return (
    <span className={`risk-badge ${level.className}`}>
      <span aria-hidden="true">{level.shape}</span> {level.label}
    </span>
  );
}
