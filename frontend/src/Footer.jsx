// "How this works and its limitations": the honest small print, one click away.
// <details> is a built-in HTML disclosure: keyboard and screen reader friendly with no JavaScript.
export default function Footer({ status }) {
  return (
    <footer className="footer surface">
      <details>
      <summary><h2>How this works and its limitations</h2></summary>
      <ul>
        <li>
          Each score (0–100) combines up to four signals: price jumps (U.S. Bureau of Labor Statistics),
          news severity (GDELT news, rated by an AI), drought (U.S. Drought Monitor) and shipping delays (New York Fed supply chain pressure index, for mostly imported foods).
          The weights are reasoned starting values, not fitted to data.
        </li>
        <li>
          The AI only rates headlines and writes the explanations. It never calculates the score, and it
          can misjudge a headline. Missing data is left out, never guessed; with too little data, a food gets no score.
        </li>
        <li>
          Prices are national averages, updated monthly. Data is only as fresh as the last refresh.
          Drought is checked in one main U.S. producing area per food, and not for foods grown abroad (bananas, coffee).
        </li>
        <li>Suppliers are real organizations with no connection to SupplyWatch.</li>
      </ul>
      </details>
      {status && <p className="small">{status.label} · AI text: {status.llm}</p>}
    </footer>
  );
}
