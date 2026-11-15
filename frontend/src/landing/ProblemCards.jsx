import Icon from "./icons";

// "The problem": three cards, each an icon, a short bold headline and one sentence.
// No numbers we can't back up: the old "costs thousands a year" had no source,
// so it now says what we can stand behind.
const PROBLEMS = [
  ["clock", "Small buyers find out too late",
   "By the time a shortage is in the news, big buyers have already stocked up and prices have jumped."],
  ["scale", "Big companies have tools. Small ones have nothing.",
   "Supply-risk software is built and priced for big companies. Food banks and corner stores are left out."],
  ["basket", "Food banks can't afford empty shelves",
   "When a staple runs out, families who depend on it go without."],
];

export default function ProblemCards() {
  return (
    <section className="landing-section" aria-labelledby="problem-title">
      <h2 id="problem-title">The problem</h2>
      <div className="card-row">
        {PROBLEMS.map(([icon, title, text]) => (
          <div key={title} className="landing-card surface lift">
            <span className="card-icon"><Icon name={icon} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
