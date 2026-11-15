// "How this works and its limitations": the honest small print, always visible.
export default function Footer({ status }) {
  return (
    <footer className="footer">
      <h2>How this works and its limitations</h2>
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
          Drought is checked only for 8 staple foods with a known growing region.
        </li>
        <li>Suppliers are real organizations with no connection to SupplyWatch.</li>
      </ul>
      {status && <p className="small">{status.label} · AI text: {status.llm}</p>}
    </footer>
  );
}
