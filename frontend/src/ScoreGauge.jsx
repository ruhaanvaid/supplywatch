import RiskBadge from "./RiskBadge";

// A 0-100 bar split into the three zones (Low 0-33, Medium 34-66, High 67-100),
// with a marker at the score: you see the number AND where it falls.
export default function ScoreGauge({ score, band }) {
  const label = score === null ? "No score: not enough data" : `Score ${score} out of 100`;
  return (
    <div className="gauge">
      <div className="gauge-top">
        <span className="gauge-score">
          {score ?? "–"}<span className="gauge-outof">/100</span>
        </span>
        <RiskBadge band={band} />
      </div>
      {/* role="img" + aria-label: screen readers hear one sentence, not a pile of colored boxes */}
      <div className="gauge-track" role="img" aria-label={label}>
        <span className="gauge-zone zone-low" />
        <span className="gauge-zone zone-medium" />
        <span className="gauge-zone zone-high" />
        {score !== null && <span className="gauge-marker" style={{ left: `${score}%` }} />}
      </div>
      <div className="gauge-labels" aria-hidden="true">
        <span>Low</span><span>Medium</span><span>High</span>
      </div>
    </div>
  );
}
