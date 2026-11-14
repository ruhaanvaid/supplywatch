import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Monthly price line. Recharts draws it; we only say which field goes on which axis.
export default function PriceChart({ data }) {
  if (data.length === 0) return <p>No price history available.</p>;
  const dollars = (value) => `$${value.toFixed(2)}`;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis domain={["auto", "auto"]} tickFormatter={dollars} />
        <Tooltip formatter={dollars} />
        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
