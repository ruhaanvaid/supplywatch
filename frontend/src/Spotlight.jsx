import { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
import { getJson } from "./api";

// "Closest to unusual": the 4 highest scores right now, even when all are Low,
// so there is always something worth a look. Each card gets a sparkline and a
// one-line reason, both from that food's real details (4 small requests).
const HOW_MANY = 4;

// What added the most points to the score, in plain words.
const REASONS = {
  price_spike: "Price above its usual level",
  news_severity: "Supply news in the last 30 days",
  weather_stress: "Drought where it's grown",
  port_delay: "Shipping strain",
};

function reasonFor(detail) {
  if (!detail) return "Loading…";
  const [name, points] = Object.entries(detail.points ?? {})
    .filter(([, value]) => value != null)
    .sort((a, b) => b[1] - a[1])[0] ?? [];
  return points > 0 ? `${REASONS[name]} (+${points} points)` : "No warning signs right now";
}

export default function Spotlight({ items, onSelect, selectedKey }) {
  const top = items.filter((item) => item.score != null).sort((a, b) => b.score - a.score).slice(0, HOW_MANY);
  const [details, setDetails] = useState({});      // key -> detail (price history + points)
  const keys = top.map((item) => item.key).join(",");

  useEffect(() => {
    if (!keys) return;
    // Ask for the 4 foods at once; a failure just leaves that card without a sparkline.
    keys.split(",").forEach((key) =>
      getJson(`/api/items/${key}`).then((d) => setDetails((old) => ({ ...old, [key]: d }))).catch(() => {}));
  }, [keys]);

  if (top.length === 0) return null;
  const allLow = top.every((item) => item.band === "green");
  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <h2 id="spotlight-title">Closest to unusual</h2>
      <p className="section-caption">
        The {top.length} highest scores right now, highest first.
        {allLow && " All of them are still Low."}
      </p>
      <div className="spotlight-row">
        {top.map((item) => (
          <FoodCard key={item.key} item={item} variant="spotlight" onSelect={onSelect}
                    selected={item.key === selectedKey}
                    prices={details[item.key]?.price_history} money={!details[item.key]?.price_label}
                    reason={reasonFor(details[item.key])} />
        ))}
      </div>
    </section>
  );
}
