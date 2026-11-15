import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sparkline from "../Sparkline";

// The centerpiece: the replay of the 2022-23 egg shortage. EVERY number here comes
// from the backend, never typed in:
//   /api/backtest       -> lead time (10 months), first Medium month, the reported date
//   /api/past?demo=1    -> the real BLS egg price line for that period
// It also says, at the same size of honesty as before, that High only came the same month.
const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const longMonth = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function ProofSection() {
  const [replay, setReplay] = useState(null);
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    fetch("/api/backtest").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((result) => {
      setReplay(result);
      if (!result) return;
      // Find the real price chart for the replayed food that covers the warning and the report.
      fetch("/api/past?demo=1").then((r) => r.json()).then(({ events }) => {
        const reported = result.shortage_reported.date.slice(0, 7);
        const chart = events.flatMap((e) => e.price_charts).find((c) => c.key === result.target_item &&
          c.prices.some((p) => p.month === result.first_yellow) && c.prices.some((p) => p.month === reported));
        setPrices(chart?.prices ?? null);
      }).catch(() => {});
    });
  }, []);

  if (!replay) return null;   // no replay data = no claim on the page
  const reported = replay.shortage_reported.date.slice(0, 7);
  return (
    <section className="landing-section" aria-labelledby="proof-title">
      <div className="proof">
        <div className="proof-text">
          <p className="proof-label">Tested on a real shortage</p>
          <h2 id="proof-title" className="proof-big">
            <span className="num">{replay.lead_time_months_yellow} months</span>
            <span className="proof-line">early Medium warning on the {replay.event.replace(/ \(.*\)$/, "")}.</span>
          </h2>
          <p>Replaying the real data month by month, SupplyWatch would have shown eggs as Medium risk
            in {longMonth(replay.first_yellow)}. It only turned High in {longMonth(replay.first_red)}, the same
            month the shortage was reported. <strong>One event is a demonstration, not proof.</strong></p>
          <Link to="/app?demo=1" className="proof-link">See the replay in the demo (open Past years) →</Link>
        </div>
        {prices && (
          <figure className="proof-chart">
            <Sparkline prices={prices} months={prices.length} width={480} height={170} stretch={false}
                       markers={[replay.first_yellow, reported]} />
            <figcaption>
              <span><b className="marker-key">1</b> SupplyWatch first showed Medium ({monthName(replay.first_yellow)})</span>
              <span><b className="marker-key">2</b> Shortage reported ({monthName(reported)})</span>
              <span className="proof-source">Real U.S. average egg prices per dozen, {monthName(prices[0].month)}–{monthName(prices[prices.length - 1].month)} (U.S. Bureau of Labor Statistics)</span>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
