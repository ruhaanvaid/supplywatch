import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Monthly price line. Recharts draws it; we only say which field goes on which axis.
export default function PriceChart({ data, height = 220, money = true }) {
  if (data.length === 0) return <p>No price history available.</p>;
  // Dollars for real prices; plain numbers for a price index (never label an index as $).
  const dollars = (value) => (money ? `$${value.toFixed(2)}` : value.toFixed(1));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis domain={["auto", "auto"]} tickFormatter={dollars} />
        <Tooltip formatter={dollars} />
        <Line type="monotone" dataKey="price" stroke="#0e5e50"  /* the teal accent */ strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
