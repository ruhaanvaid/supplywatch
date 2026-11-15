// "What SupplyWatch is and isn't": two columns of plain statements, divided by a rule.
// Same honest content as before. Plain lists, no icons: the headings already say it.
const IS = [
  "An early warning aid that points you at foods worth a closer look.",
  "Free, and open about its sources: every number links back to where it came from.",
  "Plain arithmetic for the score, with reasoned weights you can read.",
];
const ISNT = [
  "A forecast. It can't tell you when or whether a shortage will happen.",
  "Fitted to past data. The weights are judgment calls, written down in the code.",
  "Run by AI. The AI only rates news headlines and writes the explanations. It never sets the score.",
];

export default function IsIsnt() {
  return (
    <section className="section" aria-labelledby="isisnt-title">
      <h2 id="isisnt-title">What SupplyWatch is and isn't</h2>
      <div className="isisnt">
        <div>
          <h3>It is</h3>
          <ul>{IS.map((text) => <li key={text}>{text}</li>)}</ul>
        </div>
        <div>
          <h3>It isn't</h3>
          <ul>{ISNT.map((text) => <li key={text}>{text}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
