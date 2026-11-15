import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FoodCard from "../FoodCard";

// The top of the landing page: headline, subtext, two buttons, and a small copy of
// the real dashboard. The cards ARE the dashboard's FoodCard component, fed the demo
// scenario's 3 highest-scoring foods, so the preview can never drift from the real UI.
// It's clearly labeled as an example with made-up numbers.
export default function Hero() {
  const [foods, setFoods] = useState([]);
  const [prices, setPrices] = useState({});   // key -> price history, for the sparklines

  useEffect(() => {
    fetch("/api/items?demo=1").then((r) => (r.ok ? r.json() : [])).catch(() => [])
      .then((items) => {
        const top = items.filter((i) => i.score !== null).sort((a, b) => b.score - a.score).slice(0, 3);
        setFoods(top);
        top.forEach((food) => fetch(`/api/items/${food.key}?demo=1`).then((r) => r.json())
          .then((detail) => setPrices((old) => ({ ...old, [food.key]: detail.price_history }))).catch(() => {}));
      });
  }, []);

  return (
    <section className="hero">
      <div className="hero-text">
        <h1>Know about food shortages <em>before the shelves go empty.</em></h1>
        <p className="hero-sub">Free early warning for food banks and small food businesses.
          SupplyWatch watches public data and flags foods that are starting to look risky.</p>
        <div className="hero-buttons">
          <Link to="/signup" className="btn btn-filled btn-large">Sign up free</Link>
          <Link to="/app?demo=1" className="btn btn-outline btn-large">Try the demo</Link>
        </div>
        <p className="small">The demo needs no account.</p>
      </div>

      <figure className="hero-preview surface">
        <div className="preview-head">
          <span className="preview-title">What you'll see</span>
          <span className="sample-tag">EXAMPLE · SAMPLE DATA</span>
        </div>
        <p className="preview-intro">
          Every food gets a <strong>shortage-risk score</strong>: 0 means supply looks normal,
          100 means a serious risk it will run short.
        </p>
        <div className="preview-cards">
          {foods.length === 0 && <p className="small">Loading the example…</p>}
          {foods.map((food) => <FoodCard key={food.key} item={food} variant="preview" prices={prices[food.key]} />)}
        </div>
        <figcaption className="preview-key">
          <strong>High</strong>: act now and line up other suppliers. <strong>Medium</strong>: keep an eye on it
          and consider stocking up. <strong>Low</strong>: nothing to do. These are made-up demo numbers, not
          today's real data.
        </figcaption>
      </figure>
    </section>
  );
}
