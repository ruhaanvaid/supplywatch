import { levelFor } from "./riskLevels";

// The score as a small circular gauge: the ring fills up to the score (0-100)
// in the risk level's color, with the number in the middle.
// The ring is decoration; the number and the risk pill next to it carry the meaning.
const RADIUS = 15;
const CIRCLE = 2 * Math.PI * RADIUS;   // the ring's full length

export default function ScoreRing({ score, band, size = 40 }) {
  const filled = score == null ? 0 : (score / 100) * CIRCLE;
  return (
    <span className={`score-ring ${levelFor(band).className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
        <circle cx="18" cy="18" r={RADIUS} className="ring-track" />
        {/* Start at 12 o'clock (rotate -90°) and draw `filled` of the ring's length. */}
        {filled > 0 && (   // a score of 0 draws no fill (a 0-length round line would still show a dot)
          <circle cx="18" cy="18" r={RADIUS} className="ring-fill" transform="rotate(-90 18 18)"
                  strokeDasharray={`${filled} ${CIRCLE}`} />
        )}
      </svg>
      <span className="score-ring-number num">
        {score ?? "–"}<span className="visually-hidden"> out of 100</span>
      </span>
    </span>
  );
}
