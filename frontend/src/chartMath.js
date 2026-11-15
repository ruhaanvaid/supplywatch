// Small helpers for PriceLine: turning prices into positions, and dates into words.
// Positions are PERCENTAGES (0-100) of the chart box, so the same numbers work for
// the SVG line and for the HTML labels laid on top of it, at any screen width.

// "2022-03" -> "Mar 2022" (short) or "March 2022" (long).
export const monthLabel = (ym, month = "short") =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month, year: "numeric" });

// $2.04 for prices; 104.3 for a price index (never label an index as dollars).
export const formatValue = (value, money = true) => (money ? `$${value.toFixed(2)}` : value.toFixed(1));

// Where each point goes. Left to right by month; bottom to top by price, with a
// little room above and below so the line never touches the edges. `headroom` adds
// empty space at the top (used when notes are written above the line).
export function layout(values, headroom = 0) {
  const low = Math.min(...values), high = Math.max(...values);
  const pad = (high - low || 1) * 0.12;
  const bottom = low - pad, top = high + pad + (high - low || 1) * headroom;
  return {
    low, high, bottom, top,
    x: (i) => (values.length < 2 ? 50 : (i / (values.length - 1)) * 100),
    y: (v) => 100 - ((v - bottom) / (top - bottom)) * 100,
  };
}

// 0.176 -> "+17.6%", -0.12 -> "-12.0%"
export const percent = (change) => `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;
