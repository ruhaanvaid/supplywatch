import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// The replay test: the egg score month by month in 2022-23 (real data, no peeking at
// the future), compared with the date the shortage hit the news.
export default function ReplayPanel({ result }) {
  const target = result.target_item;
  const data = result.timeline.map((row) => {
    const others = Object.entries(row.scores)
      .filter(([item, score]) => item !== target && score !== null)
      .map(([, score]) => score);
    return { month: row.month, target: row.scores[target], otherMax: others.length ? Math.max(...others) : null };
  });
  const reportedMonth = result.shortage_reported.date.slice(0, 7);
  const months = (n) => (n === null ? "Never" : `${n} month${n === 1 ? "" : "s"}`);

  return (
    <div className="replay">
      {/* Both lead times at the same size: showing only the flattering one would oversell the tool. */}
      <div className="lead-times">
        <div className="lead risk-medium">
          <span className="lead-number">{months(result.lead_time_months_yellow)}</span>
          <span>early: first <strong>◆ Medium</strong> alert ({result.first_yellow ?? "never"})</span>
        </div>
        <div className="lead risk-high">
          <span className="lead-number">{months(result.lead_time_months_red)}</span>
          <span>early: first <strong>▲ High</strong> alert ({result.first_red ?? "never"})</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={67} stroke="#d92d20" strokeDasharray="4 4" label="High (67)" />
          <ReferenceLine y={34} stroke="#c77700" strokeDasharray="4 4" label="Medium (34)" />
          <ReferenceLine x={reportedMonth} stroke="#0e5e50" label="Shortage in the news" />
          <Line dataKey="target" name="Eggs score" stroke="#d92d20" strokeWidth={3} />
          <Line dataKey="otherMax" name="Highest other food" stroke="#4a5852" strokeDasharray="2 2" />
        </LineChart>
      </ResponsiveContainer>

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
