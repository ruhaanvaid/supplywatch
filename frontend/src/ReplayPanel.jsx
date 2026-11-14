import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// The backtest: the target item's score month by month, before and after the
// shortage was reported, next to the highest score of any OTHER item (false-alarm check).
export default function ReplayPanel({ result }) {
  const target = result.target_item;
  const data = result.timeline.map((row) => {
    const others = Object.entries(row.scores)
      .filter(([item, score]) => item !== target && score !== null)
      .map(([, score]) => score);
    return { month: row.month, target: row.scores[target], otherMax: Math.max(...others) };
  });
  const reportedMonth = result.shortage_reported.date.slice(0, 7);
  const lead = (months) => (months === null ? "never reached" : `${months} month(s) before the report`);

  return (
    <section className="replay">
      <h2>Replay: {result.event}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={67} stroke="#dc2626" strokeDasharray="4 4" label="red line (67)" />
          <ReferenceLine y={34} stroke="#ca8a04" strokeDasharray="4 4" label="yellow line (34)" />
          <ReferenceLine x={reportedMonth} stroke="#111827" label="shortage reported" />
          <Line dataKey="target" name="Eggs score" stroke="#dc2626" strokeWidth={3} />
          <Line dataKey="otherMax" name="Highest other item" stroke="#6b7280" strokeDasharray="2 2" />
        </LineChart>
      </ResponsiveContainer>
      <ul>
        <li>
          Shortage reported: {result.shortage_reported.date}, {result.shortage_reported.what}{" "}
          (<a href={result.shortage_reported.source} target="_blank" rel="noreferrer">source</a>)
        </li>
        <li>First yellow: {result.first_yellow ?? "never"}, {lead(result.lead_time_months_yellow)}</li>
        <li>First red: {result.first_red ?? "never"}, {lead(result.lead_time_months_red)}</li>
        <li>
          False alarms (other items that turned red):{" "}
          {result.false_alarms.length === 0 ? "none" : result.false_alarms.map((f) => `${f.item} (${f.first_red})`).join(", ")}
        </li>
      </ul>
      <p className="small">{result.data_note}</p>
    </section>
  );
}
