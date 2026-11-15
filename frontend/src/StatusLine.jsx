import { RISK_LEVELS } from "./riskLevels";

// The first thing you read: ONE sentence built from the real scores, and the
// High / Medium / Low counts as quiet filters (click one to show only those foods).

// Turns the foods into {lead, foods}. Nothing is made up:
// "attention" = every food whose score is Medium or High right now, highest first.
export function summarize(items) {
  const scored = items.filter((item) => item.score != null);
  const attention = items.filter((item) => item.band === "red" || item.band === "yellow")
                         .sort((a, b) => b.score - a.score);
  if (attention.length === 0) return { lead: `All ${scored.length} scored foods look normal today.`, foods: [] };
  return { lead: `${attention.length === 1 ? "1 food needs" : `${attention.length} foods need`} attention:`, foods: attention };
}

const COUNTS = [RISK_LEVELS.red, RISK_LEVELS.yellow, RISK_LEVELS.green];

export default function StatusLine({ items, risk, onPickRisk, onSelectFood }) {
  const { lead, foods } = summarize(items);
  const unscored = items.filter((item) => item.score == null).length;
  return (
    <section className="status-line" aria-label="Today's summary">
      {/* aria-live: screen readers announce the sentence when it changes. */}
      <p className="status-sentence" aria-live="polite">
        {lead}{" "}
        {foods.map((item, i) => (
          <span key={item.key}>
            {i > 0 && ", "}
            {/* Each name opens that food's details. */}
            <button type="button" className={`inline-food ${RISK_LEVELS[item.band].className}`} onClick={() => onSelectFood(item.key)}>
              {item.name}
            </button>
          </span>
        ))}
        {foods.length > 0 && "."}
        {unscored > 0 && <span className="status-note"> {unscored} {unscored === 1 ? "food has" : "foods have"} too little data for a score.</span>}
      </p>
      <div className="count-filters" role="group" aria-label="Show only one risk level">
        {COUNTS.map((level) => {
          const count = items.filter((item) => RISK_LEVELS[item.band]?.id === level.id).length;
          const active = risk === level.id;
          return (
            <button key={level.id} type="button" aria-pressed={active} className={`count-filter ${level.className}${active ? " active" : ""}`}
                    onClick={() => onPickRisk(active ? "all" : level.id)}>
              <span className="risk-shape" aria-hidden="true">{level.shape}</span> {level.label}{" "}
              <span className="num count">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
