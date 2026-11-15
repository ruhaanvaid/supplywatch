import PriceLine from "./PriceLine";
import ReplayChart from "./ReplayChart";

// The replay test, inside the dashboard's Replay section: the egg price chart with the
// same two notes as the landing hero, both lead times at the same size (showing only
// the flattering one would oversell the tool), and the egg score month by month.
export default function ReplayPanel({ result, prices }) {
  const target = result.target_item;
  const scores = result.timeline.map((row) => ({ month: row.month, price: row.scores[target] }))
                               .filter((row) => row.price !== null);
  const months = (n) => (n === null ? "Never" : `${n} month${n === 1 ? "" : "s"}`);

  return (
    <div className="replay">
      <div className="lead-times">
        <div className="lead risk-medium">
          <span className="lead-number num">{months(result.lead_time_months_yellow)}</span>
          <span>early: first <span className="risk-shape" aria-hidden="true">◆</span> <strong>Medium</strong> ({result.first_yellow ?? "never"})</span>
        </div>
        <div className="lead risk-high">
          <span className="lead-number num">{months(result.lead_time_months_red)}</span>
          <span>early: first <span className="risk-shape" aria-hidden="true">▲</span> <strong>High</strong> ({result.first_red ?? "never"})</span>
        </div>
      </div>

      <h4>Egg prices, with what SupplyWatch would have shown</h4>
      <ReplayChart replay={{ ...result, reported: result.shortage_reported.date.slice(0, 7) }} prices={prices} />

      <h4>The egg risk score, month by month (0-100)</h4>
      <PriceLine data={scores} money={false} height={200}
                 guides={[{ value: 34, label: "Medium starts at 34" }, { value: 67, label: "High starts at 67" }]}
                 label={`Egg risk score from ${scores[0]?.price} to ${scores[scores.length - 1]?.price}`} />

      <p>
        The shortage hit the news on {result.shortage_reported.date}: {result.shortage_reported.what}{" "}
        (<a href={result.shortage_reported.source} target="_blank" rel="noreferrer">source</a>).
        False alarms (another food reaching High):{" "}
        {result.false_alarms.length === 0 ? "none" : result.false_alarms.map((f) => `${f.item} (${f.first_red})`).join(", ")}.
      </p>
      <p className="small">{result.data_note}</p>
    </div>
  );
}
