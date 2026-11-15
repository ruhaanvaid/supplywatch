import { useEffect, useState } from "react";
import PriceLine from "./PriceLine";
import RiskBadge from "./RiskBadge";
import { getJson } from "./api";

// "Closest to unusual": the 3 highest scores right now, shown larger, ALWAYS, even
// when all are Low (then it says so). Each has its price line and a one-line reason:
// whichever signal added the most points, from that food's real details.
const HOW_MANY = 3;
const REASONS = {
  price_spike: "Price above its usual level",
  news_severity: "Supply news in the last 30 days",
  weather_stress: "Drought where it's grown",
  port_delay: "Shipping strain",
};

function reasonFor(detail) {
  if (!detail) return "…";
  const [name, points] = Object.entries(detail.points ?? {}).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1])[0] ?? [];
  return points > 0 ? `${REASONS[name]}: +${points} points` : "No warning signs right now";
}

export default function Spotlight({ items, onSelect, selectedKey }) {
  const top = items.filter((item) => item.score != null).sort((a, b) => b.score - a.score).slice(0, HOW_MANY);
  const [details, setDetails] = useState({});   // key -> detail, for the reason line
  const keys = top.map((item) => item.key).join(",");
  useEffect(() => {
    keys && keys.split(",").forEach((key) =>
      getJson(`/api/items/${key}`).then((d) => setDetails((old) => ({ ...old, [key]: d }))).catch(() => {}));
  }, [keys]);
  if (top.length === 0) return null;

  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <h2 id="spotlight-title">Closest to unusual</h2>
      <p className="caption">The {HOW_MANY} highest scores right now.{top.every((i) => i.band === "green") && " All are still Low."}</p>
      <div className="spotlight-row">
        {top.map((item) => (
          <button key={item.key} type="button" data-key={item.key} aria-pressed={item.key === selectedKey}
                  className={`spot ${item.key === selectedKey ? "selected" : ""}`} onClick={() => onSelect(item.key)}>
            <span className="spot-head">
              <span className="spot-name">{item.name}</span>
              <span className="spot-score num">{item.score}<span className="out-of">/100</span></span>
            </span>
            <RiskBadge band={item.band} />
            <PriceLine data={item.recent_prices} compact money={!item.price_label} height={56} />
            <span className="spot-reason">{reasonFor(details[item.key])}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
