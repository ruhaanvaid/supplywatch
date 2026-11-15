import { useEffect, useState } from "react";
import PriceLine from "./PriceLine";
import { monthLabel } from "./chartMath";

// The 2022-23 egg replay, used twice: the landing hero and the dashboard's Replay section.
// Nothing here is typed in by hand:
//   /api/backtest     -> when SupplyWatch first showed Medium, when the shortage was reported, the lead time
//   /api/past?demo=1  -> the real U.S. average egg prices (BLS) around that time
// (?demo=1 only lets the public landing page read this public history without logging in.)
export function useEggReplay() {
  const [state, setState] = useState({ replay: null, prices: null });
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/backtest").then((r) => r.json()),
      fetch("/api/past?demo=1").then((r) => r.json()),
    ]).then(([replay, past]) => {
      const reported = replay.shortage_reported.date.slice(0, 7);
      // The real price chart for the replayed food that covers both dates.
      const chart = past.events.flatMap((e) => e.price_charts).find((c) => c.key === replay.target_item &&
        c.prices.some((p) => p.month === replay.first_yellow) && c.prices.some((p) => p.month === reported));
      if (alive) setState({ replay: { ...replay, reported }, prices: chart?.prices ?? null });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return state;
}

export default function ReplayChart({ replay, prices, height = 300 }) {
  if (!replay || !prices) return <p className="small">Loading the egg price chart…</p>;
  return (
    <PriceLine data={prices} height={height}
      notes={[
        { month: replay.first_yellow, label: `SupplyWatch first showed Medium risk: ${monthLabel(replay.first_yellow)}` },
        { month: replay.reported, label: `Shortage reported: ${monthLabel(replay.reported)}` },
      ]}
      caption={`Monthly U.S. average price of a dozen eggs, ${monthLabel(prices[0].month)} to ${monthLabel(prices[prices.length - 1].month)}. Source: U.S. Bureau of Labor Statistics.`} />
  );
}
