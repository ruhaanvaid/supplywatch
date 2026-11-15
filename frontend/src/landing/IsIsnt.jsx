import Icon from "./icons";

// "What SupplyWatch is and isn't": two honest columns. Same meaning as before,
// split into what it does (check icons) and what it doesn't claim (cross icons).
const IS = [
  "An early warning aid that points you at foods worth a closer look.",
  "Free, and open about its sources: every number links back to where it came from.",
];
const ISNT = [
  "A forecast. It can't tell you when or whether a shortage will happen.",
  "Fitted to past data. Scores use reasoned weights.",
  "Run by AI. The AI only rates news headlines and writes the explanations. It never sets the score.",
];

function Column({ title, items, icon }) {
  return (
    <div className={`isisnt-col surface ${icon}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((text) => <li key={text}><span className="isisnt-icon"><Icon name={icon} size={18} /></span>{text}</li>)}
      </ul>
    </div>
  );
}

export default function IsIsnt() {
  return (
    <section className="landing-section" aria-labelledby="isisnt-title">
      <h2 id="isisnt-title">What SupplyWatch is and isn't</h2>
      <div className="isisnt">
        <Column title="It is" items={IS} icon="check" />
        <Column title="It isn't" items={ISNT} icon="cross" />
      </div>
    </section>
  );
}
