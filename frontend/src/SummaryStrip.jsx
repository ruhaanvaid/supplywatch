import { RISK_LEVELS } from "./riskLevels";

// Three numbers at a glance: how many tracked foods are High, Medium and Low risk.
// Staff can see "nothing urgent" or "2 things need attention" before reading anything else.
const BANDS = ["red", "yellow", "green"];

export default function SummaryStrip({ items, loading }) {
  const count = (band) => items.filter((item) => item.band === band).length;
  const unscored = count("grey");

  return (
    <section className="summary" aria-label="How many foods are at each risk level">
      {BANDS.map((band) => {
        const level = RISK_LEVELS[band];
        return (
          <div key={band} className={`stat-card ${level.className}`}>
            <span className="stat-number">{loading ? "–" : count(band)}</span>
            <span className="stat-label">
              <span aria-hidden="true">{level.shape}</span> {level.label} risk
            </span>
          </div>
        );
      })}
      {/* Foods with too little data aren't hidden: we say how many there are. */}
      {!loading && unscored > 0 && (
        <p className="summary-note">
          {unscored} {unscored === 1 ? "food doesn't" : "foods don't"} have enough data to score.
        </p>
      )}
    </section>
  );
}
