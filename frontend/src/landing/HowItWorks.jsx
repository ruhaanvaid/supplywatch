import Icon from "./icons";

// Four steps in one ruled strip. They really are a sequence (data -> score ->
// explain -> suggest), so they're numbered, as an ordered list (<ol>) that screen
// readers announce as "1 of 4". On phones the strip turns into stacked rows.
const STEPS = [
  ["eye", "Watch public data", "Monthly prices, news headlines, drought maps and shipping strain."],
  ["chart", "Score each food", "A 0–100 score from plain arithmetic: Low, Medium or High. No AI in the score."],
  ["speech", "Explain the score", "Two or three plain sentences on what pushed it up, with links to the sources."],
  ["check", "Suggest what to do", "Real alternate suppliers and substitute foods when something looks risky."],
];

export default function HowItWorks() {
  return (
    <section id="how" className="section" aria-labelledby="how-title">
      <h2 id="how-title">How it works</h2>
      <ol className="steps">
        {STEPS.map(([icon, title, text], i) => (
          <li key={title}>
            <span className="step-number num">{i + 1}</span>
            <Icon name={icon} size={20} />
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
