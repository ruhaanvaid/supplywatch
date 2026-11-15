// "What it watches": the four real signals as a printed-style ledger (a real <table>,
// so screen readers read it row by row with column headers). Each row names the
// actual source and, honestly, what that signal can't see. The weights are the real
// ones from backend/risk.py.
const SIGNALS = [
  ["Prices", "35%", "U.S. Bureau of Labor Statistics, monthly national averages",
   "Is this month's price above its usual level?", "Regional spikes; it's one national number a month."],
  ["News", "30%", "GDELT news search, last 30 days, rated by an AI",
   "Are there serious stories about this food's supply?", "Stories that never make the news."],
  ["Drought", "15%", "U.S. Drought Monitor, the main U.S. growing area",
   "Is the place it's grown in drought?", "Floods, heat waves, and foods grown abroad."],
  ["Shipping", "20%", "New York Fed Global Supply Chain Pressure Index",
   "Is global shipping under strain? (only for mostly imported foods)", "Problems at one port or one company."],
];

export default function WhatItWatches() {
  return (
    <section className="section" aria-labelledby="watch-title">
      <h2 id="watch-title">What it watches</h2>
      <table className="ledger-table">
        <thead>
          <tr><th scope="col">Signal</th><th scope="col">Share of score</th><th scope="col">Source</th>
              <th scope="col">The question it answers</th><th scope="col">What it misses</th></tr>
        </thead>
        <tbody>
          {SIGNALS.map(([name, weight, source, question, misses]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className="num" data-label="Share of score">{weight}</td>
              <td data-label="Source">{source}</td>
              <td data-label="Answers">{question}</td>
              <td data-label="Misses">{misses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
