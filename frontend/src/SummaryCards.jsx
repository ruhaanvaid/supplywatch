import { RISK_LEVELS } from "./riskLevels";

// Three big counts at the top: how many foods are High / Medium / Low right now.
// Clicking one shows only those foods; clicking the active one again shows all.
export default function SummaryCards({ items, risk, onPick }) {
  const levels = [RISK_LEVELS.red, RISK_LEVELS.yellow, RISK_LEVELS.green];
  return (
    <div className="summary-cards" role="group" aria-label="Foods at each risk level">
      {levels.map((level) => {
        const count = items.filter((item) => RISK_LEVELS[item.band]?.id === level.id).length;
        const active = risk === level.id;
        return (
          <button key={level.id} type="button" aria-pressed={active}
                  className={`summary-card ${level.className}${active ? " active" : ""}`}
                  onClick={() => onPick(active ? "all" : level.id)}>
            <span className="summary-count">{count}</span>
            <span className="summary-label"><span aria-hidden="true">{level.shape}</span> {level.label} risk</span>
          </button>
        );
      })}
    </div>
  );
}
