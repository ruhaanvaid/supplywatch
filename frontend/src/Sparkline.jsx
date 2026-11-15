// A tiny price-trend line drawn with plain SVG (no chart library).
// prices: [{month, price}, ...] oldest first. We keep the last `months` of them,
// stretch them to fill the box (lowest price at the bottom, highest at the top),
// and put a dot on the latest month. The shape shows the trend, not exact values,
// so the label (read by screen readers, shown on hover) gives the real numbers.
// Optional `markers` (months, e.g. ["2022-03"]) get a dashed line and a numbered dot;
// the page explains each number in text next to the chart.
export default function Sparkline({ prices, months = 12, width = 120, height = 32, money = true, markers = [], stretch = true }) {
  const recent = (prices ?? []).slice(-months);
  if (recent.length < 2) return null;
  const values = recent.map((point) => point.price);
  const low = Math.min(...values), high = Math.max(...values);
  const span = high - low || 1;                       // a flat line would divide by 0
  const pad = markers.length ? 12 : 2;               // room so marker circles aren't cut off at the edges
  const x = (i) => pad + (i / (values.length - 1)) * (width - 2 * pad);
  const y = (v) => height - pad - ((v - low) / span) * (height - 2 * pad);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  const show = (v) => (money ? `$${v.toFixed(2)}` : v.toFixed(1));
  const label = `Price over the last ${values.length} months: ${show(values[0])} to ${show(values[last])}`;

  return (
    <svg className="sparkline" role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`}
         width={width} height={height} preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}>
      <title>{label}</title>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(values[last])} r="2.5" fill="currentColor" />
      {markers.map((month, n) => {
        const i = recent.findIndex((point) => point.month === month);
        return i < 0 ? null : (
          <g key={month} className="spark-marker">
            <line x1={x(i)} x2={x(i)} y1="0" y2={height} strokeDasharray="3 3" />
            <circle cx={x(i)} cy={y(values[i])} r="9" />
            <text x={x(i)} y={y(values[i]) + 4} textAnchor="middle">{n + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}
