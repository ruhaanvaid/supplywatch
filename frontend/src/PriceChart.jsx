import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// "+17.6%" / "-12.0%"
export const percent = (change) => `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;

// Monthly price line. Recharts draws it; we only say which field goes on which axis.
// Optional: `moves` (major price moves) are drawn as big dots with an arrow and a label.
// Clicking (or Enter on) a marker calls onPick(month); the `activeMonth` marker gets a ring.
export default function PriceChart({ data, height = 220, money = true, moves = [], activeMonth, onPick }) {
  if (data.length === 0) return <p>No price history available.</p>;
  // Dollars for real prices; plain numbers for a price index (never label an index as $).
  const dollars = (value) => (money ? `$${value.toFixed(2)}` : value.toFixed(1));
  const moveFor = Object.fromEntries(moves.map((move) => [move.month, move]));

  // The y-axis is zoomed in to the prices (it does NOT start at 0), and we say so below.
  const prices = data.map((point) => point.price);
  const low = Math.min(...prices) * 0.9, high = Math.max(...prices) * 1.1;

  function Dot({ cx, cy, payload, index }) {
    const move = moveFor[payload.month];
    if (!move) return <circle key={index} cx={cx} cy={cy} r={3} fill="#ffffff" stroke="#0e5e50" strokeWidth={2} />;
    const up = move.change > 0;
    const color = up ? "var(--high-bar)" : "var(--low-bar)";
    const pick = () => onPick?.(move.month);
    return (
      <g key={index} className="move-marker" role="button" tabIndex={0} aria-pressed={activeMonth === move.month}
         aria-label={`${move.month_name}: price ${up ? "up" : "down"} ${percent(move.change)}. Show explanation.`}
         onClick={pick} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick())}>
        <circle cx={cx} cy={cy} r={14} fill="transparent" />{/* invisible, bigger target: easy to click or tap */}
        {activeMonth === move.month && <circle cx={cx} cy={cy} r={12} fill="none" stroke="var(--accent)" strokeWidth={3} />}
        <circle cx={cx} cy={cy} r={7} fill={color} stroke="#ffffff" strokeWidth={2} />
        {/* Label beside the dot, on the side away from the line (and inside the chart near the edges). */}
        <text x={index < 2 ? cx + 11 : cx - 11} y={up ? cy - 6 : cy + 16} textAnchor={index < 2 ? "start" : "end"}
              fontSize={12} fontWeight={700}
              fill={up ? "var(--high-text)" : "var(--low-text)"}>
          {up ? "▲" : "▼"} {percent(move.change)}
        </text>
      </g>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[low, high]} tickFormatter={dollars} width={56} />
          <Tooltip formatter={(value) => [dollars(value), "Price"]} />
          <Line type="monotone" dataKey="price" stroke="#0e5e50" /* the teal accent */ strokeWidth={2}
                dot={Dot} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="small chart-note">
        Note: the {money ? "price" : "index"} axis starts at {dollars(low)}, not {money ? "$0" : "0"}, so changes look bigger than they are.
      </p>
    </>
  );
}
