import { useEffect, useState } from "react";
import RiskBadge from "./RiskBadge";

// The example card in the landing page hero. It shows the demo scenario's top 3
// foods, fetched from the same backend the demo uses, and explains how to read
// them, because a first-time visitor doesn't know what "67/100" means.
export default function LandingPreview() {
  const [foods, setFoods] = useState([]);
  useEffect(() => {
    fetch("/api/items?demo=1").then((r) => (r.ok ? r.json() : [])).catch(() => [])
      .then((items) => setFoods(items.filter((i) => i.score !== null)
                                     .sort((a, b) => b.score - a.score).slice(0, 3)));
  }, []);

  return (
    <figure className="hero-preview">
      <div className="preview-head">
        <h2 className="preview-title">What you'll see</h2>
        <span className="sample-tag">EXAMPLE · SAMPLE DATA</span>
      </div>
      <p className="preview-intro">
        Every food gets a <strong>shortage-risk score</strong>: 0 means supply looks normal,
        100 means a serious risk it will run short.
      </p>

      <div className="preview-row preview-labels" aria-hidden="true">
        <span>Food</span><span>Risk score</span><span>Level</span>
      </div>
      {foods.length === 0 && <p className="small">Loading the example…</p>}
      {foods.map((food) => (
        <div key={food.name} className="preview-row">
          <span className="preview-name">{food.name}</span>
          <span className="preview-score">{food.score}<span className="small">/100</span></span>
          <RiskBadge band={food.band} />
        </div>
      ))}

      <figcaption className="preview-key">
        <strong>High</strong>: act now and line up other suppliers. <strong>Medium</strong>: keep an eye on it
        and consider stocking up. <strong>Low</strong>: nothing to do. These are made-up demo numbers, not
        today's real data.
      </figcaption>
    </figure>
  );
}
