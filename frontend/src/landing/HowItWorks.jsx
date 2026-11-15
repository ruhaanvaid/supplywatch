import Icon from "./icons";

// Four steps as a horizontal flow: numbered circles joined by a thin line
// (drawn in CSS with ::before on the list), stacked top-to-bottom on phones.
// An ordered list (<ol>), so screen readers announce "1 of 4", "2 of 4"...
const STEPS = [
  ["eye", "Watch public data", "Prices, news, drought maps and shipping strain, from free government and public sources."],
  ["chart", "Score the risk", "Each food gets a 0–100 score: Low, Medium or High. Plain arithmetic, no AI."],
  ["speech", "Explain why", "A short plain-English summary of what pushed the score up, with links to the sources."],
  ["check", "Suggest what to do", "Real alternate suppliers and substitute foods for anything that looks risky."],
];

export default function HowItWorks() {
  return (
    <section id="how" className="landing-section" aria-labelledby="how-title">
      <h2 id="how-title">How it works</h2>
      <ol className="flow">
        {STEPS.map(([icon, title, text], i) => (
          <li key={title} className="flow-step">
            <span className="flow-number num" aria-hidden="true">{i + 1}</span>
            <span className="flow-icon"><Icon name={icon} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
