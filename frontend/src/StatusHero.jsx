import { RISK_LEVELS } from "./riskLevels";

// The first thing you read: ONE plain-English sentence built from the real scores,
// plus the High / Medium / Low counts as small pills (click one to filter the list).

// Turns the list of foods into {tone, lead, foods}. Nothing is made up:
// "attention" = every food whose score is Medium or High right now.
export function summarize(items) {
  const scored = items.filter((item) => item.score != null);
  const attention = items.filter((item) => item.band === "red" || item.band === "yellow")
                         .sort((a, b) => b.score - a.score);
  if (attention.length === 0) {
    return { tone: "calm", lead: `All ${scored.length} scored foods look normal today.`, foods: [] };
  }
  const tone = attention.some((item) => item.band === "red") ? "high" : "medium";
  const count = attention.length === 1 ? "1 food needs" : `${attention.length} foods need`;
  return { tone, lead: `${count} attention:`, foods: attention };
}

const TONE_ICON = { calm: "●", medium: "◆", high: "▲" };
const PILLS = [RISK_LEVELS.red, RISK_LEVELS.yellow, RISK_LEVELS.green];

export default function StatusHero({ items, risk, onPickRisk, onSelectFood }) {
  const { tone, lead, foods } = summarize(items);
  const unscored = items.length - items.filter((item) => item.score != null).length;
  return (
    <section className={`status-hero surface tone-${tone}`} aria-label="Today's summary">
      <div className="status-text">
        <span className="status-icon" aria-hidden="true">{TONE_ICON[tone]}</span>
        <div>
        {/* aria-live: screen readers announce the sentence when it changes. */}
        <p className="status-sentence" aria-live="polite">
          {lead}{" "}
          {foods.map((item, i) => (
            <span key={item.key}>
              {i > 0 && ", "}
              {/* Each name is a button: one click opens that food's details. */}
              <button type="button" className="inline-food" onClick={() => onSelectFood(item.key)}>{item.name}</button>
            </span>
          ))}
          {foods.length > 0 && "."}
        </p>
        <p className="status-caption">
          Medium means watch it and consider stocking up. High means act now.
          {unscored > 0 && ` ${unscored} food${unscored === 1 ? " has" : "s have"} too little data for a score.`}
        </p>
        </div>
      </div>

      <div className="risk-pills" role="group" aria-label="Show foods at one risk level">
        {PILLS.map((level) => {
          const count = items.filter((item) => RISK_LEVELS[item.band]?.id === level.id).length;
          const active = risk === level.id;
          return (
            <button key={level.id} type="button" aria-pressed={active}
                    className={`risk-pill ${level.className}${active ? " active" : ""}`}
                    onClick={() => onPickRisk(active ? "all" : level.id)}>
              <span aria-hidden="true">{level.shape}</span> {level.label} <span className="num pill-count">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
